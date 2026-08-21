import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redeemRecoveredCart } from "@/lib/cart/recovery";

/**
 * GET /api/cart/recover?token=… — hand back a cart rescued from the old site.
 *
 * Deliberately NOT behind a login. These carts belong to customers migrated
 * from WooCommerce, and a good number still have to set a password on the new
 * site; requiring a session first would put the thing they want on the far side
 * of the exact wall we are trying to help them past. The token is 256 bits of
 * CSPRNG, stored only as its SHA-256, expiring, and it grants nothing beyond a
 * list of products the customer themselves put in a cart.
 *
 * Returns the items even when some are unavailable, so the page can restore
 * what exists and tell the customer plainly what it could not.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const token = new URL(request.url).searchParams.get("token") ?? "";
	if (!token) {
		return Response.json({ ok: false, reason: "empty" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
	}

	let db: D1Database | undefined;
	try {
		db = (getCloudflareContext().env as { DB?: D1Database }).DB;
	} catch {
		// No Cloudflare context (plain `next dev`). Nothing to look up.
	}
	if (!db) {
		console.error("[cart/recover] no D1 binding available");
		return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
	}

	const result = await redeemRecoveredCart(db, token);
	if (!result.ok) {
		// 404 for every failure reason. The precise reason is returned for the
		// page to render a useful message, but the status stays uniform so the
		// endpoint can't be used to probe which tokens exist.
		return Response.json({ ok: false, reason: result.reason }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
	}

	return Response.json(
		{
			ok: true,
			items: result.cart.items,
			unavailable: result.cart.unavailable,
			email: result.cart.email,
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
