import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import catalogJson from "@/data/catalog.json";
import { readCatalogFromD1 } from "@/lib/catalog/d1";
import type { CatalogRecord } from "@/lib/catalog/types";

/**
 * Single entry point for reading the catalog cache.
 *
 * Runtime (request/ISR regeneration): reads the freshly-synced catalog from D1
 * (the `DB` binding), populated by the sync Worker on a Cloudflare Cron schedule.
 *
 * Build time / local `next dev` without a D1 binding, or an empty/unavailable D1:
 * falls back to the committed `catalog.json` snapshot. This keeps the static
 * build working (routes are enumerated from the seed) and means the site never
 * breaks if D1 is empty or errors — it just serves the last committed snapshot.
 *
 * Wrapped in React `cache()` so a single render reads the source once even though
 * several data helpers call it.
 */
const FALLBACK = catalogJson as unknown as CatalogRecord[];

export const getCatalog = cache(async (): Promise<CatalogRecord[]> => {
	try {
		const { env } = getCloudflareContext();
		const db = (env as { DB?: D1Database }).DB;
		if (db) {
			const rows = await readCatalogFromD1(db);
			if (rows.length > 0) return rows;
		}
	} catch {
		// No Cloudflare context (build / plain Node) or D1 error → use the snapshot.
	}
	return FALLBACK;
});
