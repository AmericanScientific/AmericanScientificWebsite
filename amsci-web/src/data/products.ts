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
import {
	pageForSku,
	isMultiVariant,
	defaultMember,
	slugForPage,
	type VariantPage,
} from "@/data/variant-groups";

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

/** SKU → Product lookup over the full catalog. Memoized per render. */
const getProductsBySku = cache(async (): Promise<Map<string, Product>> => {
	const products = await getAllProducts();
	return new Map(products.map((p) => [p.sku.toLowerCase(), p]));
});

/**
 * Build the single representative listing card for a multi-variant page.
 *
 * Content comes from the page's default (first) member via the catalog cache;
 * title is the group name, price is the MIN base across members ("from …"), and
 * `variantCount`/`pageSlug` drive the card's badge + group link.
 */
function buildPageCard(page: VariantPage, bySku: Map<string, Product>): Product | null {
	const base = bySku.get(defaultMember(page).item_number.toLowerCase());
	if (!base) return null; // default member missing from cache — skip defensively
	let min = base.price;
	for (const m of page.members) {
		const p = bySku.get(m.item_number.toLowerCase());
		if (p && p.price > 0 && (min <= 0 || p.price < min)) min = p.price;
	}
	return {
		...base,
		title: page.product_name,
		price: min,
		variantCount: page.members.length,
		pageSlug: slugForPage(page),
	};
}

/**
 * Collapse a product list so each multi-variant page appears once (as a group
 * card) and singles pass through unchanged. Order follows first appearance.
 */
export async function collapseToPages(products: Product[]): Promise<Product[]> {
	const bySku = await getProductsBySku();
	const out: Product[] = [];
	const seen = new Set<string>();
	for (const p of products) {
		const page = pageForSku(p.sku);
		if (!page || !isMultiVariant(page)) {
			// Single (or ungrouped): link straight to its name-based page slug.
			out.push(page ? { ...p, pageSlug: slugForPage(page) } : p);
			continue;
		}
		if (seen.has(page.page_id)) continue;
		seen.add(page.page_id);
		const card = buildPageCard(page, bySku);
		out.push(card ?? p);
	}
	return out;
}

/** The full catalog collapsed to listing cards (one per page; ~975). */
export async function getListingProducts(): Promise<Product[]> {
	return collapseToPages(await getAllProducts());
}

/** Products in a single leaf category (by leaf slug), collapsed to one card per page. */
export async function getProductsByLeaf(leafSlug: string): Promise<Product[]> {
	const products = await getAllProducts();
	return collapseToPages(products.filter((p) => p.category === leafSlug));
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
		return collapseToPages(products.filter((p) => leaves.has(p.category) || p.category === parentSlug));
	}
	return collapseToPages(products.filter((p) => p.category === parentSlug));
}

/** Look up one product by its detail-page slug (derived from SKU). */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
	const products = await getAllProducts();
	return products.find((p) => productSlug(p) === slug.toLowerCase());
}

/** Look up one product by SKU (used to hydrate variant members from the cache). */
export async function getProductBySku(sku: string): Promise<Product | undefined> {
	return (await getProductsBySku()).get(sku.toLowerCase());
}

/**
 * Count of product *pages* in each leaf category slug (multi-variant members
 * count once, as their page). Handy for nav/landing badges.
 */
export async function getLeafProductCounts(): Promise<Record<string, number>> {
	const products = await getAllProducts();
	const counts: Record<string, number> = {};
	// distinct listing units seen per category (page_id for groups, SKU otherwise)
	const seen: Record<string, Set<string>> = {};
	for (const leaf of getAllLeafCategories()) {
		counts[leaf.slug] = 0;
		seen[leaf.slug] = new Set();
	}
	for (const p of products) {
		const bucket = (seen[p.category] ??= new Set());
		const page = pageForSku(p.sku);
		const unit = page && isMultiVariant(page) ? page.page_id : p.sku;
		if (bucket.has(unit)) continue;
		bucket.add(unit);
		counts[p.category] = (counts[p.category] ?? 0) + 1;
	}
	return counts;
}
