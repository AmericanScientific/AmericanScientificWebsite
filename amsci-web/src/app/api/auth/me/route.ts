import { getCurrentUser } from "@/lib/auth/session";

/** GET /api/auth/me — the current user (or {user:null}). Used by client gating. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
	const user = await getCurrentUser();
	/*
	 * `priceLevel` is stripped rather than passed through. It is internal
	 * commercial information, and hiding the tier in the UI is pointless while any
	 * signed-in customer can read it straight off this endpoint. Server code that
	 * needs it (price resolution, order write-back) reads the session directly.
	 *
	 * Removed by name so that a field added to SessionUser later is exposed by a
	 * deliberate decision rather than by default.
	 */
	const safeUser = user ? (({ priceLevel: _tier, ...rest }) => rest)(user) : null;
	return Response.json(
		{ user: safeUser },
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
