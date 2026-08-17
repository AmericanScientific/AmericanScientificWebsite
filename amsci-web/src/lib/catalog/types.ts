/**
 * Canonical catalog record — the storefront's cached shape for one NetSuite item.
 *
 * This is the single source of truth for the cache shape, shared by every layer:
 *  - the backfill CLI (`scripts/backfill-catalog.ts`) writes an array of these to
 *    `src/data/catalog.json`;
 *  - the sync core (`sync-core.ts`) produces these from NetSuite;
 *  - D1 stores one row per record (`lib/catalog/d1.ts`);
 *  - `src/data/products.ts` maps these down to the render-facing `Product`.
 *
 * NetSuite is the system of record; a `CatalogRecord` is disposable cache derived
 * from it. Per-account tiered price/stock is NEVER baked in here — `price` is base
 * (level 1, qty 1) only; live pricing is resolved per request elsewhere.
 */
export interface CatalogRecord {
	/** NetSuite `id` / internalId — canonical key & upsert identity. */
	internalId: string;
	/** NetSuite `itemid` (SKU). Display/lookup only. */
	sku: string;
	/** Web title: storedisplayname → displayname → itemid. */
	title: string;
	/** storedescription (raw; shaped at render time). */
	description: string;
	/** Base price (level 1, qty 1). null when NetSuite has no base price row. */
	price: number | null;
	/** Resolved absolute File Cabinet image URL; null → placeholder. */
	image: string | null;
	/** Resolved absolute gallery URLs (0–3). */
	gallery: string[];
	/** custitem_grades, split to a list. */
	grades: string[];
	/** BUILTIN.DF(class) display name — mapped to a taxonomy slug downstream. */
	categoryName: string | null;
	/** InvtPart / Kit / … */
	itemType: string | null;
	/** custitem_size (often null). */
	size: string | null;
	/** searchkeywords CSV. */
	searchKeywords: string | null;
	/** lastmodifieddate — drives incremental sync. */
	lastModified: string | null;
}

/**
 * One item's price at one NetSuite price level, quantity 1.
 *
 * Stored in D1 `product_prices` and joined at request time to resolve what a
 * signed-in customer on a negotiated tier should pay. Level 1 rows are included
 * for completeness, but `products.price` remains the authoritative base and the
 * fallback when an item has no row at the customer's level.
 *
 * Quantity is not a dimension: NetSuite has no usable volume schedules (only
 * qty-1 and dirty qty-2 rows), so everything here is qty 1.
 */
export interface TierPriceRecord {
	/** NetSuite item id — matches `CatalogRecord.internalId` / `products.internal_id`. */
	internalId: string;
	/** NetSuite price level: 1 = base/list; 2, 3, 4, 7, 8 = negotiated tiers. */
	priceLevel: number;
	/** Unit price at quantity 1. */
	unitPrice: number;
}
