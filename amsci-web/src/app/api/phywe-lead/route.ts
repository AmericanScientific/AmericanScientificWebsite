import { sendPhyweLeadEmail } from "@/lib/auth/email";

/**
 * POST /api/phywe-lead — PHYWE "Connect with a Product Advisor" lead form.
 *
 * Emails the team (sales@american-scientific.com) a lead inquiry. Mirrors the old
 * Gravity Form #8. No account required (public marketing page).
 */
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

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
	// Honeypot: real users leave this empty; bots fill everything.
	if (str(body.company)) return Response.json({ ok: true });

	if (!name || !EMAIL_RE.test(email)) {
		return Response.json({ error: "Please enter your name and a valid email." }, { status: 400 });
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
