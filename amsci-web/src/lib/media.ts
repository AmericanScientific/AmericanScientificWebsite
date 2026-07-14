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
 * base64url-encode a string (RFC 4648 §5): the alphabet is `A–Z a–z 0–9 - _`
 * only — no `%`, `&`, `?`, `=`. We use this for the proxy's `src` param because
 * the Cloudflare/OpenNext request layer decodes the query string once before our
 * route sees it; percent-encoding a full URL (with its own `?a=b&c=d`) gets its
 * `%26` turned back into `&` and split into stray params, dropping NetSuite's
 * required `c=`/`h=`. base64url has nothing for that pass to mangle.
 */
export function encodeMediaSrc(url: string): string {
	const bytes = new TextEncoder().encode(url);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Inverse of {@link encodeMediaSrc}. Throws on malformed input. */
export function decodeMediaSrc(token: string): string {
	let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
	// Re-add the padding stripped by encodeMediaSrc — atob requires it.
	b64 += "=".repeat((4 - (b64.length % 4)) % 4);
	const bin = atob(b64);
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
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
	return `/api/media?src=${encodeMediaSrc(trimmed)}`;
}
