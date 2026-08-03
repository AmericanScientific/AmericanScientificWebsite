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
	must_change_password: number;
	company: string | null;
	phone: string | null;
	address: string | null;
	account_type: string | null;
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

/** Details captured by the public /register form. */
export interface NewUserInput {
	email: string;
	displayName: string;
	passwordHash: string;
	company: string | null;
	phone: string | null;
	address: string | null;
	accountType: string | null;
}

/**
 * Create a self-service signup: status='pending' (blocked from login until an
 * admin approves), base price level, own password set. Returns the new row id.
 */
export async function createPendingUser(db: D1Database, input: NewUserInput, now: string): Promise<number> {
	const res = await db
		.prepare(
			"INSERT INTO users " +
				"(email, display_name, password_hash, status, role, is_admin, price_level, must_change_password, " +
				"company, phone, address, account_type, created_at, updated_at) " +
				"VALUES (?1,?2,?3,'pending','customer',0,1,0,?4,?5,?6,?7,?8,?8)",
		)
		.bind(
			input.email.trim().toLowerCase(),
			input.displayName,
			input.passwordHash,
			input.company,
			input.phone,
			input.address,
			input.accountType,
			now,
		)
		.run();
	return Number(res.meta?.last_row_id ?? 0);
}

/** List accounts in a given moderation status, newest first (admin queue). */
export async function listUsersByStatus(db: D1Database, status: string): Promise<UserRow[]> {
	const { results } = await db
		.prepare("SELECT * FROM users WHERE status = ?1 ORDER BY created_at DESC")
		.bind(status)
		.all<UserRow>();
	return results ?? [];
}

/*
 * ── Account directory (admin "Current accounts") ─────────────────────────────
 *
 * The whole table is ~2,000 rows, so this is filtered, sorted and paginated in
 * SQL rather than in the page.
 */

/**
 * SQL for "this account can actually sign in today".
 *
 * Mirrors the two gates in POST /api/auth/login: a modern PBKDF2 hash must be
 * present AND the must-change flag must be cleared. Kept as one constant so the
 * admin view can never drift from what login really enforces — if the login
 * checks change, this is the single place to follow. (`$` is not a LIKE
 * wildcard in SQLite, so the prefix matches literally.)
 *
 * `coalesce` is load-bearing, not defensive noise: a NULL `password_hash` makes
 * the LIKE evaluate to NULL, and `NOT NULL` is NULL rather than true — so the
 * negated form used by the "awaiting setup" filter and count would silently drop
 * exactly the accounts it exists to find. Today `must_change_password = 1` on
 * every such row masks it (FALSE dominates AND), but a NULL hash with the flag
 * already cleared is reachable, and the failure would be a quiet undercount.
 */
const HAS_SET_PASSWORD = "(coalesce(password_hash,'') LIKE 'pbkdf2$%' AND must_change_password = 0)";

/** Sort keys, whitelisted — the value is interpolated, so it must never be user input. */
const ACCOUNT_SORTS: Record<string, string> = {
	newest: "created_at DESC, id DESC",
	oldest: "created_at ASC, id ASC",
	name: "lower(display_name) ASC, id ASC",
	email: "lower(email) ASC, id ASC",
};

export type AccountSort = keyof typeof ACCOUNT_SORTS;

export interface AccountFilter {
	/** Free text over email, display name and company. */
	q?: string;
	/** `approved` also covers legacy NULL status, which login treats as approved. */
	status?: "approved" | "pending" | "denied";
	/** `yes` = has set a password on the new site; `no` = hasn't yet. */
	setPassword?: "yes" | "no";
	priceLevel?: number;
	sort?: AccountSort;
}

/** Build the shared WHERE clause for the directory list and its count. */
function accountWhere(f: AccountFilter): { sql: string; binds: unknown[] } {
	const clauses: string[] = [];
	const binds: unknown[] = [];

	const q = f.q?.trim().toLowerCase();
	if (q) {
		// lower() both sides so mixed-case company names match too.
		clauses.push(
			"(lower(email) LIKE ? OR lower(display_name) LIKE ? OR lower(coalesce(company,'')) LIKE ?)",
		);
		const like = `%${q}%`;
		binds.push(like, like, like);
	}

	if (f.status === "approved") clauses.push("(status = 'approved' OR status IS NULL)");
	else if (f.status === "pending") clauses.push("status = 'pending'");
	else if (f.status === "denied") clauses.push("status = 'denied'");

	if (f.setPassword === "yes") clauses.push(HAS_SET_PASSWORD);
	else if (f.setPassword === "no") clauses.push(`NOT ${HAS_SET_PASSWORD}`);

	if (f.priceLevel) {
		clauses.push("price_level = ?");
		binds.push(f.priceLevel);
	}

	return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", binds };
}

