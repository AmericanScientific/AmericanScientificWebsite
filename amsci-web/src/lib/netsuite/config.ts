/**
 * NetSuite Token-Based Authentication (TBA) config.
 *
 * Values come from environment secrets — NEVER hardcoded, NEVER committed
 * (CLAUDE.md §6). Set them in `.dev.vars` for local dev and via
 * `wrangler secret put NS_...` (or the Cloudflare dashboard) for deployed
 * Workers. See `.dev.vars.example` for the full list.
 *
 * Account `4093468`, WS `2024_2`, HMAC-SHA256 — per CLAUDE.md §9.
 */
import { getEnv, type RawEnv } from "./env";

export interface NetSuiteConfig {
	/** NetSuite account ID, e.g. "4093468". Also the OAuth realm. */
	account: string;
	/** SuiteTalk REST host derived from the account, e.g. "4093468.suitetalk.api.netsuite.com". */
	host: string;
	consumerKey: string;
	consumerSecret: string;
	token: string;
	tokenSecret: string;
}

/** Env var names, matching `.dev.vars` / wrangler secrets. */
export const NS_ENV_KEYS = [
	"NS_ACCOUNT",
	"NS_CONSUMER_KEY",
	"NS_CONSUMER_SECRET",
	"NS_TOKEN",
	"NS_TOKEN_SECRET",
] as const;

/** A value counts as "unset" if empty or still a template placeholder. */
function isPlaceholder(value: string | undefined): boolean {
	if (!value) return true;
	const v = value.trim().toLowerCase();
	return v === "" || v.startsWith("your-") || v.startsWith("replace");
}

/** True when every required NetSuite secret is present (and not a placeholder). */
export function hasNetSuiteConfig(env: RawEnv = getEnv()): boolean {
	return NS_ENV_KEYS.every((k) => !isPlaceholder(env[k]));
}

/**
 * Load and validate the NetSuite config. Throws a clear, actionable error if any
 * secret is missing so misconfiguration fails loudly rather than silently making
 * unauthenticated calls.
 */
export function loadNetSuiteConfig(env: RawEnv = getEnv()): NetSuiteConfig {
	const missing = NS_ENV_KEYS.filter((k) => isPlaceholder(env[k]));
	if (missing.length > 0) {
		throw new Error(
			`NetSuite config incomplete — missing or placeholder: ${missing.join(", ")}. ` +
				`Set these in .dev.vars (local) or via 'wrangler secret put <NAME>' (deployed). ` +
				`See src/lib/netsuite and .dev.vars.example.`,
		);
	}

	const account = env.NS_ACCOUNT!.trim();
	// REST host: account ID lowercased; sandbox accounts turn '_' into '-'.
	const host = `${account.toLowerCase().replace(/_/g, "-")}.suitetalk.api.netsuite.com`;

	return {
		account,
		host,
		consumerKey: env.NS_CONSUMER_KEY!.trim(),
		consumerSecret: env.NS_CONSUMER_SECRET!.trim(),
		token: env.NS_TOKEN!.trim(),
		tokenSecret: env.NS_TOKEN_SECRET!.trim(),
	};
}
