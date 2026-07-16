import { getCurrentUser } from "@/lib/auth/session";
import { getProductBySku } from "@/data/products";

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

	const product = await getProductBySku(sku);
	if (!product) {
		return Response.json({ error: "Unknown SKU" }, { status: 404 });
	}

	// TODO(tiers): replace with resolvePrice(sku, user.priceLevel, qty) — live NetSuite.
	return Response.json(
		{
			authenticated: true,
			sku,
			price: product.price ?? null,
			priceLevel: user.priceLevel,
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
