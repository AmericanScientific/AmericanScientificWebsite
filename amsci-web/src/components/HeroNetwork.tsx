"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's signature motion graphic: a drifting particle network of
 * brand-gradient nodes (linked by proximity lines) wrapped in three tilted
 * orbital rings, each carrying a glowing traveling dot. Canvas-rendered so the
 * motion stays smooth; freezes under prefers-reduced-motion.
 *
 * Colors are the am-sci ramp red(#c1121f) → plum(#7a2f8f) → blue(#1391d5);
 * the ring dots use the lighter hero-gradient stops so they read on ink.
 *
 * The pointer is treated as one more node in the network: nodes inside its
 * reach bond to it, brighten, and lean toward it, then relax when it leaves.
 * Nothing is drawn AT the pointer — the converging bonds mark the spot, and the
 * OS cursor is already there, so a drawn dot would just read as a second one.
 */
type RGB = [number, number, number];

/** Sample the red→plum→blue brand ramp at t∈[0,1]. */
function ramp(t: number): RGB {
	const stops: RGB[] = [
		[193, 18, 31],
		[122, 47, 143],
		[19, 145, 213],
	];
	const seg = t <= 0.5 ? 0 : 1;
	const lt = seg === 0 ? t / 0.5 : (t - 0.5) / 0.5;
	const a = stops[seg];
	const b = stops[seg + 1];
	return [
		Math.round(a[0] + (b[0] - a[0]) * lt),
		Math.round(a[1] + (b[1] - a[1]) * lt),
		Math.round(a[2] + (b[2] - a[2]) * lt),
	];
}

export function HeroNetwork({
	label = "1,300+",
	sublabel = "Products in orbit",
	fill = false,
	showLabel = true,
}: {
	label?: string;
	sublabel?: string;
	/** Fill the positioned parent (ambient background) instead of a centered square. */
	fill?: boolean;
	/** Show the centered count label. Off for the ambient background variant. */
	showLabel?: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let W = 0;
		let H = 0;
		let raf = 0;

		const size = () => {
			const r = canvas.getBoundingClientRect();
			W = r.width;
			H = r.height;
			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		size();
		window.addEventListener("resize", size);

		const N = 26;
		const nodes = Array.from({ length: N }, (_, i) => {
			const ang = (i / N) * Math.PI * 2 + (i % 3);
			const rad = 0.18 + (((i * 97) % 100) / 100) * 0.34;
			return {
				x: 0.5 + Math.cos(ang) * rad,
				y: 0.5 + Math.sin(ang) * rad * 0.92,
				vx: ((((i * 53) % 100) / 100) - 0.5) * 0.00028,
				vy: ((((i * 31) % 100) / 100) - 0.5) * 0.00028,
				r: 1.6 + (((i * 17) % 30) / 10),
				c: ramp(((i * 37) % 100) / 100),
				/*
				 * Lean toward the pointer, held separately from (x, y) so the drift
				 * and the attraction never fight each other: drift keeps mutating
				 * the home position while this offset eases in and back out.
				 */
				hx: 0,
				hy: 0,
			};
		});

		/*
		 * Pointer tracking. The canvas itself can't listen — its container is
		 * `pointer-events-none` so the hero's links stay clickable — so we track on
		 * the window and convert into canvas space per frame. Coarse pointers get
		 * nothing to react to, so they skip the listener entirely.
		 */
		const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
		const interactive = fine && !reduce;
		/** Client coords; -1 once the pointer has left the canvas. */
		let clientX = -1;
		let clientY = -1;
		const onPointerMove = (e: PointerEvent) => {
			clientX = e.clientX;
			clientY = e.clientY;
		};
		if (interactive) {
			window.addEventListener("pointermove", onPointerMove, { passive: true });
		}

		/* Pointer position in normalized space, and whether it's in range at all. */
		let px = 0;
		let py = 0;
		let pOn = false;
		let pInit = false;

		const rings = [
			{ rx: 0.44, ry: 0.17, rot: -0.35, speed: 0.00022, phase: 0, c: [255, 128, 135] as RGB },
			{ rx: 0.4, ry: 0.4, rot: 0.6, speed: -0.00016, phase: 2, c: [226, 172, 239] as RGB },
			{ rx: 0.17, ry: 0.45, rot: 0.25, speed: 0.0003, phase: 4, c: [111, 208, 255] as RGB },
		];

		const start = performance.now();

		const frame = (now: number) => {
			const t = now - start;
			ctx.clearRect(0, 0, W, H);
			const cx = W / 2;
			const cy = H / 2;

			for (const ring of rings) {
				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(ring.rot);
				ctx.beginPath();
				ctx.ellipse(0, 0, ring.rx * W, ring.ry * H, 0, 0, Math.PI * 2);
				ctx.strokeStyle = "rgba(255,255,255,0.10)";
				ctx.lineWidth = 1;
				ctx.stroke();
				const a = ring.phase + t * ring.speed;
				const px = Math.cos(a) * ring.rx * W;
				const py = Math.sin(a) * ring.ry * H;
				const g = ctx.createRadialGradient(px, py, 0, px, py, 16);
				g.addColorStop(0, `rgba(${ring.c[0]},${ring.c[1]},${ring.c[2]},0.95)`);
				g.addColorStop(1, `rgba(${ring.c[0]},${ring.c[1]},${ring.c[2]},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(px, py, 16, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(${ring.c[0]},${ring.c[1]},${ring.c[2]},1)`;
				ctx.beginPath();
				ctx.arc(px, py, 2.4, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			/*
			 * Resolve the pointer into normalized space. The rect is measured every
			 * frame rather than cached on scroll, because <ScrollParallax> translates
			 * this element continuously — a rect cached on scroll events would drift
			 * out of step with the transform. One getBoundingClientRect on one
			 * element per frame is cheap; a stale offset would be visible.
			 */
			const REACH = W * 0.26;
			pOn = false;
			if (interactive && clientX >= 0 && W > 0 && H > 0) {
				const r = canvas.getBoundingClientRect();
				const lx = clientX - r.left;
				const ly = clientY - r.top;
				/*
				 * Allow a REACH-wide margin outside the canvas so edge nodes start
				 * reaching as the pointer approaches, instead of the whole field
				 * snapping on at the boundary.
				 */
				if (lx >= -REACH && lx <= r.width + REACH && ly >= -REACH && ly <= r.height + REACH) {
					const tx = lx / r.width;
					const ty = ly / r.height;
					if (!pInit) {
						px = tx;
						py = ty;
						pInit = true;
					} else {
						/*
						 * ~6-frame tail. Chasing the raw pointer reads cheap; trailing it
						 * reads like the field is responding to something with mass.
						 */
						px += (tx - px) * 0.16;
						py += (ty - py) * 0.16;
					}
					pOn = true;
				} else {
					pInit = false;
				}
			} else {
				pInit = false;
			}

			for (const n of nodes) {
				if (!reduce) {
					n.x += n.vx;
					n.y += n.vy;
					if (n.x < 0.06 || n.x > 0.94) n.vx *= -1;
					if (n.y < 0.06 || n.y > 0.94) n.vy *= -1;
				}

				/* Up to 12px of lean toward the pointer, easing back to rest when it goes. */
				let wantX = 0;
				let wantY = 0;
				if (pOn) {
					const dx = (px - n.x) * W;
					const dy = (py - n.y) * H;
					const d = Math.hypot(dx, dy);
					if (d < REACH && d > 0.001) {
						const pull = (1 - d / REACH) * 12;
						wantX = ((dx / d) * pull) / W;
						wantY = ((dy / d) * pull) / H;
					}
				}
				n.hx += (wantX - n.hx) * 0.08;
				n.hy += (wantY - n.hy) * 0.08;
			}

			/** How strongly the pointer is holding a node, 0…1. */
			const grip = (n: (typeof nodes)[number]) => {
				if (!pOn) return 0;
				const d = Math.hypot((px - (n.x + n.hx)) * W, (py - (n.y + n.hy)) * H);
				return d < REACH ? 1 - d / REACH : 0;
			};

			for (let i = 0; i < N; i++) {
				for (let j = i + 1; j < N; j++) {
					const a = nodes[i];
					const b = nodes[j];
					const dx = (a.x + a.hx - (b.x + b.hx)) * W;
					const dy = (a.y + a.hy - (b.y + b.hy)) * H;
					const d = Math.hypot(dx, dy);
					if (d < W * 0.22) {
						const alpha = (1 - d / (W * 0.22)) * 0.28;
						ctx.strokeStyle = `rgba(150,180,230,${alpha})`;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo((a.x + a.hx) * W, (a.y + a.hy) * H);
						ctx.lineTo((b.x + b.hx) * W, (b.y + b.hy) * H);
						ctx.stroke();
					}
				}
			}

			/*
			 * Pointer bonds. Drawn in the node's own ramp colour rather than the
			 * neutral link blue, so the pointer reads as having joined the structure
			 * instead of being a light shining on it.
			 */
			if (pOn) {
				for (const n of nodes) {
					const s = grip(n);
					if (s <= 0) continue;
					ctx.strokeStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${(s * 0.7).toFixed(3)})`;
					ctx.lineWidth = 0.6 + s * 1.4;
					ctx.beginPath();
					ctx.moveTo((n.x + n.hx) * W, (n.y + n.hy) * H);
					ctx.lineTo(px * W, py * H);
					ctx.stroke();
				}
				ctx.lineWidth = 1;
			}

			for (const n of nodes) {
				const x = (n.x + n.hx) * W;
				const y = (n.y + n.hy) * H;
				/* Held nodes swell and their halo widens — the bond has a cost. */
				const s = grip(n);
				const halo = n.r * 4 * (1 + s * 0.9);
				const g = ctx.createRadialGradient(x, y, 0, x, y, halo);
				g.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${(0.9 + s * 0.1).toFixed(3)})`);
				g.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(x, y, halo, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},1)`;
				ctx.beginPath();
				ctx.arc(x, y, n.r + s * 1.2, 0, Math.PI * 2);
				ctx.fill();
			}

			if (!reduce) raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", size);
			window.removeEventListener("pointermove", onPointerMove);
		};
	}, []);

	return (
		<div className={fill ? "absolute inset-0 h-full w-full" : "relative mx-auto aspect-square w-full max-w-md"}>
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
			{showLabel && (
				<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
					<div className="font-display text-3xl font-bold leading-none text-white">{label}</div>
					<div className="mt-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-slate-300">{sublabel}</div>
				</div>
			)}
		</div>
	);
}
