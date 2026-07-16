import { getDb, getUserById, toSessionUser } from "@/lib/auth/db";
import { setUserPassword } from "@/lib/auth/db";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordToken } from "@/lib/auth/tokens";
import { startSession } from "@/lib/auth/session";

/**
 * POST /api/auth/set-password  { token, password }
 *
 * Redeems a one-time setup/reset token, stores the new password (PBKDF2),
 * permanently clears must_change_password, and logs the user in. This is the
 * only way a migrated account gets a usable password.
 */
export const dynamic = "force-dynamic";

const MIN_LEN = 10;

export async function POST(request: Request): Promise<Response> {
	let body: { token?: unknown; password?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const token = typeof body.token === "string" ? body.token : "";
	const password = typeof body.password === "string" ? body.password : "";
	if (!token) return Response.json({ error: "Missing token." }, { status: 400 });
	if (password.length < MIN_LEN) {
		return Response.json({ error: `Password must be at least ${MIN_LEN} characters.` }, { status: 400 });
	}
	if (password.length > 200) {
		return Response.json({ error: "Password is too long." }, { status: 400 });
	}

	const db = getDb();
	try {
		const consumed = await consumePasswordToken(db, token);
		if (!consumed.ok) {
			const msg =
				consumed.reason === "used"
					? "This link has already been used. Please request a new one."
					: consumed.reason === "expired"
						? "This link has expired. Please request a new one."
						: "This link is invalid. Please request a new one.";
			console.log(`[auth/set-password] token rejected: ${consumed.reason} (len=${token.length})`);
			return Response.json({ error: msg, reason: consumed.reason }, { status: 400 });
		}
		console.log(`[auth/set-password] token ok, user=${consumed.userId}`);

		const user = await getUserById(db, consumed.userId);
		if (!user) {
			console.error(`[auth/set-password] getUserById returned null for id=${consumed.userId}`);
			return Response.json({ error: "Account not found." }, { status: 400 });
		}

		await setUserPassword(db, user.id, await hashPassword(password), new Date().toISOString());
		console.log(`[auth/set-password] password set for user=${user.id}, status=${user.status}`);

		// Denied/pending accounts get a password but no session (still gated).
		if (user.status === "pending" || user.status === "denied") {
			return Response.json({ ok: true, loggedIn: false, status: user.status });
		}

		await startSession(user.id, request.headers.get("user-agent"));
		return Response.json({ ok: true, loggedIn: true, user: toSessionUser({ ...user, must_change_password: 0 }) });
	} catch (err) {
		// A crash here after consuming the token would strand the user (token used,
		// password unset) — exactly the reported symptom. Log the real error.
		console.error(`[auth/set-password] unhandled error:`, err instanceof Error ? err.stack || err.message : err);
		return Response.json({ error: "Something went wrong setting your password. Please request a new link." }, { status: 500 });
	}
}