/** One row of the admin account directory. No hashes leave the server. */
export interface AccountRow {
	id: number;
	email: string;
	display_name: string;
	company: string | null;
	account_type: string | null;
	status: string | null;
	price_level: number;
	is_admin: number;
	/** Non-null = migrated from WordPress; null = self-service signup. */
	wp_user_id: number | null;
	netsuite_customer_id: string | null;
	/** 1 = has set a password on the new site and can sign in. */
	has_set_password: number;
	created_at: string;
	updated_at: string;
}

/** A page of accounts matching `filter`. */
export async function listAccounts(
	db: D1Database,
	filter: AccountFilter,
	limit: number,
	offset: number,
): Promise<AccountRow[]> {
	const { sql, binds } = accountWhere(filter);
	const order = ACCOUNT_SORTS[filter.sort ?? "newest"] ?? ACCOUNT_SORTS.newest;
	const { results } = await db
		.prepare(
			"SELECT id, email, display_name, company, account_type, status, price_level, is_admin, " +
				"wp_user_id, netsuite_customer_id, created_at, updated_at, " +
				`CASE WHEN ${HAS_SET_PASSWORD} THEN 1 ELSE 0 END AS has_set_password ` +
				`FROM users${sql} ORDER BY ${order} LIMIT ? OFFSET ?`,
		)
		.bind(...binds, limit, offset)
		.all<AccountRow>();
	return results ?? [];
}

/** Total accounts matching `filter` (drives pagination). */
export async function countAccounts(db: D1Database, filter: AccountFilter): Promise<number> {
	const { sql, binds } = accountWhere(filter);
	const row = await db
		.prepare(`SELECT COUNT(*) AS n FROM users${sql}`)
		.bind(...binds)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

/** Headline counts for the directory, unfiltered. */
export interface AccountSummary {
	total: number;
	approved: number;
	pending: number;
	denied: number;
	/** Approved accounts that have set a password and can sign in. */
	ready: number;
	/** Approved accounts still waiting to set one. */
	awaitingSetup: number;
}

export async function getAccountSummary(db: D1Database): Promise<AccountSummary> {
	const approved = "(status = 'approved' OR status IS NULL)";
	const row = await db
		.prepare(
			"SELECT COUNT(*) AS total, " +
				`SUM(CASE WHEN ${approved} THEN 1 ELSE 0 END) AS approved, ` +
				"SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, " +
				"SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied, " +
				`SUM(CASE WHEN ${approved} AND ${HAS_SET_PASSWORD} THEN 1 ELSE 0 END) AS ready, ` +
				`SUM(CASE WHEN ${approved} AND NOT ${HAS_SET_PASSWORD} THEN 1 ELSE 0 END) AS awaitingSetup ` +
				"FROM users",
		)
		.first<AccountSummary>();
	return (
		row ?? { total: 0, approved: 0, pending: 0, denied: 0, ready: 0, awaitingSetup: 0 }
	);
}

/**
 * Change an existing account's price tier.
 *
 * Deliberately separate from `approveUser`: this must not touch `status` and
 * must not trigger the approval email, because it runs on accounts that are
 * already live.
 */
export async function setUserPriceLevel(
	db: D1Database,
	id: number,
	priceLevel: number,
	now: string,
): Promise<void> {
	await db
		.prepare("UPDATE users SET price_level = ?2, updated_at = ?3 WHERE id = ?1")
		.bind(id, priceLevel, now)
		.run();
}

/** Approve a pending account and set its NetSuite-derived price level. */
export async function approveUser(db: D1Database, id: number, priceLevel: number, now: string): Promise<void> {
	await db
		.prepare("UPDATE users SET status = 'approved', price_level = ?2, updated_at = ?3 WHERE id = ?1")
		.bind(id, priceLevel, now)
		.run();
}

/** Deny a pending account (stays login-blocked). */
export async function denyUser(db: D1Database, id: number, now: string): Promise<void> {
	await db
		.prepare("UPDATE users SET status = 'denied', updated_at = ?2 WHERE id = ?1")
		.bind(id, now)
		.run();
}

/**
 * Set a user's password (from the email setup/reset flow): stores the modern
 * hash, clears any legacy WP hash, and permanently clears must_change_password.
 */
export async function setUserPassword(db: D1Database, id: number, modernHash: string, now: string): Promise<void> {
	await db
		.prepare(
			"UPDATE users SET password_hash = ?2, wp_password_hash = NULL, must_change_password = 0, updated_at = ?3 WHERE id = ?1",
		)
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
