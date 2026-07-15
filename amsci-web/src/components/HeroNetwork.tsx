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
			};
		});

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

			for (const n of nodes) {
				if (!reduce) {
					n.x += n.vx;
					n.y += n.vy;
					if (n.x < 0.06 || n.x > 0.94) n.vx *= -1;
					if (n.y < 0.06 || n.y > 0.94) n.vy *= -1;
				}
			}

			for (let i = 0; i < N; i++) {
				for (let j = i + 1; j < N; j++) {
					const a = nodes[i];
					const b = nodes[j];
					const dx = (a.x - b.x) * W;
					const dy = (a.y - b.y) * H;
					const d = Math.hypot(dx, dy);
					if (d < W * 0.22) {
						const alpha = (1 - d / (W * 0.22)) * 0.28;
						ctx.strokeStyle = `rgba(150,180,230,${alpha})`;
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(a.x * W, a.y * H);
						ctx.lineTo(b.x * W, b.y * H);
						ctx.stroke();
					}
				}
			}

			for (const n of nodes) {
				const x = n.x * W;
				const y = n.y * H;
				const g = ctx.createRadialGradient(x, y, 0, x, y, n.r * 4);
				g.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.9)`);
				g.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(x, y, n.r * 4, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},1)`;
				ctx.beginPath();
				ctx.arc(x, y, n.r, 0, Math.PI * 2);
				ctx.fill();
			}

			if (!reduce) raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", size);
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
