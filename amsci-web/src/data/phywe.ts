import catalog from "@/data/phywe_catalog.json";

/**
 * PHYWE catalog — a SEPARATE, quote-only product line (CLAUDE.md §4), not part of
 * the NetSuite sync. Data is a static curated snapshot (src/data/phywe_catalog.json)
 * built from the PHYWE archive by scripts/build-phywe-catalog.ts. Images are served
 * straight from PHYWE's public CDN. No prices — everything is "Request a Quote".
 */
export interface PhyweProduct {
	articleNo: string;
	name: string;
	category: string;
	focus: string;
	subcategory: string;
	description: string;
	image: string | null;
}

const ALL = catalog as PhyweProduct[];

/** Category display order (by product count, sellable lines first). */
const CATEGORY_ORDER = [
	"Physics",
	"Chemistry",
	"Biology",
	"Experiments & Sets",
	"Sensors & Software",
	"Nature & Technology",
];

export function allPhywe(): PhyweProduct[] {
	return ALL;
}

/** Distinct categories present, in display order. */
export function phyweCategories(): string[] {
	const present = new Set(ALL.map((p) => p.category));
	return CATEGORY_ORDER.filter((c) => present.has(c));
}

/** Products in a category (or all when category is falsy/unknown). */
export function phyweByCategory(category?: string): PhyweProduct[] {
	if (!category) return ALL;
	return ALL.filter((p) => p.category === category);
}

/** Look up one product by its article number (case-insensitive). */
export function phyweByArticle(articleNo: string): PhyweProduct | undefined {
	const key = decodeURIComponent(articleNo).trim().toLowerCase();
	return ALL.find((p) => p.articleNo.toLowerCase() === key);
}
