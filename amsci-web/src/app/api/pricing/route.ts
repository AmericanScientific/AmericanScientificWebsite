import { getCurrentUser } from "@/lib/auth/session";
import { resolvePrices } from "@/lib/pricing";

/**
 * GET /api/pricing?sku=SKU — the price a logged-in customer should see.
 *
 * Guests get 401 with no price (prices are never baked into public pages).
 * For now every logged-in user is on base pricing (level 1), so this returns
 * the catalog base price. This is the single seam where real tiered/qty
 * resolution — resolvePrice(sku, user.priceLevel, qty) against NetSuite — will
 * plug in later without touching the UI.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const user = await getCurrentUser();
	if (!user) {
		return Response.json(
			{ authenticated: false },
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	const sku = new URL(request.url).searchParams.get("sku");
	if (!sku) {
		return Response.json({ error: "sku is required" }, { status: 400 });
	}

	// One indexed D1 lookup (not a full-catalog scan), and it resolves ANY SKU —
	// including variant members that fall out of the collapsed product map.
	// TODO(tiers): fold in user.priceLevel/qty → live NetSuite resolvePrice.
	const prices = await resolvePrices([sku]);
	return Response.json(
		{
			authenticated: true,
			sku,
			price: prices[sku] ?? null,
			priceLevel: user.priceLevel,
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
