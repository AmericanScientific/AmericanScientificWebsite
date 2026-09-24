import { getDb, getUserByEmail } from "@/lib/auth/db";
import { createPasswordToken } from "@/lib/auth/tokens";
import { devLinksEnabled, sendPasswordEmail, siteBaseUrl } from "@/lib/auth/email";
import { checkAuthEmailRateLimit, clientIp } from "@/lib/leads/guard";
import { verifyTurnstile } from "@/lib/auth/turnstile";

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
	let body: { email?: unknown; turnstileToken?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	if (!email) return Response.json({ error: "Email is required." }, { status: 400 });
	const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

	// Per-IP rate limit. Returns the SAME generic body as every other path so a
	// throttled caller learns nothing about whether the address has an account;
	// the 429 is about the caller's rate, never about the address.
	const ip = clientIp(request);
	if (!(await checkAuthEmailRateLimit(ip))) {
		return Response.json(GENERIC, { status: 429, headers: { "Retry-After": "60" } });
	}

	// Turnstile. The rate limiter above is a soft layer -- Cloudflare's limiters
	// are approximate and lag under a burst -- so this is what actually bounds
	// the endpoint. It runs BEFORE the lookup, so a rejection says nothing about
	// whether the address has an account; it is strictly about the caller.
	if (!(await verifyTurnstile(turnstileToken, ip))) {
		return Response.json({ error: "Verification failed. Please try again." }, { status: 403 });
	}

	const db = getDb();
	const user = await getUserByEmail(db, email);

	// Denied accounts and unknown emails get the same generic response (no signal).
	if (!user || user.status === "denied") {
		return Response.json(GENERIC);
	}

	const purpose = user.must_change_password === 1 || !user.password_hash ? "setup" : "reset";
	const token = await createPasswordToken(db, user.id, purpose);
	const link = `${siteBaseUrl(request)}/set-password?token=${token}`;
	const sent = await sendPasswordEmail(email, user.display_name || "", link, purpose);

	// The RESPONSE stays generic either way — telling the caller that delivery
	// failed would leak that the address has an account. But a silent failure
	// here is indistinguishable from success to US as well, which is how a mail
	// outage becomes "nobody can get into the new site" with nothing in the logs.
	// So the signal goes to observability instead, where it can't leak.
	if (!sent.delivered) {
		console.warn(
			`[auth/request-setup] ${purpose} link NOT delivered (user=${user.id}, ` +
				`devFallback=${sent.devFallback}). ` +
				(sent.devFallback
					? "RESEND_API_KEY is unset — the link was only logged."
					: "The mail provider rejected the send."),
		);
	}

	// Only surface the link when explicitly enabled for local testing (never prod).
	return Response.json(devLinksEnabled() ? { ...GENERIC, devLink: link } : GENERIC);
}
