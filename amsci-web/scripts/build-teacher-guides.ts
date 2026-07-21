/**
 * Build src/data/teacher_guides.json — NetSuite → validated teacher's-guide map.
 * READ-ONLY against NetSuite (SuiteQL only).
 *
 * Products carry a teacher's-guide PDF (`custitemtg_url`) and sometimes a separate
 * handout (`custitemhandout_url`). Those URLs are of mixed health: some are public
 * File Cabinet PDFs, some are login-gated, dead-host, or point at the wrong record.
 * This script fetches each candidate URL and keeps ONLY the ones that actually
 * return a PDF, so the storefront never shows a button that leads to a login page.
 *
 * Output shape (keyed by lowercased SKU, working URLs only):
 *   { "1000-01": { "guide": "https://…pdf", "handout": "https://…pdf" }, … }
 *
 * Usage (from amsci-web/, creds from .dev.vars):
 *   npx tsx scripts/build-teacher-guides.ts
 *
 * Re-runnable and idempotent. NEVER writes to NetSuite.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { NetSuiteClient } from "../src/lib/netsuite/client";

// .dev.vars must win over the shell's stale NS_* exports (see backfill script).
dotenv.config({ path: resolve(process.cwd(), ".dev.vars"), override: true });

const OUT = resolve(process.cwd(), "src/data/teacher_guides.json");
const BROWSER_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface Row {
	itemid: string | null;
	tg: string | null;
	handout: string | null;
}

/** True when the URL resolves to an actual PDF (not a login page / dead host / item page). */
async function servesPdf(raw: string): Promise<boolean> {
	// Never even try item-page links — they're miskeyed data, not documents.
	if (/\/app\/common\/item\/item\.nl/i.test(raw)) return false;
	// Try https then http (some legacy media hosts only speak http).
	const u = (() => {
		try {
			return new URL(raw);
		} catch {
			return null;
		}
	})();
	if (!u) return false;
	const rest = `${u.host}${u.pathname}${u.search}`;
	const candidates = u.protocol === "http:" ? [`http://${rest}`, `https://${rest}`] : [`https://${rest}`, `http://${rest}`];
	for (const url of candidates) {
		try {
			const res = await fetch(url, {
				headers: { "User-Agent": BROWSER_UA, Accept: "application/pdf,*/*" },
				redirect: "follow",
			});
			const ct = (res.headers.get("content-type") ?? "").toLowerCase();
			if (res.ok && ct.includes("pdf")) return true;
		} catch {
			/* try next candidate */
		}
	}
	return false;
}

async function main() {
	const account = (process.env.NS_ACCOUNT ?? "").trim();
	const client = NetSuiteClient.fromEnv(process.env);
	console.log(`\nBuild teacher-guides map — NetSuite account ${account} (READ-ONLY)\n`);

	const q =
		"SELECT itemid AS itemid, custitemtg_url AS tg, custitemhandout_url AS handout " +
		"FROM item WHERE isonline='T' AND isinactive='F' " +
		"AND (custitemtg_url IS NOT NULL OR custitemhandout_url IS NOT NULL) ORDER BY itemid";
	const page = await client.suiteql<Row>(q, { limit: 1000 });
	const rows = page.items;
	console.log(`Candidates with a guide/handout URL: ${rows.length}`);

	const map: Record<string, { guide?: string; handout?: string }> = {};
	let guideOk = 0,
		guideBad = 0,
		handoutOk = 0,
		handoutBad = 0;
	const broken: string[] = [];

	for (const r of rows) {
		const sku = (r.itemid ?? "").trim();
		if (!sku) continue;
		const entry: { guide?: string; handout?: string } = {};

		if (r.tg) {
			if (await servesPdf(r.tg)) {
				entry.guide = r.tg;
				guideOk++;
			} else {
				guideBad++;
				broken.push(`${sku} guide: ${r.tg}`);
			}
		}
		if (r.handout) {
			if (await servesPdf(r.handout)) {
				entry.handout = r.handout;
				handoutOk++;
			} else {
				handoutBad++;
				broken.push(`${sku} handout: ${r.handout}`);
			}
		}
		if (entry.guide || entry.handout) map[sku.toLowerCase()] = entry;
		process.stdout.write(`  checked ${sku}                         \r`);
	}
	process.stdout.write("\n");

	const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
	writeFileSync(OUT, JSON.stringify(sorted, null, "\t") + "\n", "utf-8");

	console.log(`\nGuides:   ${guideOk} working, ${guideBad} broken/gated`);
	console.log(`Handouts: ${handoutOk} working, ${handoutBad} broken/gated`);
	console.log(`SKUs with at least one working doc: ${Object.keys(sorted).length}`);
	console.log(`\nWrote ${OUT}`);
	if (broken.length) {
		console.log(`\n--- ${broken.length} broken/gated (need "Available Without Login" in NetSuite, or bad data) ---`);
		for (const b of broken) console.log("  " + b);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
