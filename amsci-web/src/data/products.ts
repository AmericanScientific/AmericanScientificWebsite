import { cache } from "react";
import type { Product } from "@/types/product";
import { productSlug } from "@/types/product";
import {
	getAllLeafCategories,
	getParentCategory,
	findLeafByName,
	CATEGORY_TREE,
} from "@/data/categories";
import { getCatalog } from "@/data/catalog-source";
import type { CatalogRecord } from "@/lib/catalog/types";

/**
 * Storefront catalog — sourced from NetSuite via the disposable cache.
 *
 * Reads through `getCatalog()` (src/data/catalog-source.ts): D1 at runtime (the
 * cron-synced cache), falling back to the committed `catalog.json` snapshot at
 * build time / locally. NetSuite is the system of record; this module maps the
 * cache down to the render-facing `Product`. Per-account tiered price/stock is
 * resolved LIVE elsewhere — `price` here is base (level 1) only.
 *
 * All accessors are async (D1 is a runtime, per-request source) and memoized per
 * render via React `cache()`.
 */

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

function toProduct(c: CatalogRecord): Product {
	return {
		internalId: c.internalId,
		sku: c.sku,
		title: c.title || c.sku || "Untitled item",
		description: c.description ?? "",
		price: c.price ?? 0,
		imageUrl: c.image ?? "",
		category: slugForClass(c.categoryName),
		grades: c.grades ?? [],
	};
}

/** The catalog mapped to the storefront Product shape. Memoized per render. */
export const getAllProducts = cache(async (): Promise<Product[]> => {
	const catalog = await getCatalog();
	return catalog.map(toProduct);
});

/** Products in a single leaf category (by leaf slug). */
export async function getProductsByLeaf(leafSlug: string): Promise<Product[]> {
	const products = await getAllProducts();
	return products.filter((p) => p.category === leafSlug);
}

/**
 * Products under a top-level parent (by parent slug).
 *
 * Parents with subcategories match any of their leaf slugs. Standalone top-level
 * categories (e.g. Special) have products assigned directly to the parent slug.
 */
export async function getProductsByParent(parentSlug: string): Promise<Product[]> {
	const parent = getParentCategory(parentSlug);
	if (!parent) return [];
	const products = await getAllProducts();
	if (parent.children?.length) {
		const leaves = new Set(parent.children.map((c) => c.slug));
		return products.filter((p) => leaves.has(p.category) || p.category === parentSlug);
	}
	return products.filter((p) => p.category === parentSlug);
}

/** Look up one product by its detail-page slug (derived from SKU). */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
	const products = await getAllProducts();
	return products.find((p) => productSlug(p) === slug.toLowerCase());
}

/** Count of products in each leaf category slug. Handy for nav/landing badges. */
export async function getLeafProductCounts(): Promise<Record<string, number>> {
	const products = await getAllProducts();
	const counts: Record<string, number> = {};
	for (const leaf of getAllLeafCategories()) counts[leaf.slug] = 0;
	for (const p of products) counts[p.category] = (counts[p.category] ?? 0) + 1;
	return counts;
}
