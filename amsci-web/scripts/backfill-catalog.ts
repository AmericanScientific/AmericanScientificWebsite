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
import { fetchFullCatalog } from "../src/lib/catalog/sync-core";

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

async function main() {
	const account = (process.env.NS_ACCOUNT ?? "").trim();
	const client = NetSuiteClient.fromEnv(process.env);

	console.log(`\nBackfill ${LIMIT ? `SAMPLE (${LIMIT})` : "FULL catalog"} — NetSuite account ${account} (READ-ONLY)`);

	// Same engine the sync Worker uses (src/lib/catalog/sync-core.ts).
	const catalog = await fetchFullCatalog(client, account, {
		limit: LIMIT ?? undefined,
		onProgress: (fetched, total) => process.stdout.write(`  fetched ${fetched}/${total} items\r`),
	});
	process.stdout.write("\n");

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
