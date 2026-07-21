"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart/cart-context";

interface Msg {
	role: "user" | "assistant";
	content: string;
}

interface CartAction {
	type: "add_to_order";
	sku: string;
	qty: number;
	title: string;
	imageUrl: string;
}

const GREETING =
	"Hi! I'm the American Scientific assistant. Ask me to find products, compare options, or add items to your order.";

/**
 * Render inline markdown within a line: **bold**, *italic* / _italic_, `code`,
 * and [label](url) links. Dependency-free and safe (builds React nodes from
 * parsed tokens — no raw HTML). Bold is matched before italic so `**x**` wins.
 */
function renderInline(text: string, base: string): React.ReactNode[] {
	const nodes: React.ReactNode[] = [];
	const re =
		/\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((\/[^\s)]+|https?:\/\/[^\s)]+)\)|\*([^*\n]+)\*|_([^_\n]+)_/g;
	let last = 0;
	let k = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		if (m.index > last) nodes.push(text.slice(last, m.index));
		if (m[1] !== undefined) {
			// Recurse so nested markdown (e.g. a link inside **bold**) renders.
			nodes.push(<strong key={`${base}s${k}`}>{renderInline(m[1], `${base}s${k++}`)}</strong>);
		} else if (m[2] !== undefined) {
			nodes.push(
				<code key={`${base}c${k++}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]">
					{m[2]}
				</code>,
			);
		} else if (m[3] !== undefined) {
			nodes.push(
				<a
					key={`${base}l${k}`}
					href={m[4]}
					className="font-semibold text-brand-blue underline underline-offset-2 hover:opacity-80"
				>
					{renderInline(m[3], `${base}l${k++}`)}
				</a>,
			);
		} else {
			const it = m[5] ?? m[6] ?? "";
			nodes.push(<em key={`${base}i${k}`}>{renderInline(it, `${base}i${k++}`)}</em>);
		}
		last = re.lastIndex;
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}

/**
 * Render a markdown message: paragraphs, bullet/numbered lists, headings, and
 * inline formatting. Minimal on purpose (chat answers are short) and safe.
 */
function renderMarkdown(text: string): React.ReactNode {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const blocks: React.ReactNode[] = [];
	let i = 0;
	let key = 0;
	const bullet = /^\s*[-*]\s+/;
	const numbered = /^\s*\d+\.\s+/;
	const heading = /^\s*#{1,6}\s+/;

	while (i < lines.length) {
		if (/^\s*$/.test(lines[i])) {
			i++;
			continue;
		}
		if (heading.test(lines[i])) {
			const k = key++;
			blocks.push(
				<p key={k} className="font-semibold [&:not(:first-child)]:mt-2">
					{renderInline(lines[i].replace(heading, ""), `h${k}-`)}
				</p>,
			);
			i++;
			continue;
		}
		if (bullet.test(lines[i]) || numbered.test(lines[i])) {
			const ordered = numbered.test(lines[i]);
			const marker = ordered ? numbered : bullet;
			const items: string[] = [];
			while (i < lines.length && marker.test(lines[i])) {
				items.push(lines[i].replace(marker, ""));
				i++;
			}
			const k = key++;
			const cls = `my-1 space-y-0.5 pl-5 ${ordered ? "list-decimal" : "list-disc"}`;
			const children = items.map((it, j) => <li key={j}>{renderInline(it, `${k}-${j}-`)}</li>);
			blocks.push(
				ordered ? (
					<ol key={k} className={cls}>{children}</ol>
				) : (
					<ul key={k} className={cls}>{children}</ul>
				),
			);
			continue;
		}
		// Paragraph: consecutive plain lines, joined with <br/>.
		const para: string[] = [];
		while (
			i < lines.length &&
			!/^\s*$/.test(lines[i]) &&
			!bullet.test(lines[i]) &&
			!numbered.test(lines[i]) &&
			!heading.test(lines[i])
		) {
			para.push(lines[i]);
			i++;
		}
		const k = key++;
		const inline: React.ReactNode[] = [];
		para.forEach((ln, j) => {
			inline.push(...renderInline(ln, `${k}-${j}-`));
			if (j < para.length - 1) inline.push(<br key={`br${k}-${j}`} />);
		});
		blocks.push(
			<p key={k} className="[&:not(:first-child)]:mt-2">
				{inline}
			</p>,
		);
	}
	return blocks;
}

/**
 * Floating AI shopping assistant. Talks to /api/chat (server-side Claude +
 * catalog tools) and applies any cart actions the assistant returns to the
 * shared client cart — so the header badge stays in sync.
 */
export function ChatWidget() {
	const { addItem } = useCart();
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
	}, [messages, open, busy]);

	async function send() {
		const text = input.trim();
		if (!text || busy) return;
		setInput("");
		const next = [...messages, { role: "user" as const, content: text }];
		setMessages(next);
		setBusy(true);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				// Send only the real conversation turns (skip the canned greeting).
				body: JSON.stringify({ messages: next.filter((_, i) => i > 0 || next[0].role === "user") }),
			});
			let data: { message?: string; actions?: CartAction[] } = {};
			try {
				data = await res.json();
			} catch {
				/* non-JSON */
			}
			for (const a of data.actions ?? []) {
				if (a?.type === "add_to_order" && a.sku) {
					addItem({ sku: a.sku, title: a.title ?? a.sku, imageUrl: a.imageUrl ?? "" }, a.qty ?? 1);
				}
			}
			setMessages((cur) => [
				...cur,
				{ role: "assistant", content: data.message ?? "Sorry, I didn't catch that. Please try again." },
			]);
		} catch {
			setMessages((cur) => [...cur, { role: "assistant", content: "Network error. Please try again." }]);
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			{/* Launcher */}
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label={open ? "Close assistant" : "Open assistant"}
				className="brand-gradient fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-brand-blue/30 transition-transform hover:scale-105 active:scale-95"
			>
				{open ? (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				) : (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				)}
			</button>

			{/* Panel */}
			{open && (
				<div className="fixed bottom-24 right-5 z-[60] flex h-[32rem] max-h-[calc(100vh-8rem)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
					<div className="brand-gradient flex items-center gap-2 px-4 py-3 text-white">
						<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
						</svg>
						<span className="font-display text-sm font-bold">American Scientific Assistant</span>
					</div>

					<div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f6f7fb] p-3">
						{messages.map((m, i) => (
							<div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
								<div
									className={
										m.role === "user"
											? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-blue px-3.5 py-2 text-sm text-white"
											: "max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-700"
									}
								>
									{m.role === "assistant" ? renderMarkdown(m.content) : m.content}
								</div>
							</div>
						))}
						{busy && (
							<div className="flex justify-start">
								<div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5">
									<span className="flex gap-1">
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
									</span>
								</div>
							</div>
						)}
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							send();
						}}
						className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5"
					>
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Ask about products…"
							aria-label="Message the assistant"
							className="flex-1 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
						/>
						<button
							type="submit"
							disabled={busy || !input.trim()}
							aria-label="Send"
							className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
						>
							<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
							</svg>
						</button>
					</form>
				</div>
			)}
		</>
	);
}
