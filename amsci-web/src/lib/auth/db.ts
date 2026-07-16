import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** A row from the `users` table (auth identity). */
export interface UserRow {
	id: number;
	email: string;
	wp_user_id: number | null;
	display_name: string;
	password_hash: string | null;
	wp_password_hash: string | null;
	status: string | null;
	role: string;
	is_admin: number;
	price_level: number;
	netsuite_customer_id: string | null;
	created_at: string;
	updated_at: string;
}

/** The user shape safe to expose to the app (no hashes). */
export interface SessionUser {
	id: number;
	email: string;
	displayName: string;
	status: string | null;
	role: string;
	isAdmin: boolean;
	priceLevel: number;
}

export function toSessionUser(u: UserRow): SessionUser {
	return {
		id: u.id,
		email: u.email,
		displayName: u.display_name,
		status: u.status,
		role: u.role,
		isAdmin: u.is_admin === 1,
		priceLevel: u.price_level,
	};
}

/** Get the D1 binding, or throw if unavailable (auth requires D1). */
export function getDb(): D1Database {
	const { env } = getCloudflareContext();
	const db = (env as { DB?: D1Database }).DB;
	if (!db) throw new Error("D1 binding `DB` is not available (auth requires D1)");
	return db;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
	return db.prepare("SELECT * FROM users WHERE email = ?1").bind(email.trim().toLowerCase()).first<UserRow>();
}

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
	return db.prepare("SELECT * FROM users WHERE id = ?1").bind(id).first<UserRow>();
}

/** Replace a user's legacy WP hash with our modern hash (lazy upgrade on login). */
export async function upgradePasswordHash(db: D1Database, id: number, modernHash: string, now: string): Promise<void> {
	await db
		.prepare("UPDATE users SET password_hash = ?2, wp_password_hash = NULL, updated_at = ?3 WHERE id = ?1")
		.bind(id, modernHash, now)
		.run();
}

export async function createSession(
	db: D1Database,
	sessionId: string,
	userId: number,
	createdAt: string,
	expiresAt: string,
	userAgent: string | null,
): Promise<void> {
	await db
		.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?1,?2,?3,?4,?5)")
		.bind(sessionId, userId, createdAt, expiresAt, userAgent)
		.run();
}

/** Resolve a session id to its user, enforcing expiry. Returns null if invalid/expired. */
export async function getUserBySession(db: D1Database, sessionId: string, nowIso: string): Promise<UserRow | null> {
	const row = await db
		.prepare(
			"SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?1 AND s.expires_at > ?2",
		)
		.bind(sessionId, nowIso)
		.first<UserRow>();
	return row ?? null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare("DELETE FROM sessions WHERE id = ?1").bind(sessionId).run();
}
