import { getCurrentUser } from "@/lib/auth/session";
import { getDb, getUserById } from "@/lib/auth/db";
import { createOrder, resolveOrderLines } from "@/lib/orders";
import { sendOrderConfirmationEmail, sendOrderRequestEmail, type OrderEmailData } from "@/lib/auth/email";

/**
 * POST /api/orders  { items: [{ sku, qty }] }
 *
 * Submit a quote-style order request. Login-gated. Prices/titles are resolved
 * SERVER-side (the client only says sku + qty). We store the order, then email
 * Sales the request + the customer a confirmation. No payment, no NetSuite
 * write-back yet — Sales writes the PO from the email.
 */
export const dynamic = "force-dynamic";

const MAX_LINES = 200;
const MAX_QTY = 100000;

export async function POST(request: Request): Promise<Response> {
	const sessionUser = await getCurrentUser();
	if (!sessionUser) return Response.json({ error: "Please sign in to place an order." }, { status: 401 });

	let body: { items?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	// Normalize + validate line items.
	const raw = Array.isArray(body.items) ? body.items : [];
	const items: { sku: string; qty: number }[] = [];
	for (const it of raw.slice(0, MAX_LINES)) {
		if (!it || typeof it !== "object") continue;
		const sku = typeof (it as { sku?: unknown }).sku === "string" ? (it as { sku: string }).sku.trim() : "";
		const qtyNum = Math.floor(Number((it as { qty?: unknown }).qty));
		if (!sku || !Number.isFinite(qtyNum) || qtyNum < 1) continue;
		items.push({ sku, qty: Math.min(qtyNum, MAX_QTY) });
	}
	if (items.length === 0) {
		return Response.json({ error: "Your order is empty." }, { status: 400 });
	}

	try {
		const db = getDb();
		const user = await getUserById(db, sessionUser.id);
		if (!user) return Response.json({ error: "Please sign in to place an order." }, { status: 401 });

		// Authoritative pricing/titles — never trust client values.
		const totals = await resolveOrderLines(items);
		if (totals.lines.length === 0) {
			return Response.json({ error: "None of the items could be found. Please refresh and try again." }, { status: 400 });
		}

		const now = new Date();
		const orderId = await createOrder(
			db,
			{
				userId: user.id,
				customer: {
					name: user.display_name || "",
					email: user.email,
					company: user.company,
					phone: user.phone,
					address: user.address,
				},
				priceLevel: user.price_level,
				totals,
			},
			now.toISOString(),
		);

		const emailData: OrderEmailData = {
			orderId,
			dateLabel: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(now),
			customer: {
				name: user.display_name || "",
				email: user.email,
				company: user.company ?? "",
				phone: user.phone ?? "",
				address: user.address ?? "",
			},
			lines: totals.lines,
			subtotal: totals.subtotal,
			total: totals.total,
			hasUnpriced: totals.hasUnpriced,
		};

		// Best-effort — the stored order is the source of truth if mail fails.
		await Promise.allSettled([sendOrderRequestEmail(emailData), sendOrderConfirmationEmail(emailData)]);

		return Response.json({ ok: true, orderId });
	} catch (err) {
		console.error("[api/orders] failed:", err);
		return Response.json(
			{ error: "We couldn't submit your order right now. Please try again shortly." },
			{ status: 500 },
		);
	}
}
