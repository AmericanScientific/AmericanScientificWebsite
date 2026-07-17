import { approveUser, denyUser, getDb, getUserById } from "@/lib/auth/db";
import { getCurrentUser } from "@/lib/auth/session";
import { sendAccountApprovedEmail, siteBaseUrl } from "@/lib/auth/email";

/**
 * POST /api/admin/user  { userId, action: "approve" | "deny", priceLevel? }
 *
 * Admin-only (is_admin). Approves a pending account (setting its price tier) or
 * denies it. On approval, emails the applicant that they can sign in.
 */
export const dynamic = "force-dynamic";

const VALID_LEVELS = new Set([1, 2, 3, 4, 7, 8]); // NetSuite price levels (CLAUDE.md §2)

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
	const action = body.action;
	if (!Number.isInteger(userId) || (action !== "approve" && action !== "deny")) {
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
