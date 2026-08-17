import { deleteOtherSessions, getDb, getUserById } from "@/lib/auth/db";
import { setUserPassword } from "@/lib/auth/db";
import { hashPassword, isModernHash, verifyPassword } from "@/lib/auth/password";
import { currentSessionId, getCurrentUser } from "@/lib/auth/session";

/**
 * POST /api/auth/change-password  { currentPassword, newPassword }
 *
 * Self-service password change for a signed-in customer. The existing password is
 * required: a session cookie alone is not proof of identity, and without this
 * check anyone with a borrowed logged-in browser could lock the real owner out.
 *
 * Distinct from /api/auth/set-password, which redeems an emailed token for
 * someone who by definition cannot supply a current password.
 */
export const dynamic = "force-dynamic";

const MIN_LEN = 10; // matches set-password
const MAX_LEN = 200;

export async function POST(request: Request): Promise<Response> {
	const sessionUser = await getCurrentUser();
	if (!sessionUser) return Response.json({ error: "Please sign in." }, { status: 401 });

	let body: { currentPassword?: unknown; newPassword?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
	const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

	if (!currentPassword || !newPassword) {
		return Response.json({ error: "Enter your current password and a new one." }, { status: 400 });
	}
	if (newPassword.length < MIN_LEN) {
		return Response.json({ error: `Your new password must be at least ${MIN_LEN} characters.` }, { status: 400 });
	}
	if (newPassword.length > MAX_LEN) {
		return Response.json({ error: "That password is too long." }, { status: 400 });
	}
	if (newPassword === currentPassword) {
		return Response.json({ error: "Your new password must be different from your current one." }, { status: 400 });
	}

	const db = getDb();
	const user = await getUserById(db, sessionUser.id);
	if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

	// An account with no modern hash has never completed setup, so there is no
	// current password to verify. Send them through the emailed-link flow rather
	// than letting them set one from a session alone.
	if (!isModernHash(user.password_hash)) {
		return Response.json(
			{
				error: "Set your password using the link we email you.",
				mustSetup: true,
			},
			{ status: 409 },
		);
	}

	if (!(await verifyPassword(currentPassword, user.password_hash as string))) {
		return Response.json({ error: "That current password is not correct." }, { status: 401 });
	}

	await setUserPassword(db, user.id, await hashPassword(newPassword), new Date().toISOString());

	// Revoke other devices, keeping this one signed in. Best-effort: the password
	// is already changed, so failing here must not report failure to the caller.
	let revoked = 0;
	try {
		revoked = await deleteOtherSessions(db, user.id, await currentSessionId());
	} catch (err) {
		console.warn(`[auth/change-password] could not revoke other sessions for user=${user.id}:`, err);
	}

	return Response.json({ ok: true, otherSessionsRevoked: revoked });
}
