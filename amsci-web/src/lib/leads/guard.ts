import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Abuse guardrails for the public lead form (/api/phywe-lead).
 *
 * The form is deliberately open — no account, no login — because it sits on a
 * marketing page whose whole job is to catch a stranger's interest. That also
 * made it the softest target on the site: a honeypot field was the only thing
 * between a bot and an unbounded run of Resend sends into the sales inbox, and
 * a honeypot only stops a bot that fills every field it finds.
 *
 * Three layers now, cheapest first:
 *   1. Honeypot (in the route) — still free, still catches the dumb ones.
 *   2. Per-IP rate limiting via native Cloudflare rate-limiter bindings, burst
 *      + sustained. In-memory at the edge, no storage cost, per-colo.
 *   3. A global daily cap in D1 — bounds the distributed case, where many IPs
 *      each stay under the per-IP limit.
 *
 * Layers 2 and 3 fail OPEN when their binding is absent (local `next dev` has
 * neither) or on a transient error: a limiter hiccup must never swallow a real
 * sales lead. Turnstile, verified in the route, is the layer that fails CLOSED.
 *
 * Mirrors src/lib/chat/guard.ts, which bounds Anthropic spend the same way.
 */
interface RateLimiter {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

interface LeadGuardEnv {
	LEAD_RL_BURST?: RateLimiter;
	LEAD_RL_SUSTAINED?: RateLimiter;
	AUTH_RL_BURST?: RateLimiter;
	AUTH_RL_SUSTAINED?: RateLimiter;
	DB?: D1Database;
	/** Optional override of the global daily lead cap (var). */
	LEAD_DAILY_CAP?: string;
}

/**
 * A day's worth of genuine inquiries on this page is single digits. 200 is high
 * enough that a good day never touches it and low enough that a bot run is
 * capped at an inbox annoyance rather than a Resend reputation problem.
 */
const DEFAULT_DAILY_CAP = 200;

function guardEnv(): LeadGuardEnv {
	try {
		return getCloudflareContext().env as unknown as LeadGuardEnv;
	} catch {
		return {};
	}
}

/** The client IP as Cloudflare sees it. Spoofable headers are NOT consulted. */
export function clientIp(request: Request): string {
	return request.headers.get("cf-connecting-ip") ?? "unknown";
}

/** True if the IP is under the rate limit. Fails open if bindings are missing. */
export async function checkLeadRateLimit(ip: string): Promise<boolean> {
	const env = guardEnv();
	const key = ip || "unknown";
	try {
		for (const rl of [env.LEAD_RL_BURST, env.LEAD_RL_SUSTAINED]) {
			if (!rl) continue;
			const { success } = await rl.limit({ key });
			if (!success) return false;
		}
	} catch (err) {
		console.error("[leads/guard] rate limiter error (failing open):", err);
	}
	return true;
}

/**
 * Increment today's counter and return true if still under the global cap.
 * Counting happens before the send, so the cap bounds attempted sends, not just
 * successful ones. Fails open if D1 is unavailable.
 */
export async function checkAndBumpLeadDailyCap(): Promise<boolean> {
	const env = guardEnv();
	if (!env.DB) return true;
	const cap = Number(env.LEAD_DAILY_CAP) > 0 ? Number(env.LEAD_DAILY_CAP) : DEFAULT_DAILY_CAP;
	const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
	try {
		const row = await env.DB.prepare(
			"INSERT INTO lead_usage (day, count) VALUES (?1, 1) " +
				"ON CONFLICT(day) DO UPDATE SET count = count + 1 RETURNING count",
		)
			.bind(day)
			.first<{ count: number }>();
		return (row?.count ?? 0) <= cap;
	} catch (err) {
		console.error("[leads/guard] daily cap error (failing open):", err);
		return true;
	}
}

/**
 * Per-IP rate limit for the password setup/reset request
 * (/api/auth/request-setup). That endpoint only mails an address that already
 * has an account, so it can't spray strangers — but left open it lets someone
 * walk a list of our customers and bury each of them in reset links, wearing
 * down both the customer's trust and our sending reputation. Fails open.
 */
export async function checkAuthEmailRateLimit(ip: string): Promise<boolean> {
	const env = guardEnv();
	const key = ip || "unknown";
	try {
		for (const rl of [env.AUTH_RL_BURST, env.AUTH_RL_SUSTAINED]) {
			if (!rl) continue;
			const { success } = await rl.limit({ key });
			if (!success) return false;
		}
	} catch (err) {
		console.error("[leads/guard] auth rate limiter error (failing open):", err);
	}
	return true;
}
