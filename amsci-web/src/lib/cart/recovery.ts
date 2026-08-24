import "server-only";
import type { CartItem } from "@/lib/cart/cart-context";

/**
 * Carts rescued from the old WooCommerce site, handed back through an emailed link.
 *
 * Token handling mirrors `src/lib/auth/tokens.ts`: the raw token travels in the
 * link, only its SHA-256 is stored. The difference is redemption. Password
 * tokens are single-use; these are reusable until they expire, because a
 * single-use link is actively dangerous here -- corporate mail gateways
 * pre-fetch links to scan them, which would burn the token before the customer
 * clicked and lose their cart permanently. The link grants no access to the
 * account and restoring is idempotent (the merge keeps existing quantities), so
 * reuse is the safer failure mode.
 */

/** A line that existed in the old cart but is not in the new catalog. */
export interface UnavailableLine {
	sku: string;
	title: string;
	qty: number;
}

export interface RecoveredCart {
	email: string;
	userId: number | null;
	items: CartItem[];
	unavailable: UnavailableLine[];
	expiresAt: string;
}

const DEFAULT_TTL_DAYS = 60;

function toHex(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
	return s;
}

export function newRecoveryToken(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashRecoveryToken(raw: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
	return toHex(new Uint8Array(digest));
}

/**
 * Store one recovered cart. Returns the RAW token for the emailed link.
 *
 * Seeding is done offline by `scripts/seed-recovered-carts.mjs`, which needs
 * the same hashing, so the token helpers above are exported rather than kept
 * private to this module.
 */
export async function createRecoveredCart(
	db: D1Database,
	input: { email: string; userId: number | null; items: CartItem[]; unavailable?: UnavailableLine[]; ttlDays?: number },
): Promise<string> {
	const raw = newRecoveryToken();
	const id = await hashRecoveryToken(raw);
	const now = new Date();
	const expires = new Date(now.getTime() + (input.ttlDays ?? DEFAULT_TTL_DAYS) * 86400 * 1000);
	await db
		.prepare(
			"INSERT INTO recovered_carts (id, user_id, email, items, unavailable, created_at, expires_at, first_used_at, use_count) " +
				"VALUES (?1,?2,?3,?4,?5,?6,?7,NULL,0)",
		)
		.bind(
			id,
			input.userId,
			input.email.toLowerCase(),
			JSON.stringify(input.items),
			JSON.stringify(input.unavailable ?? []),
			now.toISOString(),
			expires.toISOString(),
		)
		.run();
	return raw;
}

export type RedeemResult =
	| { ok: true; cart: RecoveredCart }
	| { ok: false; reason: "empty" | "not_found" | "expired" | "malformed" };

/**
 * Look up a cart by raw token and record the redemption.
 *
 * The counter is bumped for analytics only; it never gates the response, so a
 * customer opening the link on a second device still gets their cart.
 */
export async function redeemRecoveredCart(db: D1Database, raw: string): Promise<RedeemResult> {
	if (!raw) return { ok: false, reason: "empty" };

	const id = await hashRecoveryToken(raw);
	const row = await db
		.prepare("SELECT user_id, email, items, unavailable, expires_at FROM recovered_carts WHERE id = ?1")
		.bind(id)
		.first<{ user_id: number | null; email: string; items: string; unavailable: string; expires_at: string }>();

	if (!row) return { ok: false, reason: "not_found" };
	if (row.expires_at <= new Date().toISOString()) return { ok: false, reason: "expired" };

	let items: CartItem[];
	let unavailable: UnavailableLine[];
	try {
		items = JSON.parse(row.items) as CartItem[];
		unavailable = JSON.parse(row.unavailable) as UnavailableLine[];
	} catch {
		// A row we wrote ourselves failed to parse: worth knowing about, but the
		// customer just sees "link not valid" rather than a stack trace.
		console.error(`[cart/recovery] malformed JSON on recovered cart for ${row.email}`);
		return { ok: false, reason: "malformed" };
	}
	if (!Array.isArray(items)) return { ok: false, reason: "malformed" };

	const nowIso = new Date().toISOString();
	await db
		.prepare("UPDATE recovered_carts SET use_count = use_count + 1, first_used_at = COALESCE(first_used_at, ?2) WHERE id = ?1")
		.bind(id, nowIso)
		.run();

	return {
		ok: true,
		cart: { email: row.email, userId: row.user_id, items, unavailable, expiresAt: row.expires_at },
	};
}

export type ClaimResult = { claimed: false } | { claimed: true; items: CartItem[]; unavailable: UnavailableLine[] };

/**
 * Hand a signed-in customer their rescued cart, once.
 *
 * This is the path that actually matters: the customer signs in, the storefront
 * asks whether anything is waiting for them, and their cart is simply there. No
 * emailed link, no token to lose. The link flow above stays as a manual fallback
 * for a rep on the phone, but nobody should need it.
 *
 * Matched on user id OR email, because a cart imported before its account was
 * linked can carry a null user_id. Claimed rows are stamped so this fires once
 * and never silently re-adds items the customer has since deleted.
 */
export async function claimPendingCart(
	db: D1Database,
	userId: number,
	email: string,
): Promise<ClaimResult> {
	const row = await db
		.prepare(
			"SELECT id, items, unavailable FROM recovered_carts " +
				"WHERE (user_id = ?1 OR email = ?2) AND first_used_at IS NULL " +
				"ORDER BY created_at LIMIT 1",
		)
		.bind(userId, email.toLowerCase())
		.first<{ id: string; items: string; unavailable: string }>();

	if (!row) return { claimed: false };

	// Stamp BEFORE returning, and guard on first_used_at still being null so two
	// tabs loading at once can't both be handed the same cart.
	const nowIso = new Date().toISOString();
	const res = await db
		.prepare("UPDATE recovered_carts SET first_used_at = ?2, use_count = use_count + 1 WHERE id = ?1 AND first_used_at IS NULL")
		.bind(row.id, nowIso)
		.run();
	if ((res.meta?.changes ?? 0) === 0) return { claimed: false };

	try {
		const items = JSON.parse(row.items) as CartItem[];
		const unavailable = JSON.parse(row.unavailable) as UnavailableLine[];
		if (!Array.isArray(items) || items.length === 0) return { claimed: false };
		return { claimed: true, items, unavailable: Array.isArray(unavailable) ? unavailable : [] };
	} catch {
		console.error(`[cart/recovery] malformed pending cart row ${row.id}`);
		return { claimed: false };
	}
}
