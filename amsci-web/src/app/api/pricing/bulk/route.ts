import { getCurrentUser } from "@/lib/auth/session";
import { getProductBySku } from "@/data/products";

/**
 * POST /api/pricing/bulk  { skus: string[] }  →  { prices: { [sku]: number|null } }
 *
 * The listing/grid counterpart to /api/pricing: one call resolves prices for a
 * whole grid of cards, so a page of 60 products is a single request rather than
 * 60. Guests get 401 and no prices — card prices are never in public HTML.
 */
export const dynamic = "force-dynamic";

const MAX_SKUS = 200;

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

	const prices: Record<string, number | null> = {};
	await Promise.all(
		skus.map(async (sku) => {
			// TODO(tiers): resolvePrice(sku, user.priceLevel, qty) — live NetSuite.
			const product = await getProductBySku(sku);
			prices[sku] = product?.price ?? null;
		}),
	);

	return Response.json({ authenticated: true, prices }, { headers: { "Cache-Control": "private, no-store" } });
}
