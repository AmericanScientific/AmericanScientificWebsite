import "server-only";

/**
 * The canonical public origin, as a build-time constant.
 *
 * This is deliberately NOT the `SITE_URL` Worker var. That var is read at
 * request time via `getCloudflareContext()` and is the right source for email
 * links, which are generated per request. Next's static metadata — sitemap,
 * robots, `metadataBase` — is evaluated where no Cloudflare binding exists, so
 * it needs a literal.
 *
 * Keep this in sync with `SITE_URL` in wrangler.jsonc. They describe the same
 * thing for two different evaluation contexts; a mismatch means canonical tags
 * and sitemap entries disagree with the links customers receive by email.
 */
export const SITE_ORIGIN = "https://www.american-scientific.com";

/** Absolute URL for a site-relative path (`/products` → `https://…/products`). */
export function absoluteUrl(path: string): string {
	return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_TITLE = "American Scientific — Wholesale STEM & Laboratory Supply";

export const SITE_DESCRIPTION =
	"American Scientific is a wholesale distributor, manufacturer, and exporter of scientific and STEM educational products for schools, districts, and institutions.";

/** Site-wide Open Graph defaults (the root layout's). */
export const SITE_OPEN_GRAPH = {
	type: "website",
	siteName: "American Scientific",
	title: SITE_TITLE,
	description: SITE_DESCRIPTION,
} as const;

/**
 * Canonical + og:url for a page, kept identical. A page that sets `openGraph`
 * replaces the layout's whole object, so the site defaults are spread back in.
 */
export function canonicalMeta(path: string) {
	return { alternates: { canonical: path }, openGraph: { ...SITE_OPEN_GRAPH, url: path } };
}

/**
 * Google Search Console HTML-tag verification code (the `content` value only).
 * Empty = no tag rendered. Paste the code from Search Console here.
 */
export const GOOGLE_SITE_VERIFICATION = "";
