"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal driver. Any element tagged `.reveal` (server-rendered) rises,
 * fades, and scales into place the first time it enters the viewport. Children
 * of a `.reveal-stagger` container are auto-tagged and delayed in sequence so a
 * grid animates in as a wave rather than all at once.
 *
 * Renders nothing; the transition itself lives in globals.css (`.reveal` /
 * `.reveal.in`) so reduced-motion users get the fully-shown state with no work.
 */
export function RevealOnScroll() {
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
			return;
		}

		document.querySelectorAll<HTMLElement>(".reveal-stagger").forEach((group) => {
			Array.from(group.children).forEach((child, i) => {
				const el = child as HTMLElement;
				el.classList.add("reveal");
				el.style.transitionDelay = `${i * 80}ms`;
			});
		});

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						e.target.classList.add("in");
						io.unobserve(e.target);
					}
				}
			},
			{ threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
		);

		const els = document.querySelectorAll(".reveal");
		els.forEach((el) => io.observe(el));

		return () => io.disconnect();
	}, []);

	return null;
}
