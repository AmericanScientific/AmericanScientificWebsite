import { createPendingUser, getDb, getUserByEmail } from "@/lib/auth/db";
import { hashPassword } from "@/lib/auth/password";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { sendNewAccountEmail } from "@/lib/auth/email";

/**
 * POST /api/auth/register — public self-service signup.
 *
 * Creates a PENDING account (blocked from login until an admin approves) with the
 * applicant's own password, and emails the team. Turnstile-gated. Mirrors the old
 * Gravity Forms registration; approval + price-tier assignment happen in /admin.
 */
export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = ["Educator", "Distributor"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
	return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const name = str(body.name);
	const email = str(body.email).toLowerCase();
	const company = str(body.company);
	const phone = str(body.phone);
	const line1 = str(body.addressLine1);
	const city = str(body.city);
	const region = str(body.state);
	const zip = str(body.zip);
	const country = str(body.country) || "United States";
	const accountType = str(body.accountType);
	const password = typeof body.password === "string" ? body.password : "";
	const turnstileToken = str(body.turnstileToken);

	// Validation
	if (!name || !EMAIL_RE.test(email) || !company || !phone || !line1 || !city || !region || !zip) {
		return Response.json({ error: "Please fill in all required fields with a valid email." }, { status: 400 });
	}
	if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) {
		return Response.json({ error: "Please select whether you are an Educator or Distributor." }, { status: 400 });
	}
	if (password.length < 8) {
		return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
	}

	// Bot gate (skipped when Turnstile isn't configured — dev).
	const ip = request.headers.get("cf-connecting-ip");
	if (!(await verifyTurnstile(turnstileToken, ip))) {
		return Response.json({ error: "Verification failed. Please try the challenge again." }, { status: 400 });
	}

	const db = getDb();

	// Don't create duplicates. Reveal "already exists" only for active accounts;
	// otherwise return a generic success so we don't leak who's pending/denied.
	const existing = await getUserByEmail(db, email);
	if (existing) {
		if (existing.status === "approved" || existing.status === null) {
			return Response.json(
				{ error: "An account with this email already exists. Try signing in or resetting your password." },
				{ status: 409 },
			);
		}
		return Response.json({ ok: true, message: "Thanks — your request is on file and under review." });
	}

	const address = `${line1}\n${city}, ${region} ${zip}\n${country}`;
	const now = new Date().toISOString();
	const passwordHash = await hashPassword(password);

	await createPendingUser(
		db,
		{ email, displayName: name, passwordHash, company, phone, address, accountType },
		now,
	);

	// Best-effort notification — never fail the signup if mail is down.
	await sendNewAccountEmail({ name, email, company, phone, address, accountType }).catch(() => false);

	return Response.json({
		ok: true,
		message: "Thanks! Your account request has been received. We'll review it and email you once it's approved.",
	});
}
