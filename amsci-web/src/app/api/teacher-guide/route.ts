import { teacherGuideUrl } from "@/lib/teacher-guides";

/**
 * Teacher's-guide PDF proxy.
 *
 * `GET /api/teacher-guide?sku=<sku>&doc=guide|handout&dl=1`
 *
 * Streams the product's teacher's-guide (or handout) PDF from NetSuite's File
 * Cabinet through our own origin. Keyed by SKU → a pre-validated URL from
 * src/data/teacher_guides.json, so it can NOT be an open proxy (only known SKUs
 * resolve, only to known public PDFs). `dl=1` forces a download (attachment);
 * otherwise the PDF opens inline (View). Fetches with a browser UA because the
 * File Cabinet WAF blocks non-browser agents from datacenter IPs (same reason as
 * /api/media).
 */
export const dynamic = "force-dynamic";

const BROWSER_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Try the given scheme first, then the other (some legacy media hosts are http-only). */
function candidateUrls(raw: string): string[] {
	const u = new URL(raw);
	const rest = `${u.host}${u.pathname}${u.search}`;
	const https = `https://${rest}`;
	const http = `http://${rest}`;
	return u.protocol === "http:" ? [http, https] : [https, http];
}

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const sku = url.searchParams.get("sku") ?? "";
	const doc = url.searchParams.get("doc") === "handout" ? "handout" : "guide";
	const download = url.searchParams.get("dl") === "1";

	const src = teacherGuideUrl(sku, doc);
	if (!src) return new Response("Not found", { status: 404 });

	let upstream: Response | null = null;
	for (const candidate of candidateUrls(src)) {
		try {
			const res = await fetch(candidate, {
				headers: { "User-Agent": BROWSER_UA, Accept: "application/pdf,*/*" },
				redirect: "follow",
			});
			if (res.ok && (res.headers.get("content-type") ?? "").toLowerCase().includes("pdf")) {
				upstream = res;
				break;
			}
		} catch {
			/* try next candidate */
		}
	}
	if (!upstream) return new Response("Guide temporarily unavailable", { status: 502 });

	const suffix = doc === "handout" ? "handout" : "teachers-guide";
	const filename = `${sku.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-${suffix}.pdf`;
	return new Response(upstream.body, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
			"Cache-Control": "public, max-age=3600, s-maxage=86400",
		},
	});
}
