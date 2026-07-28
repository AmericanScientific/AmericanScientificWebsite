"use client";

import { useRef } from "react";
import Link from "next/link";

/**
 * A next/link that tilts in 3D toward the cursor with a subtle glare — used for
 * product cards. "Turned up" but restrained (max ~9°). No-ops for touch and for
 * users who prefer reduced motion. Everything is transform/opacity so it stays
 * cheap; the transform resets on leave.
 */
const MAX_DEG = 9;

export function TiltLink({
	href,
	className,
	children,
}: {
	href: string;
	className?: string;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLAnchorElement>(null);
	const glare = useRef<HTMLSpanElement>(null);
	const raf = useRef<number | null>(null);

	function onMove(e: React.MouseEvent) {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const rect = el.getBoundingClientRect();
		const px = (e.clientX - rect.left) / rect.width; // 0..1
		const py = (e.clientY - rect.top) / rect.height;
		const rotY = (px - 0.5) * 2 * MAX_DEG;
		const rotX = -(py - 0.5) * 2 * MAX_DEG;
		if (raf.current) cancelAnimationFrame(raf.current);
		raf.current = requestAnimationFrame(() => {
			el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.02)`;
			if (glare.current) {
				glare.current.style.opacity = "1";
				glare.current.style.background = `radial-gradient(circle at ${(px * 100).toFixed(0)}% ${(py * 100).toFixed(0)}%, rgba(255,255,255,0.35), transparent 55%)`;
			}
		});
	}

	function reset() {
		const el = ref.current;
		if (!el) return;
		if (raf.current) cancelAnimationFrame(raf.current);
		el.style.transform = "";
		if (glare.current) glare.current.style.opacity = "0";
	}

	return (
		<Link
			ref={ref}
			href={href}
			onMouseMove={onMove}
			onMouseLeave={reset}
			className={className}
			style={{ transformStyle: "preserve-3d", transition: "transform 0.25s ease" }}
		>
			{children}
			<span
				ref={glare}
				aria-hidden
				className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-200"
			/>
		</Link>
	);
}
