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
