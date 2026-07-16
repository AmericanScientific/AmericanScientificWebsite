import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
	createSession,
	deleteSession,
	getDb,
	getUserBySession,
	toSessionUser,
	type SessionUser,
} from "./db";

export const SESSION_COOKIE = "amsci_session";
const TTL_DAYS = 30;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

function toHex(bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
	return s;
}

/** Opaque, high-entropy cookie token (never stored server-side in raw form). */
function newToken(): string {
	return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** The value stored as sessions.id — a hash of the token, so a DB read can't reveal a live cookie. */
async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return toHex(new Uint8Array(digest));
}

/**
 * Create a session for `userId` and set the session cookie.
 * `now` is passed in so callers can share one timestamp (Workers has no Date.now in some contexts).
 */
export async function startSession(userId: number, userAgent: string | null): Promise<void> {
	const db = getDb();
	const token = newToken();
	const id = await hashToken(token);
	const now = new Date();
	const expires = new Date(now.getTime() + TTL_SECONDS * 1000);
	await createSession(db, id, userId, now.toISOString(), expires.toISOString(), userAgent);

	const jar = await cookies();
	jar.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: TTL_SECONDS,
	});
}

/** Destroy the current session (DB + cookie). Safe to call when not logged in. */
export async function endSession(): Promise<void> {
	const jar = await cookies();
	const token = jar.get(SESSION_COOKIE)?.value;
	if (token) {
		try {
			await deleteSession(getDb(), await hashToken(token));
		} catch {
			// best-effort DB cleanup; still clear the cookie below
		}
	}
	jar.delete(SESSION_COOKIE);
}

/**
 * Resolve the current request's user, or null. Wrapped in React `cache()` so
 * multiple server components in one render share a single D1 read.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
	try {
		const jar = await cookies();
		const token = jar.get(SESSION_COOKIE)?.value;
		if (!token) return null;
		const db = getDb();
		const row = await getUserBySession(db, await hashToken(token), new Date().toISOString());
		return row ? toSessionUser(row) : null;
	} catch {
		return null;
	}
});
