import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site";

/**
 * Served at /robots.txt.
 *
 * Everything a customer browses is crawlable — the catalog is the whole point of
 * the SEO work. What's excluded is either meaningless to a crawler (account and
 * admin pages, which already carry `noindex`) or an infinite URL space that
 * wastes crawl budget without producing a rankable page (`/search?q=…`, and the
 * `?sku=` variant params the product pages deliberately keep out of canonicals).
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				// `/register` is deliberately NOT here. It's the account-request form —
				// a prospective distributor searching for a wholesale account should
				// be able to find it, so it stays crawlable like any other public page.
				disallow: [
					"/api/",
					"/account",
					"/admin",
					"/cart",
					"/login",
					"/set-password",
					"/search",
					"/*?sku=",
				],
			},
		],
		sitemap: `${SITE_ORIGIN}/sitemap.xml`,
		host: SITE_ORIGIN,
	};
}
