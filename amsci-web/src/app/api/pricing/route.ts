import { getCurrentUser } from "@/lib/auth/session";
import { resolvePrices } from "@/lib/pricing";

/**
 * GET /api/pricing?sku=SKU — the price a logged-in customer should see.
 *
 * Guests get 401 with no price (prices are never baked into public pages).
 * Signed-in customers get their negotiated tier price, resolved from the price
 * matrix synced into D1, falling back to base for items with no row at their
 * level.
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
	// The level comes from the SESSION, never the request — a client-supplied
	// level would let anyone ask for the deepest tier.
	const prices = await resolvePrices([sku], user.priceLevel);
	// The resolved PRICE goes to the browser; the tier that produced it does not.
	// Which negotiated level an account sits on is internal commercial
	// information, and the number is meaningless to the customer.
	return Response.json(
		{
			authenticated: true,
			sku,
			price: prices[sku] ?? null,
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
