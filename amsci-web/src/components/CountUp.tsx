"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count-up number that animates from 0 → the numeric part of `value` when it
 * scrolls into view. `value` may carry a suffix/prefix (e.g. "100+", "302",
 * "100%") — the leading integer animates, the rest is preserved. Non-numeric
 * values (e.g. "Wholesale") render unchanged. Respects prefers-reduced-motion.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
	const match = /^(\D*)(\d[\d,]*)(.*)$/.exec(value.trim());
	const target = match ? parseInt(match[2].replace(/,/g, ""), 10) : NaN;
	const prefix = match?.[1] ?? "";
	const suffix = match?.[3] ?? "";

	const ref = useRef<HTMLSpanElement>(null);
	const [n, setN] = useState(0);
	const done = useRef(false);

	useEffect(() => {
		if (!match || !Number.isFinite(target)) return;
		const el = ref.current;
		if (!el) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce) {
			setN(target);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting || done.current) return;
				done.current = true;
				const duration = 1100;
				let start: number | null = null;
				const tick = (t: number) => {
					if (start === null) start = t;
					const p = Math.min(1, (t - start) / duration);
					// easeOutCubic
					const eased = 1 - Math.pow(1 - p, 3);
					setN(Math.round(target * eased));
					if (p < 1) requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			},
			{ threshold: 0.4 },
		);
		io.observe(el);
		return () => io.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!match || !Number.isFinite(target)) return <span className={className}>{value}</span>;
	return (
		<span ref={ref} className={className}>
			{prefix}
			{n.toLocaleString()}
			{suffix}
		</span>
	);
}
