import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getCurrentUser } from "@/lib/auth/session";
import { claimPendingCart } from "@/lib/cart/recovery";

/**
 * GET /api/cart/pending — a cart rescued from the old WooCommerce site, if this
 * customer has one waiting.
 *
 * Called once per page load by the cart provider. A customer who lost their
 * cart in the cutover signs in and it is simply back; there is no link to click
 * and nothing is emailed. Returns `{claimed:false}` for guests and for the
 * overwhelming majority of loads where nothing is waiting, and the row is
 * stamped on the way out so it fires exactly once per customer.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
	const headers = { "Cache-Control": "private, no-store" };

	const user = await getCurrentUser();
	// Not an error: most callers are signed out. Answer quietly.
	if (!user) return Response.json({ claimed: false }, { headers });

	let db: D1Database | undefined;
	try {
		db = (getCloudflareContext().env as { DB?: D1Database }).DB;
	} catch {
		// No Cloudflare context (plain `next dev`): nothing to claim.
	}
	if (!db) return Response.json({ claimed: false }, { headers });

	try {
		const result = await claimPendingCart(db, user.id, user.email);
		return Response.json(result, { headers });
	} catch (err) {
		// Most likely cause: migration 0008 not applied in this environment. This
		// runs on every page load, so it must never surface as a 500 to the
		// browser or break the cart for someone who has no pending cart anyway.
		console.error("[cart/pending] lookup failed:", err instanceof Error ? err.message : err);
		return Response.json({ claimed: false }, { headers });
	}
}
