import { NextResponse } from "next/server";
import { NetSuiteClient, hasNetSuiteConfig, NetSuiteError } from "@/lib/netsuite";

/**
 * TEMPORARY diagnostic route — verifies the NetSuite TBA handshake end-to-end.
 *
 * Runs the canonical web-catalog count (`isonline='T' AND isinactive='F'`,
 * CLAUDE.md §3) and returns it. Expected live result: ~1,306.
 *
 * ⚠️ Remove or put behind auth before launch — it triggers a NetSuite call and
 * should not be a public, unauthenticated endpoint (CLAUDE.md §6). Safe for now
 * because the whole preview site sits behind Cloudflare Access (§7). It returns
 * only a count — never secrets.
 */
export const dynamic = "force-dynamic";

export async function GET() {
	if (!hasNetSuiteConfig()) {
		return NextResponse.json(
			{ ok: false, error: "NetSuite secrets not configured (check .dev.vars / wrangler secrets)." },
			{ status: 503 },
		);
	}

	try {
		const client = NetSuiteClient.fromEnv();
		const started = Date.now();
		const webCatalogCount = await client.webCatalogCount();
		return NextResponse.json({
			ok: true,
			webCatalogCount,
			ms: Date.now() - started,
			note: "Canonical population: item WHERE isonline='T' AND isinactive='F'.",
		});
	} catch (err) {
		const status = err instanceof NetSuiteError ? err.status : 500;
		return NextResponse.json(
			{ ok: false, error: err instanceof Error ? err.message : String(err) },
			{ status: status >= 400 ? status : 502 },
		);
	}
}
