/**
 * AmSci catalog sync Worker.
 *
 * Pulls the catalog from NetSuite and writes it into D1 on a Cloudflare Cron
 * schedule (see sync-worker/wrangler.jsonc). This is the "integration service"
 * from CLAUDE.md §5 — a second Worker, separate from the storefront, that owns
 * NetSuite access. The storefront reads the same D1 (binding `DB`) at runtime.
 *
 * READ-ONLY against NetSuite (SuiteQL only). Reuses the shared sync core and D1
 * helpers so the CLI backfill and this Worker stay in lockstep.
 *
 * Triggers:
 *   - scheduled(): two crons (see wrangler.jsonc) — the hourly one (FULL_CRON)
 *       runs a full sync + prune; every other cron runs a cheap incremental.
 *   - fetch():  GET /health         → last sync status (public, read-only).
 *               POST /sync?token=…  → manual sync (token-guarded via SYNC_TOKEN).
 */
import type { RawEnv } from "../src/lib/netsuite/env";
import { NetSuiteClient } from "../src/lib/netsuite/client";
import { fetchFullCatalog, fetchTierPrices } from "../src/lib/catalog/sync-core";
import {
	upsertProducts,
	upsertTierPrices,
	pruneStale,
	pruneStaleTierPrices,
	countTierPrices,
	getSyncMeta,
	setSyncMeta,
} from "../src/lib/catalog/d1";

export interface SyncEnv {
	DB: D1Database;
	NS_ACCOUNT: string;
	NS_CONSUMER_KEY: string;
	NS_CONSUMER_SECRET: string;
	NS_TOKEN: string;
	NS_TOKEN_SECRET: string;
	/** Shared secret guarding the manual POST /sync endpoint. */
	SYNC_TOKEN?: string;
}

interface SyncResult {
	written: number;
	pruned: number;
	total: number;
	durationMs: number;
	mode: "full" | "incremental";
}

// Incremental lookback window (minutes). Generous so a missed 10-minute tick
// self-heals; re-upserting a few recent items is cheap and idempotent.
const INCREMENTAL_LOOKBACK_MIN = 90;

async function runSync(env: SyncEnv, incremental: boolean): Promise<SyncResult> {
	const startedAt = Date.now();
	const syncedAt = new Date().toISOString();
	const account = (env.NS_ACCOUNT ?? "").trim();
	const client = NetSuiteClient.fromEnv(env as unknown as RawEnv);

	// Incremental only pulls items changed in the last INCREMENTAL_LOOKBACK_MIN
	// minutes (NetSuite's own clock). The window is generous so a missed cron tick
	// self-heals on the next run; re-upserting a few recent items is idempotent and
	// cheap. Full syncs re-fetch everything (and prune) as the ultimate backstop.
	const records = await fetchFullCatalog(
		client,
		account,
		incremental ? { sinceMinutes: INCREMENTAL_LOOKBACK_MIN } : {},
	);
	const written = await upsertProducts(env.DB, records, syncedAt);

	// Per-tier prices for whatever this run touched. Fetched separately from the
	// item bodies because the price matrix is a different shape (one row per
	// item AND level) with its own table and its own pruning rule.
	const tierPrices = await fetchTierPrices(
		client,
		records.map((r) => r.internalId),
	);
	const pricesWritten = await upsertTierPrices(env.DB, tierPrices, syncedAt);

	// Only a FULL run may prune — an incremental run didn't fetch everything.
	// Pruning prices matters as much as pruning items: a negotiated level that
	// ENDS in NetSuite leaves a stale row that would otherwise keep quoting the
	// old discount forever.
	const pruned = incremental ? 0 : await pruneStale(env.DB, syncedAt);

	// Prices get a floor that products don't. NetSuite throttles under load
	// ("Script Execution Usage Limit Exceeded"), and a full run that fetched only
	// part of the matrix before being cut off would prune everything it never
	// looked at — silently reverting tiered customers to list price, which is the
	// exact bug this table exists to fix. A partial fetch is worth keeping stale
	// rows for; it is not worth deleting good ones. Under the floor, log loudly
	// and let the next hourly full run try again.
	let prunedPrices = 0;
	let priceNote = "";
	if (!incremental) {
		const existing = await countTierPrices(env.DB);
		if (existing === 0 || tierPrices.length >= existing * 0.5) {
			prunedPrices = await pruneStaleTierPrices(env.DB, syncedAt);
		} else {
			priceNote = ` PRICE PRUNE SKIPPED (fetched ${tierPrices.length} vs ${existing} existing)`;
			console.warn(
				`[sync] price prune skipped: fetched ${tierPrices.length} rows but ${existing} exist. ` +
					`Suspected partial NetSuite read — keeping stale rows rather than deleting good ones.`,
			);
		}
	}

	const totalRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM products").first<{ n: number }>();
	const total = totalRow?.n ?? written;
	const durationMs = Date.now() - startedAt;

	await setSyncMeta(env.DB, {
		lastRun: syncedAt,
		itemCount: total,
		status: "ok",
		message:
			`${incremental ? "incremental" : "full"}: wrote ${written}, pruned ${pruned}, ` +
			`prices ${pricesWritten}/${prunedPrices}${priceNote}`,
		durationMs,
	});

	return { written, pruned, total, durationMs, mode: incremental ? "incremental" : "full" };
}

async function recordFailure(env: SyncEnv, err: unknown): Promise<void> {
	try {
		await setSyncMeta(env.DB, {
			lastRun: new Date().toISOString(),
			itemCount: null,
			status: "error",
			message: String(err instanceof Error ? err.message : err).slice(0, 500),
			durationMs: null,
		});
	} catch {
		// best-effort; don't mask the original error
	}
}

/** The hourly cron that performs a FULL sync + prune; all others are incremental. */
const FULL_CRON = "0 * * * *";

export default {
	async scheduled(event: ScheduledController, env: SyncEnv, ctx: ExecutionContext): Promise<void> {
		// A full sync (re-fetch everything + prune removals) is the heavy,
		// governance-sensitive op, so only the hourly cron runs it; the frequent
		// cron runs a cheap incremental (changed items only). If both fire at :00,
		// they run independently and the full run supersedes.
		const incremental = event.cron !== FULL_CRON;
		ctx.waitUntil(
			runSync(env, incremental).catch(async (err) => {
				await recordFailure(env, err);
				throw err; // surface in Worker logs / observability
			}),
		);
	},

	async fetch(req: Request, env: SyncEnv): Promise<Response> {
		const url = new URL(req.url);

		if (url.pathname === "/health") {
			const meta = await getSyncMeta(env.DB).catch(() => null);
			return Response.json({ ok: true, meta });
		}

		if (url.pathname === "/sync") {
			const token = url.searchParams.get("token") ?? req.headers.get("x-sync-token") ?? "";
			if (!env.SYNC_TOKEN || token !== env.SYNC_TOKEN) {
				return new Response("forbidden", { status: 403 });
			}
			const incremental = url.searchParams.get("mode") === "incremental";
			try {
				const result = await runSync(env, incremental);
				return Response.json({ ok: true, ...result });
			} catch (err) {
				await recordFailure(env, err);
				return Response.json({ ok: false, error: String(err) }, { status: 500 });
			}
		}

		return new Response(
			"amsci-sync worker. GET /health for status; POST /sync?token=… to trigger a sync.",
			{ status: 200 },
		);
	},
};
