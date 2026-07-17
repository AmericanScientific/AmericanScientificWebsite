import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare Turnstile server-side verification for the public signup form.
 *
 * Config:
 *  - TURNSTILE_SECRET_KEY (wrangler secret) — server verification key.
 *  - TURNSTILE_SITE_KEY   (var)             — public widget key (read by the page).
 *
 * When the secret is unset (local dev, or before Turnstile is provisioned), we
 * SKIP verification so the flow stays testable — mirroring the email devFallback
 * pattern. In production the secret is set, so real tokens are required.
 */
interface TurnstileEnv {
	TURNSTILE_SECRET_KEY?: string;
	TURNSTILE_SITE_KEY?: string;
}

function tsEnv(): TurnstileEnv {
	try {
		return getCloudflareContext().env as unknown as TurnstileEnv;
	} catch {
		return {};
	}
}

/** Public site key for the widget, or null if Turnstile isn't configured. */
export function turnstileSiteKey(): string | null {
	return tsEnv().TURNSTILE_SITE_KEY || null;
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token. Returns true when the challenge passed — or when no
 * secret is configured (dev). Never throws; a network failure returns false so a
 * misconfigured prod fails closed.
 */
export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null): Promise<boolean> {
	const secret = tsEnv().TURNSTILE_SECRET_KEY;
	if (!secret) return true; // not configured → skip (dev)
	if (!token) return false;
	try {
		const form = new FormData();
		form.append("secret", secret);
		form.append("response", token);
		if (remoteIp) form.append("remoteip", remoteIp);
		const res = await fetch(VERIFY_URL, { method: "POST", body: form });
		if (!res.ok) return false;
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}
