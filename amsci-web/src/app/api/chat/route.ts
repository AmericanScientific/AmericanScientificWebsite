import { getCurrentUser } from "@/lib/auth/session";
import { runChat, type ChatTurn } from "@/lib/chat/agent";
import { checkAndBumpDailyCap, checkAndBumpUserCap, checkRateLimit } from "@/lib/chat/guard";

/**
 * POST /api/chat  { messages: [{ role, content }] }
 *
 * Signed-in-only AI assistant (American Scientific is wholesale/B2B). Guests are
 * rejected with 401 BEFORE any Claude call, so anonymous traffic and bots cost
 * nothing. Guardrails, in order: auth → per-user rate limit → per-user daily cap
 * → global daily circuit-breaker. The LLM + tools run server-side; the API key
 * never reaches the browser.
 */
export const dynamic = "force-dynamic";

const MAX_TURNS = 20;
const MAX_CHARS = 2000; // per message — bounds token spend from oversized inputs

export async function POST(request: Request): Promise<Response> {
	// Guardrail 1: signed-in only. Reject guests before spending anything.
	const user = await getCurrentUser();
	if (!user) {
		return Response.json(
			{
				message:
					"Please sign in to use the assistant. American Scientific is a wholesale/B2B distributor, so the assistant is available to signed-in accounts. Sign in, or request an account for your organization, to chat.",
				actions: [],
			},
			{ status: 401, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	// Guardrail 2: per-user rate limit (burst + sustained), keyed on the user.
	const key = `u:${user.id}`;
	if (!(await checkRateLimit(key))) {
		return Response.json(
			{ message: "You're sending messages too quickly — give it a few seconds and try again.", actions: [] },
			{ status: 429, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	let body: { messages?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Malformed request." }, { status: 400 });
	}

	// Normalize the client-supplied history to plain text turns.
	const raw = Array.isArray(body.messages) ? body.messages : [];
	const history: ChatTurn[] = [];
	for (const m of raw.slice(-MAX_TURNS)) {
		if (!m || typeof m !== "object") continue;
		const role = (m as { role?: unknown }).role;
		const content = (m as { content?: unknown }).content;
		if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
			history.push({ role, content: content.slice(0, MAX_CHARS) });
		}
	}
	if (history.length === 0 || history[history.length - 1].role !== "user") {
		return Response.json({ error: "Expected a trailing user message." }, { status: 400 });
	}

	// Guardrail 3: per-user daily cap.
	if (!(await checkAndBumpUserCap(user.id))) {
		return Response.json(
			{ message: "You've reached today's assistant message limit. It resets tomorrow — or reach our team at office@american-scientific.com / 888-490-9002.", actions: [] },
			{ status: 429, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	// Guardrail 4: global daily cost circuit-breaker.
	if (!(await checkAndBumpDailyCap())) {
		return Response.json(
			{ message: "The assistant is unusually busy right now. Please try again later, or reach us at office@american-scientific.com.", actions: [] },
			{ status: 503, headers: { "Cache-Control": "private, no-store" } },
		);
	}

	try {
		const { text, actions, offline } = await runChat(history, { authed: true });
		return Response.json(
			{ message: text, actions, offline: !!offline },
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch (err) {
		console.error("[api/chat] failed:", err);
		return Response.json(
			{ message: "Sorry, something went wrong. Please try again.", actions: [] },
			{ status: 500 },
		);
	}
}
