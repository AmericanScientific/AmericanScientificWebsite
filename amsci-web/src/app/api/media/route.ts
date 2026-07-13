import { isAllowedMediaHost } from "@/lib/media";

/**
 * Image proxy for NetSuite media.
 *
 * Fetches a NetSuite `*.netsuite.com` media URL server-side (no cross-origin
 * Referer, so hotlink protection doesn't kick in) and streams it back from our
 * own origin. Tries https and http (some legacy media hosts only serve http);
 * server-side has no mixed-content constraint, and the browser only ever talks
 * to our https origin. Host is allowlisted so this can't be an open proxy.
 *
 * `GET /api/media?src=<netsuite media url>`
 */
export const dynamic = "force-dynamic";

/** Ordered upstream candidates: try the given scheme first, then the other. */
function candidateUrls(raw: string): string[] {
	const u = new URL(raw);
	const rest = `${u.host}${u.pathname}${u.search}`;
	const https = `https://${rest}`;
	const http = `http://${rest}`;
	return u.protocol === "http:" ? [http, https] : [https, http];
}

async function tryFetch(url: string): Promise<Response | null> {
	try {
		const res = await fetch(url, {
			headers: { Accept: "image/*", "User-Agent": "amsci-web/image-proxy" },
			redirect: "follow",
		});
		return res;
	} catch {
		return null;
	}
}

export async function GET(request: Request): Promise<Response> {
	const src = new URL(request.url).searchParams.get("src");
	if (!src) return new Response("Missing src", { status: 400 });

	let target: URL;
	try {
		target = new URL(src);
	} catch {
		return new Response("Invalid src", { status: 400 });
	}
	if (
		(target.protocol !== "https:" && target.protocol !== "http:") ||
		!isAllowedMediaHost(target.hostname)
	) {
		return new Response("Host not allowed", { status: 400 });
	}

	let upstream: Response | null = null;
	for (const url of candidateUrls(src)) {
		const res = await tryFetch(url);
		if (res?.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) {
			upstream = res;
			break;
		}
		// Keep the last non-null response for a more useful error if all fail.
		if (res && !upstream) upstream = res;
	}

	if (!upstream) {
		return new Response("Upstream fetch failed (all schemes)", { status: 502 });
	}
	const contentType = upstream.headers.get("content-type") ?? "";
	if (!upstream.ok) {
		return new Response(`Upstream responded ${upstream.status}`, { status: 502 });
	}
	if (!contentType.startsWith("image/")) {
		return new Response(`Upstream returned ${contentType || "no content-type"}, not an image`, {
			status: 415,
		});
	}

	return new Response(upstream.body, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}
