import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPricesBySku, getTierPricesBySku } from "@/lib/catalog/d1";
import { getProductBySku } from "@/data/products";

/**
 * NetSuite price level 1 — base/list. Customers with no negotiated tier resolve
 * here, which per CLAUDE.md §2 is the correct default for a null `pricelevel`.
 */
export const BASE_PRICE_LEVEL = 1;

/**
 * Resolve prices for a set of SKUs at a customer's price level.
 *
 * Runtime: one targeted, indexed D1 query per chunk (a LEFT JOIN onto
 * `product_prices`, falling back to the base price when the item has no row at
 * that level). Build / local dev without a D1 binding: falls back to the catalog
 * map, which only carries base — acceptable because that path never serves a
 * real signed-in customer.
 *
 * Callers must pass the level from the SESSION, never from the client. The price
 * that comes back is safe to send to the browser; the level that produced it is
 * not (it's internal commercial information), so it is never returned here.
 */
export async function resolvePrices(
	skus: string[],
	priceLevel: number = BASE_PRICE_LEVEL,
): Promise<Record<string, number | null>> {
	if (skus.length === 0) return {};

	// A non-positive or non-finite level would silently produce a join that
	// matches nothing and quietly hand back base for a tiered account. Treat
	// anything unusable as base explicitly instead.
	const level = Number.isFinite(priceLevel) && priceLevel > 0 ? Math.trunc(priceLevel) : BASE_PRICE_LEVEL;

	// Two separate try blocks on purpose. Missing context is EXPECTED (build, plain
	// Node) and must stay silent — it fires for every batch and would flood a build
	// log. A D1 query that throws is NOT expected, and lumping the two together
	// meant a tiered customer could be served base prices from catalog.json with
	// nothing recorded anywhere. Both still degrade to the fallback; only one is
	// worth waking up to.
	let db: D1Database | undefined;
	try {
		db = (getCloudflareContext().env as { DB?: D1Database }).DB;
	} catch {
		// No Cloudflare context → fall through to the catalog map below.
	}

	if (db) {
		try {
			// Base customers don't need the join — `products.price` already is their price.
			return level === BASE_PRICE_LEVEL
				? await getPricesBySku(db, skus)
				: await getTierPricesBySku(db, skus, level);
		} catch (err) {
			// Most likely cause in practice: migration 0007 hasn't been applied to
			// this environment, so `product_prices` doesn't exist yet.
			console.error(
				`[pricing] D1 lookup failed at level ${level} for ${skus.length} sku(s); ` +
					`falling back to base catalog prices:`,
				err instanceof Error ? err.message : err,
			);
		}
	}

	const out: Record<string, number | null> = {};
	for (const sku of skus) {
		const product = await getProductBySku(sku);
		out[sku] = product?.price ?? null;
	}
	return out;
}
