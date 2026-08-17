import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";
import { getTopLevelCategories } from "@/data/categories";
import { allPages, slugForPage } from "@/data/variant-groups";
import { allPhywe } from "@/data/phywe";

/**
 * Served at /sitemap.xml.
 *
 * The redirect map in `src/data/redirects.json` preserves ranking on the old
 * WooCommerce URLs Google already knows. This is the other half of that work:
 * how it discovers the new ones. Roughly 4,250 URLs — comfortably inside the
 * 50,000-URL / 50 MB limit for a single sitemap, so no index file is needed.
 *
 * Product URLs come from `allPages()`, the same source as the product route's
 * `generateStaticParams`, so the sitemap can never list a page that doesn't
 * build. Canonical form carries no `?sku=` — variant params must not index as
 * duplicates (see the product page's `pagePath`).
 *
 * No `lastModified`: the catalog's per-item modified date isn't in the static
 * data this runs against, and stamping build time on every entry would tell
 * Google the entire catalog changed on every deploy — worse than omitting it.
 */
export const revalidate = 86400; // daily

export default function sitemap(): MetadataRoute.Sitemap {
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
	const products: MetadataRoute.Sitemap = allPages().map((page) => ({
		url: `${SITE_ORIGIN}/product/${slugForPage(page)}`,
		changeFrequency: "weekly",
		priority: 0.8,
	}));

	const phywe: MetadataRoute.Sitemap = allPhywe().map((item) => ({
		url: `${SITE_ORIGIN}/phywe/products/${encodeURIComponent(item.articleNo)}`,
		changeFrequency: "monthly",
		priority: 0.4,
	}));

	return [...staticPages, ...categories, ...products, ...phywe];
}
