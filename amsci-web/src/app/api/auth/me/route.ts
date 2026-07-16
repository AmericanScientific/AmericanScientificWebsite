import { getCurrentUser } from "@/lib/auth/session";

/** GET /api/auth/me — the current user (or {user:null}). Used by client gating. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
	const user = await getCurrentUser();
	return Response.json(
		{ user },
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
