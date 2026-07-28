"use client";

import { useEffect, useRef } from "react";

/**
 * Translates its children vertically as the page scrolls, for a depth/parallax
 * effect on decorative hero layers. `speed` > 0 moves slower than scroll (drifts
 * up); negative moves the other way. Transform-only (cheap), rAF-throttled, and
 * disabled under prefers-reduced-motion.
 */
export function ScrollParallax({
	speed = 0.15,
	className,
	children,
}: {
	speed?: number;
	className?: string;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let ticking = false;
		const apply = () => {
			ticking = false;
			el.style.transform = `translate3d(0, ${(window.scrollY * speed).toFixed(1)}px, 0)`;
		};
		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(apply);
		};
		apply();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [speed]);

	return (
		<div ref={ref} className={className} style={{ willChange: "transform" }}>
			{children}
		</div>
	);
}
