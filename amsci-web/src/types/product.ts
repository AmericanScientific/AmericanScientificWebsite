/**
 * Product shape for the American Scientific storefront.
 *
 * NetSuite is the system of record; this type mirrors the NetSuite → storefront
 * field map documented in CLAUDE.md §3. The storefront is a thin, read-only layer
 * over NetSuite and must never be treated as a second source of truth.
 *
 * NOTE: this is the shell. Values here come from a local mock dataset only —
 * nothing in this file talks to NetSuite yet.
 */
export interface Product {
	/**
	 * NetSuite `internalId`. Canonical product key and upsert identity.
	 * Everything keys off this, never the SKU.
	 */
	internalId: string;

	/** NetSuite `itemid`. Human-facing SKU (e.g. "088-90142"); display/lookup only. */
	sku: string;

	/**
	 * Web product title. Derived in NetSuite from
	 * `storedisplayname → displayname → itemid` (first non-null wins).
	 */
	title: string;

	/** Web product description (NetSuite `storeDescription`). May be empty. */
	description: string;

	/**
	 * Base/list price (NetSuite price level 1).
	 *
	 * B2B pricing is tiered per customer with quantity breaks and is resolved
	 * live against NetSuite per account in the real build. In this shell the
	 * number is the base tier only — a placeholder for `resolvePrice(...)`.
	 */
	price: number;

	/** Product image URL (NetSuite `custitem_imageurltext`). */
	imageUrl: string;

	/**
	 * Leaf category slug, referencing a leaf node in `src/data/categories.ts`.
	 *
	 * Derived from NetSuite `class` (split on " : " into parent → child, the child
	 * being this leaf). The parent is resolved via the taxonomy, so we store only
	 * the most specific level here.
	 */
	category: string;

	/** Grade levels this product targets (NetSuite `custitem_grades`). */
	grades: string[];

	/**
	 * Variant-page metadata (set only on a collapsed listing card).
	 *
	 * When a product is really one member of a multi-variant page (see
	 * `src/data/variant-groups.ts`), listing accessors collapse its members to a
	 * single representative card carrying:
	 *  - `variantCount` — number of members (drives the "N options" badge + "from" price);
	 *  - `pageSlug` — the group page slug the card links to.
	 * Both are undefined for singles, so nothing changes for un-grouped products.
	 */
	variantCount?: number;
	pageSlug?: string;
}

/** URL-safe slug for a product detail route. SKU is stable and unique, so we key on it. */
export function productSlug(product: Product): string {
	return product.sku.toLowerCase();
}
