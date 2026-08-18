"use client";

import { useEffect, useState } from "react";

/** Scroll distance before the button is worth offering. */
const SHOW_AFTER_PX = 500;

/**
 * Floating "back to top" control, stacked directly above the chat launcher.
 *
 * Hidden until the page is scrolled far enough that returning to the top is a
 * real chore, so it does not clutter short pages. It also disappears while the
 * chat panel is open: that panel occupies the space this button sits in, and
 * rather than couple the two components in React, ChatWidget marks the document
 * and a CSS rule in globals.css hides this one.
 */
export function BackToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
		onScroll(); // a reload can restore a scrolled position
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	function toTop() {
		// Honour reduced-motion: a long smooth scroll is exactly the kind of
		// large-area movement that setting exists to avoid.
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
	}

	return (
		<button
			type="button"
			onClick={toTop}
			aria-label="Back to top"
			title="Back to top"
			// aria-hidden + tabIndex track visibility so the button is not a
			// focusable target sitting invisibly over the page.
			aria-hidden={!visible}
			tabIndex={visible ? 0 : -1}
			className={`back-to-top fixed bottom-[5.25rem] right-5 z-[59] flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg shadow-slate-900/10 transition-all hover:border-slate-300 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
				visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
			}`}
		>
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M12 19V5M5 12l7-7 7 7" />
			</svg>
		</button>
	);
}
