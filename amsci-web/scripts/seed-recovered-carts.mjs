/**
 * Turn the WooCommerce cart export into `recovered_carts` rows plus the links to email.
 *
 * Input files live under `private/` (gitignored — they contain customer PII):
 *   private/cart-export.json     the raw dump from the old site's wp_usermeta
 *   private/d1_products_img.json sku -> {title, image} for the current catalog
 *   private/d1_users_ids.json    email -> {id, display_name, status} on the new site
 *
 * Output (also under private/):
 *   private/recovered-carts.sql   INSERTs to apply with `wrangler d1 execute --file`
 *   private/recovered-carts.csv   email, name, line count, and the restore link
 *
 * Only the SHA-256 of each token is written to the database; the raw token
 * exists solely in the CSV, which is what feeds the mailing. Regenerating this
 * file mints NEW tokens, so do not re-run it after the emails have gone out
 * unless you intend to invalidate nothing and simply add more rows.
 *
 * Usage: node scripts/seed-recovered-carts.mjs [--site https://…] [--ttl-days 60]
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const argOf = (flag, dflt) => {
	const i = args.indexOf(flag);
	return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const SITE = (argOf("--site", "https://www.american-scientific.com")).replace(/\/$/, "");
const TTL_DAYS = Number(argOf("--ttl-days", "60"));
const PRIV = join(process.cwd(), "private");

const read = (n) => JSON.parse(readFileSync(join(PRIV, n), "utf8"));

const exported = read("cart-export.json");
const products = new Map(read("d1_products_img.json").map((p) => [p.sku, p]));
const users = new Map(read("d1_users_ids.json").map((u) => [(u.email || "").toLowerCase(), u]));

const lookup = exported.product_lookup ?? {};
const sqlEsc = (s) => String(s).replace(/'/g, "''");

const now = new Date();
const expires = new Date(now.getTime() + TTL_DAYS * 86400 * 1000);

const inserts = [];
const csv = [["email", "name", "restorable_lines", "unavailable_lines", "restore_url"]];
let skippedEmpty = 0;

for (const cart of exported.carts ?? []) {
	const email = (cart.email || "").trim().toLowerCase();
	if (!email) continue;

	const user = users.get(email) ?? null;
	const items = [];
	const unavailable = [];

	for (const line of cart.lines ?? []) {
		const info = lookup[String(line.product_id)] ?? {};
		const sku = (info.sku || "").trim();
		const qty = Math.max(1, Math.round(Number(line.quantity) || 0));
		if (!sku) continue;

		const prod = products.get(sku);
		if (!prod) {
			unavailable.push({ sku, title: info.title || "", qty });
			continue;
		}
		// Shape must match CartItem exactly: {sku,title,imageUrl,qty}.
		items.push({
			sku,
			title: prod.title || info.title || sku,
			imageUrl: prod.image || "",
			qty,
		});
	}

	// A cart of nothing but dead SKUs would send someone a link that restores
	// zero items — worse than not mailing them. Leave those for a phone call.
	if (items.length === 0) {
		skippedEmpty++;
		continue;
	}

	const raw = randomBytes(32).toString("hex");
	const id = createHash("sha256").update(raw).digest("hex");
	const name = user?.display_name || cart.name || "";

	inserts.push(
		`INSERT OR REPLACE INTO recovered_carts (id, user_id, email, items, unavailable, created_at, expires_at, first_used_at, use_count) VALUES ('${id}', ${user ? user.id : "NULL"}, '${sqlEsc(email)}', '${sqlEsc(JSON.stringify(items))}', '${sqlEsc(JSON.stringify(unavailable))}', '${now.toISOString()}', '${expires.toISOString()}', NULL, 0);`,
	);
	csv.push([email, name, String(items.length), String(unavailable.length), `${SITE}/cart/restore?token=${raw}`]);
}

writeFileSync(join(PRIV, "recovered-carts.sql"), inserts.join("\n") + "\n", "utf8");
writeFileSync(
	join(PRIV, "recovered-carts.csv"),
	csv.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n",
	"utf8",
);

console.log(`carts written:        ${inserts.length}`);
console.log(`skipped (no live SKUs): ${skippedEmpty}`);
console.log(`links expire:         ${expires.toISOString().slice(0, 10)} (${TTL_DAYS} days)`);
console.log(`\nprivate/recovered-carts.sql  -> apply with wrangler d1 execute`);
console.log(`private/recovered-carts.csv  -> the links (raw tokens; treat as secrets)`);
