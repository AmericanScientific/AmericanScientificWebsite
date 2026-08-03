"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide cursor motion. Mounted ONCE in the root layout.
 *
 * Two parts:
 *
 *  1. TRAIL — a lingering molecule trail following the cursor everywhere,
 *     deliberately matched to the laboratory category hero (`CategoryParticles`,
 *     `trail` mode) so the site speaks ONE cursor language instead of two. Same
 *     spawn count, lifetime, damping and drift. The one change is colour: the hero
 *     draws white on a saturated gradient, which is invisible on `#f6f7fb`, so
 *     these use the brand ramp, which reads on both grounds.
 *
 *     This replaces a large soft radial wash that was both too big and too faint.
 *     Sitting behind content at 32% it was barely there, and widening it only made
 *     it vaguer — a tight trail of solid dots is legible at a fraction of the area.
 *
 *  2. PANELS — the dark ink surfaces (`data-pointer-light`: footer, home hero, CTA
 *     band) keep their screen-blended brand radial, which only works on dark
 *     grounds. Unchanged.
 *
 * Deliberately NOT applied to product cards: `TiltLink` already tilts them toward
 * the cursor and paints a tracking glare.
 */

/** Brand ramp, same stops as HeroNetwork: red → plum → blue. */
const STOPS: [number, number, number][] = [
	[193, 18, 31],
	[122, 47, 143],
	[19, 145, 213],
];

function ramp(t: number): [number, number, number] {
	const seg = t <= 0.5 ? 0 : 1;
	const lt = seg === 0 ? t / 0.5 : (t - 0.5) / 0.5;
	const a = STOPS[seg];
	const b = STOPS[seg + 1];
	return [
		Math.round(a[0] + (b[0] - a[0]) * lt),
		Math.round(a[1] + (b[1] - a[1]) * lt),
		Math.round(a[2] + (b[2] - a[2]) * lt),
	];
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	r: number;
	c: [number, number, number];
}

/** Bounded so a fast sweep can't grow the field without limit (hero uses 800). */
const MAX_PARTICLES = 500;

export function PointerLight() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d") ?? null;

		const size = () => {
			if (!canvas || !ctx) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		size();

		const particles: Particle[] = [];
		const rand = (a: number, b: number) => a + Math.random() * (b - a);

		/** Which `[data-pointer-light]` surface the cursor is inside, and its cached rect. */
		let panel: HTMLElement | null = null;
		let rect: DOMRect | null = null;
		let cx = 0;
		let cy = 0;
		let plx = 0;
		let ply = 0;
		let panelSettled = false;
		let raf = 0;

		const clearPanel = () => {
			if (!panel) return;
			panel.removeAttribute("data-lit");
			panel = null;
			rect = null;
			panelSettled = false;
		};

		const frame = () => {
			raf = 0;

			// ── Trail ───────────────────────────────────────────────────────────
			if (ctx) {
				ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
				for (let i = particles.length - 1; i >= 0; i--) {
					const p = particles[i];
					// Lifetime, damping and drift copied from the laboratory hero, so the
					// two decay identically rather than merely looking similar.
					p.life -= 0.01;
					if (p.life <= 0) {
						particles.splice(i, 1);
						continue;
					}
					p.x += p.vx;
					p.y += p.vy;
					p.vx *= 0.985;
					p.vy *= 0.985;
					p.vy += 0.01;
					const r = p.r * (0.4 + 0.6 * p.life) + 0.4;
					ctx.globalAlpha = Math.max(0, p.life) * 0.9;
					ctx.beginPath();
					ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
					ctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
					ctx.fill();
					ctx.globalAlpha = 1;
				}
			}

			// ── Panel light ─────────────────────────────────────────────────────
			let panelMoving = false;
			if (panel && rect) {
				const tx = cx - rect.left;
				const ty = cy - rect.top;
				if (!panelSettled) {
					plx = tx;
					ply = ty;
					panelSettled = true;
				} else {
					// ~6-frame tail; trailing the pointer reads physical, chasing it reads cheap.
					plx += (tx - plx) * 0.16;
					ply += (ty - ply) * 0.16;
				}
				panel.style.setProperty("--gx", `${plx.toFixed(1)}px`);
				panel.style.setProperty("--gy", `${ply.toFixed(1)}px`);
				if (Math.abs(tx - plx) > 0.5 || Math.abs(ty - ply) > 0.5) panelMoving = true;
			}

			// Keep looping only while something still has to move or decay.
			if (particles.length > 0 || panelMoving) raf = requestAnimationFrame(frame);
		};

		const onMove = (e: PointerEvent) => {
			cx = e.clientX;
			cy = e.clientY;

			// 5 per move, same as the hero's trail mode.
			for (let k = 0; k < 5; k++) {
				particles.push({
					x: cx,
					y: cy,
					vx: rand(-2, 2),
					vy: rand(-2.6, 1.2),
					life: 1,
					r: rand(1.5, 4.5),
					c: ramp(Math.random()),
				});
			}
			if (particles.length > MAX_PARTICLES) {
				particles.splice(0, particles.length - MAX_PARTICLES);
			}

			const target = e.target as Element | null;
			const next = (target?.closest?.("[data-pointer-light]") as HTMLElement | null) ?? null;
			if (next !== panel) {
				clearPanel();
				if (next) {
					panel = next;
					rect = next.getBoundingClientRect();
					next.setAttribute("data-lit", "1");
				}
			}

			if (!raf) raf = requestAnimationFrame(frame);
		};

		/*
		 * A cached panel rect is only valid until the page moves under it, so
		 * re-measure on scroll/resize rather than on every pointer move.
		 */
		const remeasure = () => {
			if (panel) rect = panel.getBoundingClientRect();
			if (!raf) raf = requestAnimationFrame(frame);
		};
		const onResize = () => {
			size();
			remeasure();
		};
		/** Pointer left the window: drop the panel light; the trail decays out on its own. */
		const onLeave = () => clearPanel();

		window.addEventListener("pointermove", onMove, { passive: true });
		window.addEventListener("scroll", remeasure, { passive: true });
		window.addEventListener("resize", onResize);
		document.addEventListener("pointerleave", onLeave);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("scroll", remeasure);
			window.removeEventListener("resize", onResize);
			document.removeEventListener("pointerleave", onLeave);
			clearPanel();
		};
	}, []);

	return <canvas ref={canvasRef} className="pointer-trail" aria-hidden="true" />;
}
