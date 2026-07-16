import "server-only";

/**
 * One-time tokens for password setup (migrated first-login) and reset.
 * The raw token travels in the emailed link; only its SHA-256 is stored, so a
 * DB read can't mint a working link. Tokens are single-use and expiring.
 */

export type TokenPurpose = "setup" | "reset";

const TTL_SECONDS: Record<TokenPurpose, number> = {
	setup: 72 * 60 * 60, // 3 days — migrated users' first login
	reset: 60 * 60, // 1 hour — self-service reset
};

function toHex(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
	return s;
}

function newRawToken(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashToken(raw: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
	return toHex(new Uint8Array(digest));
}

/**
 * Create a token for `userId`, invalidating any prior unused tokens of the same
 * purpose (so only the latest emailed link works). Returns the RAW token to embed
 * in the link.
 */
export async function createPasswordToken(
	db: D1Database,
	userId: number,
	purpose: TokenPurpose,
): Promise<string> {
	const raw = newRawToken();
	const id = await hashToken(raw);
	const now = new Date();
	const expires = new Date(now.getTime() + TTL_SECONDS[purpose] * 1000);
	await db.prepare("DELETE FROM password_tokens WHERE user_id = ?1 AND purpose = ?2 AND used_at IS NULL").bind(userId, purpose).run();
	await db
		.prepare("INSERT INTO password_tokens (id, user_id, purpose, created_at, expires_at, used_at) VALUES (?1,?2,?3,?4,?5,NULL)")
		.bind(id, userId, purpose, now.toISOString(), expires.toISOString())
		.run();
	return raw;
}

export interface ConsumedToken {
	userId: number;
	purpose: TokenPurpose;
}

/**
 * Validate and consume a raw token: must exist, be unused, and unexpired. Marks
 * it used atomically. Returns the owning user, or null if invalid.
 */
export async function consumePasswordToken(db: D1Database, raw: string): Promise<ConsumedToken | null> {
	if (!raw) return null;
	const id = await hashToken(raw);
	const nowIso = new Date().toISOString();
	const row = await db
		.prepare("SELECT user_id, purpose FROM password_tokens WHERE id = ?1 AND used_at IS NULL AND expires_at > ?2")
		.bind(id, nowIso)
		.first<{ user_id: number; purpose: TokenPurpose }>();
	if (!row) return null;
	// Single-use: mark redeemed. Guard on used_at again to avoid a double-redeem race.
	const res = await db.prepare("UPDATE password_tokens SET used_at = ?2 WHERE id = ?1 AND used_at IS NULL").bind(id, nowIso).run();
	if ((res.meta?.changes ?? 0) === 0) return null;
	return { userId: row.user_id, purpose: row.purpose };
}
