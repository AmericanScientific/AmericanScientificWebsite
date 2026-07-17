import { getCurrentUser } from "@/lib/auth/session";
import { runChat, type ChatTurn } from "@/lib/chat/agent";

/**
 * POST /api/chat  { messages: [{ role, content }] }
 *
 * Runs the AI assistant server-side (the ANTHROPIC_API_KEY never leaves the
 * Worker). Prices in tool results are gated on the signed-in user, and
 * add_to_order only works when authed. Returns the assistant's reply plus any
 * cart actions for the client widget to apply.
 */
export const dynamic = "force-dynamic";

const MAX_TURNS = 20;
const MAX_CHARS = 4000;

export async function POST(request: Request): Promise<Response> {
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

	const user = await getCurrentUser();

	try {
		const { text, actions, offline } = await runChat(history, { authed: !!user });
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
