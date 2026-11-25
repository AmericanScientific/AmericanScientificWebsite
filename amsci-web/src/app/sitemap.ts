import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";
import { getTopLevelCategories } from "@/data/categories";
import { allPages, pageForSku, slugForPage } from "@/data/variant-groups";
import { getAllProducts } from "@/data/products";

/**
 * Served at /sitemap.xml.
 *
 * The redirect map in `src/data/redirects.json` preserves ranking on the old
 * WooCommerce URLs Google already knows. This is the other half of that work:
 * how it discovers the new ones. Roughly 950 URLs — comfortably inside the
 * 50,000-URL / 50 MB limit for a single sitemap, so no index file is needed.
 *
 * Product URLs come from the LIVE catalog (D1): every grouped page with at least
 * one online member, plus every online SKU that isn't in product_groups.json
 * (served at /product/<sku>). Canonical form carries no `?sku=` — variant
 * params must not index as duplicates (see the product page's `pagePath`).
 *
 * PHYWE product pages are noindex and deliberately not listed.
 *
 * No `lastModified`: the catalog's per-item modified date isn't in the static
 * data this runs against, and stamping build time on every entry would tell
 * Google the entire catalog changed on every deploy — worse than omitting it.
 */
// Per request: a prerendered copy would be built from the catalog.json seed and
// miss everything synced since. Crawlers fetch this rarely; one D1 read is cheap.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const staticPages: MetadataRoute.Sitemap = [
		{ url: SITE_ORIGIN, changeFrequency: "weekly", priority: 1 },
		{ url: `${SITE_ORIGIN}/products`, changeFrequency: "daily", priority: 0.9 },
		{ url: `${SITE_ORIGIN}/resources`, changeFrequency: "monthly", priority: 0.6 },
		{ url: `${SITE_ORIGIN}/phywe`, changeFrequency: "monthly", priority: 0.6 },
		{ url: `${SITE_ORIGIN}/phywe/products`, changeFrequency: "weekly", priority: 0.6 },
	];

	// Category tree: top-level pages plus every child. `external` parents link
	// off-site (they have no page of ours to crawl).
	const categories: MetadataRoute.Sitemap = getTopLevelCategories()
		.filter((parent) => !parent.external)
		.flatMap((parent) => [
			{
				url: `${SITE_ORIGIN}/product-category/${parent.slug}`,
				changeFrequency: "weekly" as const,
				priority: 0.8,
			},
			...(parent.children ?? []).map((child) => ({
				url: `${SITE_ORIGIN}/product-category/${parent.slug}/${child.slug}`,
				changeFrequency: "weekly" as const,
				priority: 0.7,
			})),
		]);

	// One entry per product PAGE, not per SKU — variant members share a page.
	const live = await getAllProducts();
	const liveSkus = new Set(live.map((p) => p.sku.toLowerCase()));
	const grouped = allPages()
		.filter((page) => page.members.some((m) => liveSkus.has(m.item_number.toLowerCase())))
		.map((page) => slugForPage(page));
	const ungrouped = live.filter((p) => !pageForSku(p.sku)).map((p) => encodeURIComponent(p.sku.toLowerCase()));
	const products: MetadataRoute.Sitemap = [...grouped, ...ungrouped].map((slug) => ({
		url: `${SITE_ORIGIN}/product/${slug}`,
		changeFrequency: "weekly",
		priority: 0.8,
	}));

	return [...staticPages, ...categories, ...products];
}
