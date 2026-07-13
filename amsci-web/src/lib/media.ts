/**
 * NetSuite media helpers.
 *
 * NetSuite serves product images from `*.netsuite.com` media URLs that block
 * cross-origin hotlinking (a browser `<img>` on our origin sends a Referer and
 * gets refused). We route images through our own server (`/api/media`), which
 * fetches them server-side with no cross-origin referrer — fixing the block, and
 * giving us a single place to cache/optimize catalog imagery later.
 */
/** Only proxy NetSuite media hosts — prevents this from becoming an open proxy (SSRF). */
export function isAllowedMediaHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	return h === "netsuite.com" || h.endsWith(".netsuite.com");
}

/**
 * Build a same-origin proxy URL for a NetSuite media asset. Passes the ORIGINAL
 * url (keeping its scheme — some NetSuite media hosts only serve http); the proxy
 * fetches it server-side and re-serves over our https origin, so the browser
 * never sees mixed content. Returns null when there's no usable/allowed source.
 */
export function mediaProxyUrl(originalUrl: string | null | undefined): string | null {
	const trimmed = originalUrl?.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(trimmed);
		const okProtocol = url.protocol === "https:" || url.protocol === "http:";
		if (!okProtocol || !isAllowedMediaHost(url.hostname)) return null;
	} catch {
		return null;
	}
	return `/api/media?src=${encodeURIComponent(trimmed)}`;
}
