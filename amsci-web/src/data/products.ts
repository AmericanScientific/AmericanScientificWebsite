import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";
import {
	getAllLeafCategories,
	getParentCategory,
	findLeafByName,
	CATEGORY_TREE,
} from "@/data/categories";
import catalogRaw from "@/data/catalog.json";

/**
 * Storefront catalog — sourced from NetSuite.
 *
 * This module reads `catalog.json`, the cache produced by
 * `scripts/backfill-catalog.ts` (NetSuite `item WHERE isonline='T' AND
 * isinactive='F'`, CLAUDE.md §3/§5). NetSuite is the system of record; this cache
 * is disposable and rebuilt by re-running the backfill (later: D1 + live sync).
 * Nothing here is authored by hand.
 *
 * The on-disk record is a superset of `Product`; we map it down to the shape the
 * storefront renders. Per-account tiered price/stock is resolved LIVE elsewhere
 * (`resolvePrice`), never baked into this cache — `price` here is base (level 1).
 */
interface CatalogRecord {
	internalId: string;
	sku: string;
	title: string;
	description: string;
	price: number | null;
	image: string | null;
	gallery: string[];
	grades: string[];
	categoryName: string | null;
	itemType: string | null;
	size: string | null;
	searchKeywords: string | null;
	lastModified: string | null;
}

/**
 * Map a NetSuite `class` display name to a taxonomy slug (Product.category):
 *  - matches a leaf name  → that leaf slug (the common case);
 *  - matches a top-level name ("Laboratory", "Special") → that top-level slug;
 *  - null / unmatched → "special" (a real standalone bucket, so it still lists).
 */
function slugForClass(name: string | null): string {
	if (name) {
		const leaf = findLeafByName(name);
		if (leaf) return leaf.leaf.slug;
		const needle = name.trim().toLowerCase();
		const top = CATEGORY_TREE.find((c) => c.name.toLowerCase() === needle);
		if (top) return top.slug;
	}
	return "special";
}

/** The catalog, mapped to the storefront Product shape. Built once at module load. */
export const PRODUCTS: Product[] = (catalogRaw as CatalogRecord[]).map((c) => ({
	internalId: c.internalId,
	sku: c.sku,
	title: c.title || c.sku || "Untitled item",
	description: c.description ?? "",
	price: c.price ?? 0,
	imageUrl: c.image ?? "",
	category: slugForClass(c.categoryName),
	grades: c.grades ?? [],
}));

/** All products. */
export function getAllProducts(): Product[] {
	return PRODUCTS;
}

/** Products in a single leaf category (by leaf slug). */
export function getProductsByLeaf(leafSlug: string): Product[] {
	return PRODUCTS.filter((p) => p.category === leafSlug);
}

/**
 * Products under a top-level parent (by parent slug).
 *
 * Parents with subcategories match any of their leaf slugs. Standalone top-level
 * categories (e.g. Special) have products assigned directly to the parent slug.
 */
export function getProductsByParent(parentSlug: string): Product[] {
	const parent = getParentCategory(parentSlug);
	if (!parent) return [];
	if (parent.children?.length) {
		const leaves = new Set(parent.children.map((c) => c.slug));
		return PRODUCTS.filter((p) => leaves.has(p.category) || p.category === parentSlug);
	}
	return PRODUCTS.filter((p) => p.category === parentSlug);
}

/** Look up one product by its detail-page slug (derived from SKU). */
export function getProductBySlug(slug: string): Product | undefined {
	return PRODUCTS.find((p) => productSlug(p) === slug.toLowerCase());
}

/** Count of products in each leaf category slug. Handy for nav/landing badges. */
export function getLeafProductCounts(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const leaf of getAllLeafCategories()) counts[leaf.slug] = 0;
	for (const p of PRODUCTS) counts[p.category] = (counts[p.category] ?? 0) + 1;
	return counts;
}
