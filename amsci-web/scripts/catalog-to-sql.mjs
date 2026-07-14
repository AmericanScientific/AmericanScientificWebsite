/**
 * Emit SQL INSERTs for the catalog cache from a catalog JSON snapshot.
 *
 * Utility for SEEDING a D1 database (mainly local dev / first prod fill) directly
 * from `src/data/catalog.json` without running a NetSuite sync. The scheduled
 * sync Worker is the normal way data gets into D1; this is a convenience.
 *
 *   node scripts/catalog-to-sql.mjs > /tmp/seed.sql
 *   wrangler d1 execute amsci-catalog --local  --file=/tmp/seed.sql
 *   wrangler d1 execute amsci-catalog --remote --file=/tmp/seed.sql   # prod (needs auth)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.argv[2] ?? "src/data/catalog.json");
const catalog = JSON.parse(readFileSync(path, "utf-8"));

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "NULL" : String(Number(v)));

const now = new Date().toISOString();
const rows = catalog.map((c) =>
	`(${q(c.internalId)},${q(c.sku ?? "")},${q(c.title ?? "")},${q(c.description ?? "")},${num(c.price)},` +
	`${q(c.image)},${q(JSON.stringify(c.gallery ?? []))},${q(JSON.stringify(c.grades ?? []))},` +
	`${q(c.categoryName)},${q(c.itemType)},${q(c.size)},${q(c.searchKeywords)},${q(c.lastModified)},${q(now)})`,
);

const cols =
	"internal_id,sku,title,description,price,image,gallery,grades,category_name,item_type,size,search_keywords,last_modified,synced_at";

// Chunk into multi-row INSERTs. Kept small: descriptions are long and D1 caps
// the per-statement byte size (SQLITE_TOOBIG).
const CHUNK = 40;
process.stdout.write("DELETE FROM products;\n");
for (let i = 0; i < rows.length; i += CHUNK) {
	process.stdout.write(`INSERT INTO products (${cols}) VALUES\n${rows.slice(i, i + CHUNK).join(",\n")};\n`);
}
process.stderr.write(`Emitted ${rows.length} rows.\n`);
