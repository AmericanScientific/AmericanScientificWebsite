import { endSession } from "@/lib/auth/session";

/** POST /api/auth/logout — destroy the current session + clear the cookie. */
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
	await endSession();
	return Response.json({ ok: true });
}
