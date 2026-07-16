import { getCurrentUser } from "@/lib/auth/session";
import { resolvePrices } from "@/lib/pricing";

/**
 * POST /api/pricing/bulk  { skus: string[] }  →  { prices: { [sku]: number|null } }
 *
 * The listing/grid counterpart to /api/pricing: one call resolves prices for a
 * whole grid of cards, so a page of 60 products is a single request rather than
 * 60. Guests get 401 and no prices — card prices are never in public HTML.
 */
export const dynamic = "force-dynamic";

// Sanity ceiling only (abuse guard). getPricesBySku chunks the D1 query, so this
// no longer silently drops a normal full-catalog grid. The client also chunks.
const MAX_SKUS = 2000;

export async function POST(request: Request): Promise<Response> {
	const user = await getCurrentUser();
	if (!user) {
		return Response.json(
			{ authenticated: false },
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	let body: { skus?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const skus = Array.isArray(body.skus)
		? body.skus.filter((s): s is string => typeof s === "string").slice(0, MAX_SKUS)
		: [];

	// One indexed D1 query for all requested SKUs (not a full-catalog scan).
	// TODO(tiers): fold in user.priceLevel/qty → live NetSuite resolvePrice.
	const prices = await resolvePrices(skus);

	return Response.json({ authenticated: true, prices }, { headers: { "Cache-Control": "private, no-store" } });
}
