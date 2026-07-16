import { getDb, getUserByEmail, toSessionUser, upgradePasswordHash } from "@/lib/auth/db";
import { hashPassword, isModernHash, verifyPassword } from "@/lib/auth/password";
import { verifyWordPressPassword } from "@/lib/auth/wp-hash";
import { startSession } from "@/lib/auth/session";

/**
 * POST /api/auth/login  { email, password }
 *
 * Verifies against the modern hash if present, else the migrated WordPress hash
 * ($P$ phpass / $wp$ bcrypt) — and on a successful legacy verify, lazily
 * re-hashes to our modern scheme. Login is blocked for non-approved accounts
 * (the new-user-approve gate carried over from WordPress).
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

	// Verify: prefer the modern hash; fall back to the migrated WordPress hash.
	let ok = false;
	let needsUpgrade = false;
	if (isModernHash(user.password_hash)) {
		ok = await verifyPassword(password, user.password_hash as string);
	} else if (user.wp_password_hash) {
		ok = await verifyWordPressPassword(password, user.wp_password_hash);
		needsUpgrade = ok;
	}

	if (!ok) {
		return Response.json({ error: INVALID }, { status: 401 });
	}

	// Moderation gate: only approved (or legacy null-status) accounts may log in.
	if (user.status === "pending") {
		return Response.json(
			{ error: "Your account is awaiting approval. We'll email you once it's active." },
			{ status: 403 },
		);
	}
	if (user.status === "denied") {
		return Response.json({ error: "This account is not permitted to sign in." }, { status: 403 });
	}

	// Lazy upgrade off the legacy WordPress hash (best-effort; never blocks login).
	if (needsUpgrade) {
		try {
			await upgradePasswordHash(db, user.id, await hashPassword(password), new Date().toISOString());
		} catch {
			/* non-fatal */
		}
	}

	await startSession(user.id, request.headers.get("user-agent"));
	return Response.json({ user: toSessionUser(user) });
}
