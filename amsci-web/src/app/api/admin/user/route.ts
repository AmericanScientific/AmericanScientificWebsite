import { approveUser, denyUser, getDb, getUserById, setUserPriceLevel } from "@/lib/auth/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
	devLinksEnabled,
	sendAccountApprovedEmail,
	sendPasswordEmail,
	siteBaseUrl,
} from "@/lib/auth/email";
import { createPasswordToken } from "@/lib/auth/tokens";

/**
 * POST /api/admin/user
 *   { userId, action: "approve" | "deny" | "set-tier" | "resend-setup", priceLevel? }
 *
 * Admin-only (is_admin). Approves a pending account (setting its price tier) or
 * denies it. On approval, emails the applicant that they can sign in.
 *
 * `set-tier` retiers an account that is ALREADY live, from the Current accounts
 * directory. It is a separate action rather than a re-approve because it must
 * not touch `status` and must not send the approval email to someone who has
 * been signing in for months.
 *
 * `resend-setup` re-sends the one-time password link to an account that hasn't
 * completed setup — the admin-initiated twin of POST /api/auth/request-setup.
 * Unlike that public route it does NOT need to hide whether the account exists
 * (the admin is looking at the row), so it reports real outcomes instead of a
 * generic response, including whether the mail provider actually accepted it.
 */
export const dynamic = "force-dynamic";

const VALID_LEVELS = new Set([1, 2, 3, 4, 7, 8]); // NetSuite price levels (CLAUDE.md §2)
const ACTIONS = new Set(["approve", "deny", "set-tier", "resend-setup"]);

export async function POST(request: Request): Promise<Response> {
	const admin = await getCurrentUser();
	if (!admin) return Response.json({ error: "Not authenticated." }, { status: 401 });
	if (!admin.isAdmin) return Response.json({ error: "Forbidden." }, { status: 403 });

	let body: { userId?: unknown; action?: unknown; priceLevel?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	const userId = Number(body.userId);
	const action = typeof body.action === "string" ? body.action : "";
	if (!Number.isInteger(userId) || !ACTIONS.has(action)) {
		return Response.json({ error: "Invalid request." }, { status: 400 });
	}

	const db = getDb();
	const user = await getUserById(db, userId);
	if (!user) return Response.json({ error: "User not found." }, { status: 404 });

	const now = new Date().toISOString();

	if (action === "deny") {
		await denyUser(db, userId, now);
		return Response.json({ ok: true, status: "denied" });
	}

	if (action === "set-tier") {
		const level = Number(body.priceLevel);
		if (!VALID_LEVELS.has(level)) {
			return Response.json({ error: "Choose a valid price level (1, 2, 3, 4, 7, or 8)." }, { status: 400 });
		}
		await setUserPriceLevel(db, userId, level, now);
		return Response.json({ ok: true, priceLevel: level });
	}

	if (action === "resend-setup") {
		// A denied account can never sign in, so a "set your password" link would
		// be a lie. A pending one would be worse: they could set a password and
		// still be blocked at login. The correct action for pending is Approve,
		// which sends its own email — so point the admin at that instead.
		if (user.status === "denied") {
			return Response.json({ error: "This account is denied. Nothing to set up." }, { status: 409 });
		}
		if (user.status === "pending") {
			return Response.json(
				{ error: "Approve this request first — approval emails them. A setup link now would still leave them blocked at login." },
				{ status: 409 },
			);
		}

		// Same derivation as the public request-setup route, so the email copy and
		// token lifetime match what the user would get by asking themselves.
		const purpose = user.must_change_password === 1 || !user.password_hash ? "setup" : "reset";
		const token = await createPasswordToken(db, user.id, purpose);
		const link = `${siteBaseUrl(request)}/set-password?token=${token}`;
		const sent = await sendPasswordEmail(user.email, user.display_name || "", link, purpose);

		if (!sent.delivered && !sent.devFallback) {
			// The mail provider rejected it. Say so rather than showing a false
			// "Sent" — the admin is chasing this person and needs to know.
			return Response.json(
				{ error: "Could not send the email. Check the mail provider and try again." },
				{ status: 502 },
			);
		}

		return Response.json({
			ok: true,
			purpose,
			delivered: sent.delivered,
			// Only ever surfaced locally (AUTH_DEV_LINKS=1), never in production.
			...(devLinksEnabled() ? { devLink: link } : {}),
		});
	}

	// approve
	const priceLevel = Number(body.priceLevel);
	if (!VALID_LEVELS.has(priceLevel)) {
		return Response.json({ error: "Choose a valid price level (1, 2, 3, 4, 7, or 8)." }, { status: 400 });
	}
	await approveUser(db, userId, priceLevel, now);

	// Let them know they can sign in (best-effort).
	await sendAccountApprovedEmail(user.email, user.display_name, siteBaseUrl(request)).catch(() => false);

	return Response.json({ ok: true, status: "approved", priceLevel });
}
