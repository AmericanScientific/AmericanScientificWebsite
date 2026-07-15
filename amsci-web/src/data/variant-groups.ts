/**
 * Variant product grouping — a storefront presentation layer.
 *
 * WHY THIS EXISTS
 * ---------------
 * NetSuite carries many items that are really ONE product in several sizes /
 * materials / colors / pack sizes (a spring scale in six ranges, a ball in every
 * material+diameter). Rendered one-page-per-item, that's ~1,306 near-duplicate
 * pages. This module folds them into 975 product pages: 143 multi-variant pages
 * (with a size/option selector) + 832 singles.
 *
 * The grouping itself is DATA, not code: `product_groups.json` was produced by a
 * separate NetSuite analysis and is treated as the source of truth for "what is
 * one product." We do NOT re-derive it here. Individual NetSuite items are
 * untouched; the storefront just *presents* a page's members as one page and
 * collapses them to a single card in listings.
 *
 * Member CONTENT (title, image, description, base price) is not stored here — it
 * comes from the catalog cache (`catalog.json` / D1) keyed by SKU, which covers
 * every member 1:1. This file only owns the grouping + routing.
 */

import groupsData from "@/data/product_groups.json";

export interface VariantMember {
	/** NetSuite `itemid` (SKU) — the stable member key used everywhere. */
	item_number: string;
	netsuite_internal_id: number;
	full_name: string;
	store_name: string | null;
	/** Option text; for a combination axis, parts joined by " / " in axis order. */
	variant_label: string | null;
	itemtype: string;
	has_image: boolean;
}

export interface VariantPage {
	/** Stable id (e.g. "G0456"); slug disambiguator on collisions, PR/analytics key. */
	page_id: string;
	product_name: string;
	family: string;
	page_type: "multi-variant" | "single";
	/** What options vary by, e.g. "Size" or "Material / Size" (combo). "" for singles. */
	variant_axis: string;
	item_count: number;
	item_number_prefixes: string;
	/** "verify-broad-key" flags a low-confidence grouping needing human review. */
	flag: string;
	members: VariantMember[];
}

interface GroupsFile {
	summary: Record<string, number>;
	related_families: Record<string, string[]>;
	pages: VariantPage[];
}

const PAGES = (groupsData as GroupsFile).pages;

/** URL-safe slug fragment from a human title. */
function kebab(s: string): string {
	return (s || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// --- Precomputed lookups (module load, once) ---

// Base slug collisions: if a kebab(product_name) is shared by >1 page, every
// colliding page gets its page_id appended so each slug stays unique + stable.
const baseSlugCounts = new Map<string, number>();
for (const p of PAGES) {
	const base = kebab(p.product_name);
	baseSlugCounts.set(base, (baseSlugCounts.get(base) ?? 0) + 1);
}

const slugByPageId = new Map<string, string>();
const pageBySlugMap = new Map<string, VariantPage>();
const pageBySkuMap = new Map<string, VariantPage>();

for (const p of PAGES) {
	const base = kebab(p.product_name);
	const slug = (baseSlugCounts.get(base) ?? 0) > 1 ? `${base}-${p.page_id.toLowerCase()}` : base;
	slugByPageId.set(p.page_id, slug);
	pageBySlugMap.set(slug, p);
	for (const m of p.members) pageBySkuMap.set(m.item_number.toLowerCase(), p);
}

/** All product pages (975). */
export function allPages(): VariantPage[] {
	return PAGES;
}

// TODO: verify grouping — these 7 pages were flagged `verify-broad-key` by the
// grouping analysis as low-confidence (members may not truly belong on one page,
// e.g. G0417 has two identical "50 g" labels, G0190 mixes a bare "7 mm" with
// full-name labels). They render normally; a human should confirm the members.
// See the PR description. Listed here so the set is discoverable in code.
export const FLAGGED_PAGE_IDS: readonly string[] = PAGES.filter(
	(p) => p.flag === "verify-broad-key",
).map((p) => p.page_id);

/** Whether a page's grouping was flagged for human review. */
export function isFlagged(page: VariantPage): boolean {
	return page.flag === "verify-broad-key";
}

/** The canonical URL slug for a page. */
export function slugForPage(page: VariantPage): string {
	return slugByPageId.get(page.page_id) ?? kebab(page.product_name);
}

/** Resolve a page by its canonical slug. */
export function pageBySlug(slug: string): VariantPage | undefined {
	return pageBySlugMap.get(slug.toLowerCase());
}

/** Resolve the page a member SKU belongs to (every online SKU maps to exactly one). */
export function pageForSku(sku: string): VariantPage | undefined {
	return pageBySkuMap.get(sku.toLowerCase());
}

export function isMultiVariant(page: VariantPage): boolean {
	return page.page_type === "multi-variant" && page.members.length > 1;
}

/** The default (first) member of a page. */
export function defaultMember(page: VariantPage): VariantMember {
	return page.members[0];
}

/**
 * Split a combination string on the axis separator " / " ONLY (whitespace on
 * both sides), so a value containing a bare fraction — 3/4", 1/2", 10/pk — is
 * left intact. Splitting on a naked "/" would shred those.
 */
const AXIS_SEP = /\s+\/\s+/;

/** Axis names for a page, e.g. "Material / Size" → ["Material","Size"]. [] for singles. */
export function axisParts(page: VariantPage): string[] {
	if (!page.variant_axis) return [];
	return page.variant_axis.split(AXIS_SEP).map((s) => s.trim()).filter(Boolean);
}

/** A member's option values, aligned to axisParts order. */
export function splitLabel(member: VariantMember): string[] {
	if (!member.variant_label) return [];
	return member.variant_label.split(AXIS_SEP).map((s) => s.trim());
}

/**
 * Whether a set of variant labels actually distinguishes the members. The
 * grouping data sometimes hands us useless labels — all identical (e.g. six
 * flasks all labelled "Borosilicate…") or truncated with an ellipsis. When this
 * returns false, derive labels from the catalog titles instead.
 */
export function labelsAreUsable(labels: string[]): boolean {
	if (labels.some((l) => !l || l.endsWith("..."))) return false;
	return new Set(labels).size === labels.length;
}

/**
 * Derive distinguishing option labels from member catalog titles by stripping
 * the shared leading words (the differing tail — "50 ml", "Polypropylene",
 * "Iris, 4.5\"" — is the option). Falls back to full titles, then null (caller
 * uses the SKU) if the titles can't be told apart.
 */
export function deriveVariantLabels(titles: string[]): string[] | null {
	if (titles.length < 2) return null;
	const words = titles.map((t) => t.trim().split(/\s+/));
	const minLen = Math.min(...words.map((w) => w.length));
	let k = 0;
	while (k < minLen && words.every((w) => w[k] === words[0][k])) k++;
	const clean = (parts: string[]) => parts.join(" ").replace(/^[\s,;:/-]+/, "").trim();
	const tail = words.map((w) => clean(w.slice(k)));
	if (tail.every(Boolean) && new Set(tail).size === tail.length) return tail;
	if (new Set(titles).size === titles.length) return titles.map((t) => t.trim());
	return null;
}
