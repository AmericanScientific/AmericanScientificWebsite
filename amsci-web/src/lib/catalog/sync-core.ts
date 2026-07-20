/**
 * Catalog sync core — NetSuite → CatalogRecord[]. Runtime-agnostic.
 *
 * This is the shared engine used by BOTH:
 *  - the backfill CLI (`scripts/backfill-catalog.ts`, Node), and
 *  - the sync Worker (`sync-worker/`, Cloudflare Cron).
 *
 * It contains NO Node APIs (no fs/dotenv/process) — only the signed TBA client
 * (which uses Web Crypto + fetch, available in both runtimes). READ-ONLY against
 * NetSuite: SuiteQL selects only, never writes.
 *
 * Population is the canonical web filter (CLAUDE.md §3):
 *   item WHERE isonline='T' AND isinactive='F'
 */
import type { NetSuiteClient } from "../netsuite/client";
import { buildFileUrlMap, parseFileId } from "../netsuite/images";
import type { CatalogRecord } from "./types";

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => {
	if (v === null || v === undefined) return null;
	const s = String(v).trim();
	return s === "" ? null : s;
};

const PAGE = 1000;

export interface FetchCatalogOptions {
	/** Cap the number of items (sampling). Omit for the full catalog. */
	limit?: number;
	/**
	 * Incremental: only items modified within the last N minutes. Compared against
	 * NetSuite's own SYSDATE (account-local clock), so there's no timezone mismatch
	 * with a client-supplied UTC cursor and no fragile date-string parsing. A
	 * generous window (e.g. 90) is cheap and tolerates missed cron ticks. Omit for
	 * a full sync.
	 */
	sinceMinutes?: number;
	/** Optional progress callback (items fetched so far, total). */
	onProgress?: (fetched: number, total: number) => void;
}

function buildSelect(sinceMinutes?: number): string {
	// sinceMinutes is an internal numeric constant (never user input); floor + guard
	// so it interpolates as a bare number. SYSDATE - (N/1440) = N minutes ago.
	const since =
		typeof sinceMinutes === "number" && Number.isFinite(sinceMinutes) && sinceMinutes > 0
			? Math.floor(sinceMinutes)
			: null;
	const where =
		"WHERE i.isonline = 'T' AND i.isinactive = 'F'" +
		(since != null ? ` AND i.lastmodifieddate >= (SYSDATE - (${since} / 1440.0))` : "");
	return (
		"SELECT i.id AS id, i.itemid AS itemid, i.storedisplayname AS storedisplayname, " +
		"i.displayname AS displayname, " +
		"i.storedescription AS storedescription, i.storedisplayimage AS storedisplayimage, " +
		"i.custitemgalleryimage1 AS g1, i.custitemgalleryimage2 AS g2, i.custitemgalleryimage3 AS g3, " +
		"BUILTIN.DF(i.custitem_grades) AS grades, i.custitem_size AS size, " +
		"BUILTIN.DF(i.class) AS category, i.itemtype AS itemtype, " +
		"i.searchkeywords AS searchkeywords, i.lastmodifieddate AS lastmodifieddate " +
		`FROM item i ${where} ORDER BY i.id`
	);
}

async function fetchCatalogRows(client: NetSuiteClient, opts: FetchCatalogOptions): Promise<Row[]> {
	const select = buildSelect(opts.sinceMinutes);
	if (opts.limit) {
		const page = await client.suiteql<Row>(select, { limit: opts.limit, offset: 0 });
		return page.items;
	}
	const rows: Row[] = [];
	for (let offset = 0; ; offset += PAGE) {
		const page = await client.suiteql<Row>(select, { limit: PAGE, offset });
		rows.push(...page.items);
		opts.onProgress?.(rows.length, page.totalResults);
		if (!page.hasMore) break;
	}
	return rows;
}

/** Batch base prices (level 1, qty 1) for a set of item ids → Map<itemId, price>. */
async function fetchBasePrices(client: NetSuiteClient, itemIds: string[]): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	const chunk = 200;
	for (let i = 0; i < itemIds.length; i += chunk) {
		const ids = itemIds.slice(i, i + chunk);
		if (ids.length === 0) continue;
		const page = await client.suiteql<{ item: string | number; unitprice: string | number }>(
			`SELECT item AS item, unitprice AS unitprice FROM pricing ` +
				`WHERE pricelevel = 1 AND priceqty = 1 AND item IN (${ids.join(",")})`,
			{ limit: chunk },
		);
		for (const r of page.items) {
			const n = Number(r.unitprice);
			if (Number.isFinite(n)) map.set(String(r.item), n);
		}
	}
	return map;
}

/**
 * Fetch the full (or incremental/sample) catalog from NetSuite and return
 * assembled CatalogRecords with images and base prices resolved.
 */
export async function fetchFullCatalog(
	client: NetSuiteClient,
	account: string,
	opts: FetchCatalogOptions = {},
): Promise<CatalogRecord[]> {
	const rows = await fetchCatalogRows(client, opts);

	// Collect every file id we need — primary + parsed gallery — then resolve in batch.
	const fileIds = new Set<string>();
	for (const r of rows) {
		const primary = str(r.storedisplayimage);
		if (primary) fileIds.add(primary);
		for (const key of ["g1", "g2", "g3"] as const) {
			const id = parseFileId(str(r[key]));
			if (id) fileIds.add(id);
		}
	}
	const fileUrls = await buildFileUrlMap(client, fileIds, account);

	const priceMap = await fetchBasePrices(
		client,
		rows.map((r) => String(str(r.id))).filter(Boolean),
	);

	return rows.map((r): CatalogRecord => {
		const id = String(str(r.id));
		const primaryId = str(r.storedisplayimage);
		const image = primaryId ? fileUrls.get(primaryId) ?? null : null;
		const gallery = (["g1", "g2", "g3"] as const)
			.map((k) => parseFileId(str(r[k])))
			.map((fid) => (fid ? fileUrls.get(fid) : undefined))
			.filter((u): u is string => Boolean(u));
		const grades = (str(r.grades) ?? "")
			.split(",")
			.map((g) => g.trim())
			.filter(Boolean);
		return {
			internalId: id,
			sku: str(r.itemid) ?? "",
			title: str(r.storedisplayname) ?? str(r.displayname) ?? str(r.itemid) ?? "Untitled item",
			description: str(r.storedescription) ?? "",
			price: priceMap.get(id) ?? null,
			image,
			gallery,
			grades,
			categoryName: str(r.category),
			itemType: str(r.itemtype),
			size: str(r.size),
			searchKeywords: str(r.searchkeywords),
			lastModified: str(r.lastmodifieddate),
		};
	});
}
