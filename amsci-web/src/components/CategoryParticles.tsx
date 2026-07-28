"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed, mouse-reactive particle field for the category hero — a <canvas>
 * behind the banner content, with behavior unique per category `variant`.
 * Client-only (drawn in an effect, so no SSR/hydration concern). Caps particle
 * count to viewport width, throttles via rAF, and honors prefers-reduced-motion
 * (draws a single static frame, no loop).
 *
 * v1 implements `chemistry` (rising, wobbling, popping bubbles that dodge the
 * cursor). Other variants use a gentle floating fallback until their bespoke
 * behavior lands.
 */
export function CategoryParticles({ variant }: { variant: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const cv = canvasRef.current;
		if (!cv || !cv.parentElement) return;
		const canvas: HTMLCanvasElement = cv;
		const parent: HTMLElement = cv.parentElement;
		const context = canvas.getContext("2d");
		if (!context) return;
		const ctx: CanvasRenderingContext2D = context;

		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let w = 0;
		let h = 0;

		function resize() {
			const r = parent.getBoundingClientRect();
			w = r.width;
			h = r.height;
			canvas.width = Math.max(1, w * dpr);
			canvas.height = Math.max(1, h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(parent);

		const mouse = { x: -9999, y: -9999 };
		const onMove = (e: MouseEvent) => {
			const r = canvas.getBoundingClientRect();
			mouse.x = e.clientX - r.left;
			mouse.y = e.clientY - r.top;
		};
		const onLeave = () => {
			mouse.x = -9999;
			mouse.y = -9999;
		};
		parent.addEventListener("mousemove", onMove);
		parent.addEventListener("mouseleave", onLeave);

		interface Bubble {
			x: number;
			y: number;
			r: number;
			vy: number;
			ph: number;
			amp: number;
			spin: number;
		}
		const isChem = variant === "chemistry";
		const count = Math.round(Math.min(isChem ? 110 : 70, w / (isChem ? 11 : 16)));

		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const make = (seeded: boolean): Bubble => {
			const r = isChem ? rand(3, 20) : rand(2, 6);
			return {
				x: rand(0, w),
				y: seeded ? rand(0, h) : h + r + rand(0, 60),
				r,
				vy: -(0.35 + r * 0.045 + rand(0, 0.4)),
				ph: rand(0, Math.PI * 2),
				amp: rand(6, 22),
				spin: rand(0.02, 0.05),
			};
		};
		const bubbles: Bubble[] = Array.from({ length: count }, () => make(true));

		let raf = 0;
		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			for (const b of bubbles) {
				b.y += b.vy;
				b.ph += b.spin;
				b.x += Math.sin(b.ph) * b.amp * 0.03;

				// Cursor repels bubbles (interactive dodge).
				const dx = b.x - mouse.x;
				const dy = b.y - mouse.y;
				const d2 = dx * dx + dy * dy;
				const R = 110;
				if (d2 < R * R) {
					const d = Math.sqrt(d2) || 1;
					const f = (R - d) / R;
					b.x += (dx / d) * f * 4;
					b.y += (dy / d) * f * 2.5;
				}

				if (b.y < -b.r - 12 || b.x < -40 || b.x > w + 40) Object.assign(b, make(false));

				// Bubble: soft fill, bright rim, little highlight.
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255,255,255,0.07)";
				ctx.fill();
				ctx.lineWidth = 1.2;
				ctx.strokeStyle = "rgba(255,255,255,0.4)";
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, Math.max(0.6, b.r * 0.22), 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255,255,255,0.55)";
				ctx.fill();
			}
			raf = requestAnimationFrame(draw);
		};

		if (reduce) {
			draw();
			cancelAnimationFrame(raf);
		} else {
			draw();
		}

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			parent.removeEventListener("mousemove", onMove);
			parent.removeEventListener("mouseleave", onLeave);
		};
	}, [variant]);

	return <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
