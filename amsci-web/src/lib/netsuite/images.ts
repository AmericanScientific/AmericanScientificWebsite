/**
 * NetSuite product-image resolver.
 *
 * Every product image resolves through the File Cabinet by file id and is served
 * from the account's PUBLIC media host — files flagged "Available Without Login"
 * expose a long-secure-hash URL at `<account>.app.netsuite.com/core/media/...`
 * that loads with no session. We do NOT use `custitem_imageurltext`: it mostly
 * holds login-gated `shopping.na1`/`system.na1` URLs (dead hosts) — verified stale.
 *
 * Two image sources, both resolved the SAME way (file id → File Cabinet `file.url`):
 *  - PRIMARY: `item.storedisplayimage` is already a File Cabinet file id.
 *  - GALLERY: `custitemgalleryimage1/2/3` are URL-TEXT fields; parse the `id=`
 *    query param out of each to get the file id, then resolve through `file`.
 *
 * Server-side only (needs the signed SuiteQL client).
 */
import type { NetSuiteClient } from "./client";

/**
 * Public File Cabinet media host for an account, e.g. "https://4093468.app.netsuite.com".
 * Sandbox accounts turn '_' into '-' (same normalization as the REST host).
 */
export function mediaHost(account: string): string {
	const a = account.trim().toLowerCase().replace(/_/g, "-");
	return `https://${a}.app.netsuite.com`;
}

/** Prefix a site-relative File Cabinet `file.url` with the account media host. */
export function absoluteMediaUrl(fileUrl: string, account: string): string {
	return mediaHost(account) + fileUrl;
}

/**
 * Extract the File Cabinet file id from a media URL / URL-text field (the `id=`
 * query param), e.g. ".../media.nl?id=446150&c=..." → "446150". Null if absent.
 */
export function parseFileId(urlText: string | null | undefined): string | null {
	if (!urlText) return null;
	const match = /[?&]id=(\d+)/i.exec(String(urlText));
	return match ? match[1] : null;
}

/**
 * Resolve a set of File Cabinet file ids to absolute public media URLs in as few
 * queries as possible. Batches the `file` table with `WHERE id IN (...)`
 * (chunkSize per query) — never one lookup per item.
 *
 * Returns a Map keyed by string file id. Ids with no matching/empty file row are
 * simply absent from the map (caller falls back to a placeholder).
 */
export async function buildFileUrlMap(
	client: NetSuiteClient,
	fileIds: Iterable<string | number>,
	account: string,
	chunkSize = 200,
): Promise<Map<string, string>> {
	const ids = [...new Set([...fileIds].map(String).map((s) => s.trim()).filter((s) => /^\d+$/.test(s)))];
	const map = new Map<string, string>();

	for (let i = 0; i < ids.length; i += chunkSize) {
		const chunk = ids.slice(i, i + chunkSize);
		const page = await client.suiteql<{ id: string | number; url: string | null }>(
			`SELECT id, url FROM file WHERE id IN (${chunk.join(",")})`,
			{ limit: chunkSize },
		);
		for (const row of page.items) {
			const url = (row.url ?? "").toString().trim();
			if (url) map.set(String(row.id), absoluteMediaUrl(url, account));
		}
	}
	return map;
}
