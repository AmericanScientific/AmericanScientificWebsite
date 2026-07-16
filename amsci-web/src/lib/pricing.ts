import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getPricesBySku } from "@/lib/catalog/d1";
import { getProductBySku } from "@/data/products";

/**
 * Resolve base prices for a set of SKUs.
 *
 * Runtime: one targeted, indexed D1 query (fast — touches only the requested
 * rows). Build / local dev without a D1 binding: falls back to the catalog map
 * (catalog.json). This is the single seam where per-account tiered pricing —
 * resolvePrice(sku, priceLevel, qty) against NetSuite — will plug in later.
 */
export async function resolvePrices(skus: string[]): Promise<Record<string, number | null>> {
	if (skus.length === 0) return {};
	try {
		const { env } = getCloudflareContext();
		const db = (env as { DB?: D1Database }).DB;
		if (db) return await getPricesBySku(db, skus);
	} catch {
		// No Cloudflare context (build / plain Node) → fall back to the catalog map.
	}
	const out: Record<string, number | null> = {};
	for (const sku of skus) {
		const product = await getProductBySku(sku);
		out[sku] = product?.price ?? null;
	}
	return out;
}
