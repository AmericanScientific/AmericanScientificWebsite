import type { NextConfig } from "next";
import redirectMap from "./src/data/redirects.json";

/**
 * SEO redirects for the WooCommerce → rebuild cutover.
 *
 * The rebuild keeps the old URL scheme (/product/{slug}, /product-category/...),
 * so most old URLs resolve unchanged. These entries cover the ones that DID move
 * — almost entirely variant consolidation (many old per-SKU product URLs now
 * point at one shared page). Generated from product_groups.json store names diffed
 * against the old sitemap; see src/data/redirects.json. Sources are guaranteed not
 * to collide with any live page slug, so no valid page is shadowed. Genuinely
 * discontinued products are intentionally left to 404.
 */
const seoRedirects = [...redirectMap.products, ...redirectMap.categories].map((r) => ({
	source: r.from,
	destination: r.to,
	permanent: true,
}));

const nextConfig: NextConfig = {
	async redirects() {
		return seoRedirects;
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
