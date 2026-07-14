"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

interface Suggestion {
	slug: string;
	title: string;
	sku: string;
	category: string;
	price: number;
}

/**
 * Header search with live suggestions.
 *
 * Debounced typeahead against `/api/search` (aborting stale requests), a
 * keyboard-navigable results dropdown, and a "see all results" action that opens
 * the full `/search` page. Submitting (Enter with nothing highlighted) also goes
 * to `/search?q=…`.
 */
export function SearchBar({ className = "" }: { className?: string }) {
	const router = useRouter();
	const listId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const [q, setQ] = useState("");
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [total, setTotal] = useState(0);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(-1); // -1 = none highlighted

	// Debounced fetch of suggestions.
	useEffect(() => {
		const query = q.trim();
		if (!query) {
			setSuggestions([]);
			setTotal(0);
			setLoading(false);
			return;
		}
		setLoading(true);
		const t = setTimeout(async () => {
			abortRef.current?.abort();
			const ctrl = new AbortController();
			abortRef.current = ctrl;
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=7`, {
					signal: ctrl.signal,
				});
				const data = (await res.json()) as { total: number; suggestions: Suggestion[] };
				setSuggestions(data.suggestions ?? []);
				setTotal(data.total ?? 0);
				setActive(-1);
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					setSuggestions([]);
					setTotal(0);
				}
			} finally {
				setLoading(false);
			}
		}, 150);
		return () => clearTimeout(t);
	}, [q]);

	// Close on outside click.
	useEffect(() => {
		function onDown(e: MouseEvent) {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, []);

	function submitSearch() {
		const query = q.trim();
		if (!query) return;
		setOpen(false);
		router.push(`/search?q=${encodeURIComponent(query)}`);
	}

	function goTo(s: Suggestion) {
		setOpen(false);
		router.push(`/product/${encodeURIComponent(s.slug)}`);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setActive((i) => Math.min(i + 1, suggestions.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => Math.max(i - 1, -1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (open && active >= 0 && active < suggestions.length) goTo(suggestions[active]);
			else submitSearch();
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	const showPanel = open && q.trim().length > 0;

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<div className="relative">
				<svg
					viewBox="0 0 24 24"
					className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.8}
					strokeLinecap="round"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.2-3.2" />
				</svg>
				<input
					type="search"
					value={q}
					onChange={(e) => {
						setQ(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
					placeholder="Search products or SKU…"
					aria-label="Search catalog"
					aria-expanded={showPanel}
					aria-controls={listId}
					aria-autocomplete="list"
					role="combobox"
					className="w-full rounded-full border border-slate-200 bg-white/90 py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/20"
				/>
			</div>

			{showPanel && (
				<div
					id={listId}
					role="listbox"
					className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5"
				>
					{suggestions.length > 0 ? (
						<ul className="max-h-[22rem] overflow-y-auto py-1">
							{suggestions.map((s, i) => (
								<li key={`${s.slug}-${s.sku}`}>
									<button
										type="button"
										role="option"
										aria-selected={i === active}
										onMouseEnter={() => setActive(i)}
										onClick={() => goTo(s)}
										className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
											i === active ? "bg-slate-50" : "hover:bg-slate-50"
										}`}
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-slate-900">
												{s.title}
											</span>
											<span className="block truncate text-xs text-slate-400">
												{s.category} · SKU {s.sku}
											</span>
										</span>
										<span className="flex-none text-sm font-semibold text-slate-700 [font-variant-numeric:tabular-nums]">
											{formatPrice(s.price)}
										</span>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="px-4 py-6 text-center text-sm text-slate-400">
							{loading ? "Searching…" : `No matches for “${q.trim()}”`}
						</p>
					)}

					{total > 0 && (
						<button
							type="button"
							onClick={submitSearch}
							className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-left text-sm font-semibold text-brand-blue-deep transition-colors hover:bg-slate-100"
						>
							<span>
								See all {total} result{total === 1 ? "" : "s"} for “{q.trim()}”
							</span>
							<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M5 12h14M13 6l6 6-6 6" />
							</svg>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
