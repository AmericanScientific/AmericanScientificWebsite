/**
 * Catalog backfill — NetSuite → src/data/catalog.json (READ-ONLY against NetSuite).
 *
 * Populates the storefront catalog from the canonical web population
 * (`item WHERE isonline='T' AND isinactive='F'`, CLAUDE.md §3), resolving every
 * product image through the File Cabinet (see src/lib/netsuite/images.ts).
 * Reuses the existing signed TBA client — no new NetSuite access path.
 *
 * This is the FIRST backfill mechanism: a committed JSON snapshot the storefront
 * reads. We migrate to D1 + live sync later (CLAUDE.md §5). The script is
 * re-runnable and idempotently overwrites its output.
 *
 * Usage (from the project root, creds loaded from .dev.vars):
 *   npx tsx scripts/backfill-catalog.ts                 # full catalog → src/data/catalog.json
 *   npx tsx scripts/backfill-catalog.ts --limit 25      # sample → src/data/catalog.sample.json
 *   npx tsx scripts/backfill-catalog.ts --limit 50 --out src/data/foo.json
 *
 * NEVER writes to NetSuite. Only SuiteQL reads.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { NetSuiteClient } from "../src/lib/netsuite/client";
import { buildFileUrlMap, parseFileId } from "../src/lib/netsuite/images";

// Secrets come from .dev.vars (same file OpenNext reads for `next dev`).
// `override: true` is REQUIRED: this shell already exports stale NS_* values
// (and an empty NS_TOKEN); without override, dotenv leaves those in place and
// auth fails with INVALID_LOGIN. .dev.vars must win.
dotenv.config({ path: resolve(process.cwd(), ".dev.vars"), override: true });

// ── args ─────────────────────────────────────────────────────────────────────
function argValue(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const limitArg = argValue("--limit");
const LIMIT = limitArg ? Math.max(1, parseInt(limitArg, 10)) : null;
const OUT = resolve(
	process.cwd(),
	argValue("--out") ?? (LIMIT ? "src/data/catalog.sample.json" : "src/data/catalog.json"),
);
const PAGE = 1000;

// ── shape written to disk (superset of the storefront Product) ────────────────
interface CatalogProduct {
	internalId: string; // NetSuite id — canonical key
	sku: string; // itemid
	title: string; // storedisplayname → itemid
	description: string; // storedescription (raw; shaped at render time)
	price: number | null; // base price (level 1, qty 1); per-tier resolvePrice() comes later
	image: string | null; // resolved absolute File Cabinet URL (null → placeholder)
	gallery: string[]; // resolved absolute gallery URLs (0–3)
	grades: string[]; // custitem_grades, split
	categoryName: string | null; // BUILTIN.DF(class) — mapped to a taxonomy slug when wiring
	itemType: string | null; // InvtPart / Kit / …
	size: string | null; // custitem_size (often null)
	searchKeywords: string | null; // CSV
	lastModified: string | null; // drives future incremental sync
}

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => {
	if (v === null || v === undefined) return null;
	const s = String(v).trim();
	return s === "" ? null : s;
};

async function fetchCatalogRows(client: NetSuiteClient): Promise<Row[]> {
	const select =
		"SELECT i.id AS id, i.itemid AS itemid, i.storedisplayname AS storedisplayname, " +
		"i.displayname AS displayname, " +
		"i.storedescription AS storedescription, i.storedisplayimage AS storedisplayimage, " +
		"i.custitemgalleryimage1 AS g1, i.custitemgalleryimage2 AS g2, i.custitemgalleryimage3 AS g3, " +
		"BUILTIN.DF(i.custitem_grades) AS grades, i.custitem_size AS size, " +
		"BUILTIN.DF(i.class) AS category, i.itemtype AS itemtype, " +
		"i.searchkeywords AS searchkeywords, i.lastmodifieddate AS lastmodifieddate " +
		"FROM item i WHERE i.isonline = 'T' AND i.isinactive = 'F' ORDER BY i.id";

	if (LIMIT) {
		const page = await client.suiteql<Row>(select, { limit: LIMIT, offset: 0 });
		return page.items;
	}
	const rows: Row[] = [];
	for (let offset = 0; ; offset += PAGE) {
		const page = await client.suiteql<Row>(select, { limit: PAGE, offset });
		rows.push(...page.items);
		process.stdout.write(`  fetched ${rows.length}/${page.totalResults} items\r`);
		if (!page.hasMore) break;
	}
	process.stdout.write("\n");
	return rows;
}

/** Batch base prices (level 1, qty 1) for a set of item ids → Map<itemId, price>. */
async function fetchBasePrices(client: NetSuiteClient, itemIds: string[]): Promise<Map<string, number>> {
	const map = new Map<string, number>();
	const chunk = 200;
	for (let i = 0; i < itemIds.length; i += chunk) {
		const ids = itemIds.slice(i, i + chunk);
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

async function main() {
	const account = (process.env.NS_ACCOUNT ?? "").trim();
	const client = NetSuiteClient.fromEnv(process.env);

	console.log(`\nBackfill ${LIMIT ? `SAMPLE (${LIMIT})` : "FULL catalog"} — NetSuite account ${account} (READ-ONLY)`);
	const rows = await fetchCatalogRows(client);
	console.log(`Fetched ${rows.length} items.`);

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
	console.log(`Resolving ${fileIds.size} unique File Cabinet images…`);
	const fileUrls = await buildFileUrlMap(client, fileIds, account);

	const priceMap = await fetchBasePrices(
		client,
		rows.map((r) => String(str(r.id))).filter(Boolean),
	);

	// Assemble.
	const catalog: CatalogProduct[] = rows.map((r) => {
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

	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, JSON.stringify(catalog, null, "\t") + "\n", "utf-8");

	// ── report ─────────────────────────────────────────────────────────────────
	const withImage = catalog.filter((p) => p.image).length;
	const withGallery = catalog.filter((p) => p.gallery.length > 0).length;
	const galleryTotal = catalog.reduce((n, p) => n + p.gallery.length, 0);
	const withPrice = catalog.filter((p) => p.price != null).length;
	console.log("\n── Backfill summary ─────────────────────────");
	console.log(`  items written        : ${catalog.length}`);
	console.log(`  primary image        : ${withImage} resolved / ${catalog.length - withImage} placeholder`);
	console.log(`  gallery images       : ${galleryTotal} across ${withGallery} items`);
	console.log(`  base price present   : ${withPrice} / ${catalog.length}`);
	console.log(`  output               : ${OUT}`);
	console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
	console.error("\nBackfill FAILED:", err);
	process.exit(1);
});
