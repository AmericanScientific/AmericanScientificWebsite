import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Abuse + cost guardrails for the AI assistant (/api/chat).
 *
 * Two layers:
 *  1. Per-IP rate limiting via the native Cloudflare rate-limiter bindings
 *     (burst + sustained) — in-memory at the edge, no storage cost.
 *  2. A daily global cost circuit-breaker in D1 — bounds worst-case Anthropic
 *     spend even under distributed abuse (many IPs each under the per-IP limit).
 *
 * Both fail OPEN (allow the request) when their binding is absent — e.g. local
 * `next dev` / `next start` has neither the rate-limiter nor D1 — or on a
 * transient error, so a limiter hiccup never blocks legitimate users.
 */
interface RateLimiter {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

interface GuardEnv {
	CHAT_RL_BURST?: RateLimiter;
	CHAT_RL_SUSTAINED?: RateLimiter;
	DB?: D1Database;
	/** Optional override of the daily message cap (var). */
	CHAT_DAILY_CAP?: string;
}

const DEFAULT_DAILY_CAP = 3000;

function guardEnv(): GuardEnv {
	try {
		return getCloudflareContext().env as unknown as GuardEnv;
	} catch {
		return {};
	}
}

/** True if the IP is under the rate limit. Fails open if bindings are missing. */
export async function checkRateLimit(ip: string): Promise<boolean> {
	const env = guardEnv();
	const key = ip || "unknown";
	try {
		for (const rl of [env.CHAT_RL_BURST, env.CHAT_RL_SUSTAINED]) {
			if (!rl) continue;
			const { success } = await rl.limit({ key });
			if (!success) return false;
		}
	} catch (err) {
		console.error("[chat/guard] rate limiter error (failing open):", err);
	}
	return true;
}

/**
 * Increment today's usage counter and return true if still under the daily cap.
 * Fails open if D1 is unavailable. Counting happens before the LLM call, so the
 * cap bounds attempts that would incur cost.
 */
export async function checkAndBumpDailyCap(): Promise<boolean> {
	const env = guardEnv();
	if (!env.DB) return true;
	const cap = Number(env.CHAT_DAILY_CAP) > 0 ? Number(env.CHAT_DAILY_CAP) : DEFAULT_DAILY_CAP;
	const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
	try {
		const row = await env.DB.prepare(
			"INSERT INTO chat_usage (day, count) VALUES (?1, 1) " +
				"ON CONFLICT(day) DO UPDATE SET count = count + 1 RETURNING count",
		)
			.bind(day)
			.first<{ count: number }>();
		return (row?.count ?? 0) <= cap;
	} catch (err) {
		console.error("[chat/guard] daily cap error (failing open):", err);
		return true;
	}
}
