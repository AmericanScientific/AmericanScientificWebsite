import type { Product } from "@/types/product";
import { getAllProducts, collapseToPages } from "@/data/products";
import { getCatalog } from "@/data/catalog-source";
import { cache } from "react";
import { getCategoryName, getTopLevelSlug } from "@/data/categories";

/**
 * Catalog search — in-memory scoring over the synced catalog (~1.3k items), so it
 * needs no separate index/infra and works against D1 at runtime or the JSON seed
 * locally. Scores on SKU, title, NetSuite search keywords, category, grades, and
 * description with descending weight; supports the advanced filters used by the
 * results page and the header typeahead.
 */

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name";
const SORTS: readonly SortKey[] = ["relevance", "price-asc", "price-desc", "name"];

export interface SearchFilters {
	/** Free-text query (already trimmed). */
	q: string;
	/** Category slug — a leaf ("magnetism") or a top-level family ("physics-physical-science"). */
	category: string | null;
	/** Exact grade level (e.g. "All Ages"). */
	grade: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	sort: SortKey;
}

export interface SearchOutcome {
	results: Product[];
	total: number;
	filters: SearchFilters;
}

/** Normalize raw URL params (all strings) into typed, validated filters. */
export function parseSearchFilters(params: Record<string, string | undefined>): SearchFilters {
	const num = (v: string | undefined): number | null => {
		if (v == null || v === "") return null;
		const n = Number(v);
		return Number.isFinite(n) && n >= 0 ? n : null;
	};
	return {
		q: (params.q ?? "").trim(),
		category: params.category?.trim() || null,
		grade: params.grade?.trim() || null,
		minPrice: num(params.min),
		maxPrice: num(params.max),
		sort: SORTS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "relevance",
	};
}

/** A product matches a category filter by exact leaf slug OR by top-level family. */
function matchesCategory(p: Product, category: string): boolean {
	return p.category === category || getTopLevelSlug(p.category) === category;
}

/** Whole-word-ish start check without regex cost (approximate, punctuation-tolerant). */
function hasWordStartingWith(haystack: string, term: string): boolean {
	return ` ${haystack}`.includes(` ${term}`);
}

/**
 * Relevance score for one product against the query terms. Returns 0 (excluded)
 * unless EVERY term matches at least one field, so multi-word queries narrow.
 */
function scoreProduct(p: Product, keywords: string, terms: string[], fullQuery: string): number {
	const sku = p.sku.toLowerCase();
	const title = p.title.toLowerCase();
	const desc = p.description.toLowerCase();
	const cat = getCategoryName(p.category).toLowerCase();
	const grades = p.grades.join(" ").toLowerCase();

	let score = 0;
	// Whole-query boosts — exact SKU/title wins go straight to the top.
	if (sku === fullQuery) score += 1000;
	else if (sku.includes(fullQuery)) score += 140;
	if (title === fullQuery) score += 400;
	else if (title.startsWith(fullQuery)) score += 140;

	for (const t of terms) {
		let s = 0;
		if (sku.includes(t)) s += 60;
		if (hasWordStartingWith(title, t)) s += 40;
		else if (title.includes(t)) s += 22;
		if (keywords.includes(t)) s += 14;
		if (cat.includes(t)) s += 10;
		if (grades.includes(t)) s += 8;
		if (desc.includes(t)) s += 5;
		if (s === 0) return 0; // this term matched nothing → drop the product
		score += s;
	}
	return score;
}

/** Run a search + filter + sort over the catalog. */
export async function searchCatalog(filters: SearchFilters): Promise<SearchOutcome> {
	const [products, catalog] = await Promise.all([getAllProducts(), getCatalog()]);

	// internalId → extra searchable text (keywords + size) not carried on Product.
	const extra = new Map<string, string>();
	for (const c of catalog) {
		extra.set(c.internalId, `${c.searchKeywords ?? ""} ${c.size ?? ""}`.toLowerCase());
	}

	const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
	const fullQuery = terms.join(" ");
	const gradeNeedle = filters.grade?.toLowerCase() ?? null;

	const scored: { p: Product; score: number }[] = [];
	for (const p of products) {
		if (filters.category && !matchesCategory(p, filters.category)) continue;
		if (gradeNeedle && !p.grades.some((g) => g.toLowerCase() === gradeNeedle)) continue;
		if (filters.minPrice != null && p.price < filters.minPrice) continue;
		if (filters.maxPrice != null && p.price > filters.maxPrice) continue;

		if (terms.length > 0) {
			const score = scoreProduct(p, extra.get(p.internalId) ?? "", terms, fullQuery);
			if (score <= 0) continue;
			scored.push({ p, score });
		} else {
			scored.push({ p, score: 0 });
		}
	}

	const byName = (a: Product, b: Product) => a.title.localeCompare(b.title);
	switch (filters.sort) {
		case "price-asc":
			scored.sort((a, b) => a.p.price - b.p.price || byName(a.p, b.p));
			break;
		case "price-desc":
			scored.sort((a, b) => b.p.price - a.p.price || byName(a.p, b.p));
			break;
		case "name":
			scored.sort((a, b) => byName(a.p, b.p));
			break;
		default: // relevance (falls back to name when there's no query to rank by)
			scored.sort((a, b) => (terms.length ? b.score - a.score || byName(a.p, b.p) : byName(a.p, b.p)));
	}

	// Collapse variant members to one group card each (keeps the highest-ranked
	// member's position), so results show one card per product linking to its page.
	const results = await collapseToPages(scored.map((s) => s.p));
	return { results, total: results.length, filters };
}

/** Distinct grade levels present in the catalog, sorted — for the grade filter. */
export const getAllGrades = cache(async (): Promise<string[]> => {
	const products = await getAllProducts();
	const set = new Set<string>();
	for (const p of products) for (const g of p.grades) if (g.trim()) set.add(g.trim());
	return [...set].sort((a, b) => a.localeCompare(b));
});
