import { getDb, getUserByEmail } from "@/lib/auth/db";
import { createPasswordToken } from "@/lib/auth/tokens";
import { devLinksEnabled, sendPasswordEmail, siteBaseUrl } from "@/lib/auth/email";

/**
 * POST /api/auth/request-setup  { email }
 *
 * Emails a one-time link to set (migrated first-login) or reset a password.
 * Always returns a generic success so the endpoint can't be used to enumerate
 * which emails have accounts. In dev (no EMAIL binding) it returns `devLink` so
 * the flow is testable without a mail provider — this never happens in prod.
 */
export const dynamic = "force-dynamic";

const GENERIC = { ok: true, message: "If that email has an account, we've sent a link to set your password." };

export async function POST(request: Request): Promise<Response> {
	let body: { email?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	if (!email) return Response.json({ error: "Email is required." }, { status: 400 });

	const db = getDb();
	const user = await getUserByEmail(db, email);

	// Denied accounts and unknown emails get the same generic response (no signal).
	if (!user || user.status === "denied") {
		return Response.json(GENERIC);
	}

	const purpose = user.must_change_password === 1 || !user.password_hash ? "setup" : "reset";
	const token = await createPasswordToken(db, user.id, purpose);
	const link = `${siteBaseUrl(request)}/set-password?token=${token}`;
	await sendPasswordEmail(email, user.display_name || "", link, purpose);

	// Only surface the link when explicitly enabled for local testing (never prod).
	return Response.json(devLinksEnabled() ? { ...GENERIC, devLink: link } : GENERIC);
}
