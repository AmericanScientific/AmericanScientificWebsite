import { sendPhyweLeadEmail } from "@/lib/auth/email";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { checkAndBumpLeadDailyCap, checkLeadRateLimit, clientIp } from "@/lib/leads/guard";

/**
 * POST /api/phywe-lead — PHYWE "Connect with a Product Advisor" lead form.
 *
 * Emails the team (sales@american-scientific.com) a lead inquiry. Mirrors the old
 * Gravity Form #8. No account required (public marketing page).
 *
 * Every send here is a real Resend send, which makes an unguarded version a
 * free megaphone pointed at the sales inbox — and in Sept 2026 a bot used it as
 * one, 200+ inquiries in a run. The guards below are ordered cheapest-first so
 * an attacker's request is dropped before it costs us anything: honeypot, then
 * per-IP rate limit, then Turnstile (a network call), then the global daily cap
 * (a D1 write), and only then the send. See src/lib/leads/guard.ts.
 */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Bots pad fields to game spam filters; a real advisor inquiry is not a novel. */
const MAX = { name: 120, email: 200, phone: 40, message: 4000 } as const;

export async function POST(request: Request): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const name = str(body.name);
	const email = str(body.email).toLowerCase();
	const phone = str(body.phone);
	const message = str(body.message);
	const turnstileToken = str(body.turnstileToken);

	// Honeypot: real users leave this empty; bots fill everything. Answering OK
	// (rather than an error) keeps the bot from learning why it failed.
	if (str(body.company)) return Response.json({ ok: true });

	if (!name || !EMAIL_RE.test(email)) {
		return Response.json({ error: "Please enter your name and a valid email." }, { status: 400 });
	}
	if (
		name.length > MAX.name ||
		email.length > MAX.email ||
		phone.length > MAX.phone ||
		message.length > MAX.message
	) {
		return Response.json({ error: "That inquiry is too long to send. Please shorten it." }, { status: 400 });
	}

	// Per-IP rate limit — before Turnstile, so a flood costs us no siteverify calls.
	const ip = clientIp(request);
	if (!(await checkLeadRateLimit(ip))) {
		return Response.json(
			{ error: "Too many inquiries from this connection. Please wait a moment and try again." },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	}

	// Turnstile. Unlike the rate limit and the cap this fails CLOSED: with the
	// secret configured, no valid token means no send.
	if (!(await verifyTurnstile(turnstileToken, ip))) {
		return Response.json({ error: "Verification failed. Please try again." }, { status: 403 });
	}

	// Global daily cap — the backstop for many IPs each under the per-IP limit.
	if (!(await checkAndBumpLeadDailyCap())) {
		console.warn(`[phywe-lead] daily cap reached — inquiry from ${ip} not sent`);
		return Response.json(
			{ error: "We couldn't send your inquiry right now. Please email sales@american-scientific.com." },
			{ status: 503 },
		);
	}

	// Best-effort send; report failure so the form can show a real message.
	const delivered = await sendPhyweLeadEmail({ name, email, phone, message }).catch(() => false);
	if (!delivered) {
		return Response.json(
			{ error: "We couldn't send your inquiry right now. Please email sales@american-scientific.com." },
			{ status: 502 },
		);
	}
	return Response.json({ ok: true, message: "Thanks! Our team will follow up within one business day." });
}
