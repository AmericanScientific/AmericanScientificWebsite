import { getDb, getUserByEmail, toSessionUser } from "@/lib/auth/db";
import { isModernHash, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";

/**
 * POST /api/auth/login  { email, password }
 *
 * Only the modern password (set via the email setup/reset flow) is accepted —
 * migrated WordPress passwords are NOT honored. A migrated account (or any
 * account flagged must_change_password) is told to set a password first
 * (`mustSetup: true`), so the client can send them to the email setup flow.
 */
export const dynamic = "force-dynamic";

const INVALID = "Invalid email or password.";

export async function POST(request: Request): Promise<Response> {
	let body: { email?: unknown; password?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";
	if (!email || !password) {
		return Response.json({ error: "Email and password are required." }, { status: 400 });
	}

	const db = getDb();
	const user = await getUserByEmail(db, email);
	if (!user) {
		return Response.json({ error: INVALID }, { status: 401 });
	}

	// Moderation gate (carried over from WordPress new-user-approve).
	if (user.status === "pending") {
		return Response.json(
			{ error: "Your account is awaiting approval. We'll email you once it's active." },
			{ status: 403 },
		);
	}
	if (user.status === "denied") {
		return Response.json({ error: "This account is not permitted to sign in." }, { status: 403 });
	}

	// Migrated / must-reset accounts have no usable password yet → route to setup.
	if (user.must_change_password === 1 || !isModernHash(user.password_hash)) {
		return Response.json(
			{
				mustSetup: true,
				error: "Please set a new password for the new site. Check your email for a setup link, or request one.",
			},
			{ status: 409 },
		);
	}

	const ok = await verifyPassword(password, user.password_hash as string);
	if (!ok) {
		return Response.json({ error: INVALID }, { status: 401 });
	}

	await startSession(user.id, request.headers.get("user-agent"));
	return Response.json({ user: toSessionUser(user) });
}
