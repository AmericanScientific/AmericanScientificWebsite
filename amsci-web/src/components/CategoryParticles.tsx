"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed, mouse-reactive particle field for the category hero — a <canvas>
 * behind the banner, with a behavior unique per category `variant`:
 *   - bubbles       (chemistry, laboratory): effervescence rising + popping
 *   - constellation (physics, phywe):        drifting nodes linked by lines + electrons
 *   - cells         (life-science):          soft drifting cells with nuclei + tendrils
 *   - sparkles      (special):               twinkling drifting stars
 * The cursor pushes/pulls particles. Client-only (drawn in an effect), rAF-
 * throttled, particle counts capped to viewport width, and prefers-reduced-motion
 * draws a single static frame (no loop).
 */

type Mode = "bubbles" | "constellation" | "cells" | "sparkles";

function modeFor(variant: string): Mode {
	switch (variant) {
		case "physics-physical-science":
		case "phywe":
			return "constellation";
		case "life-science":
			return "cells";
		case "special":
			return "sparkles";
		default:
			return "bubbles"; // chemistry, laboratory, fallback
	}
}

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
		const mode = modeFor(variant);
		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		let w = 0;
		let h = 0;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let parts: any[] = [];

		function counts(): number {
			if (mode === "bubbles") return Math.round(Math.min(480, w / 2.6));
			if (mode === "constellation") return Math.round(Math.min(260, w / 4.2));
			if (mode === "cells") return Math.round(Math.min(140, w / 7.5));
			return Math.round(Math.min(220, w / 5)); // sparkles
		}
		function mkBubble(seed: boolean) {
			const r = rand(3, 20);
			return { x: rand(0, w), y: seed ? rand(0, h) : h + r + rand(0, 50), r, vy: -(0.35 + r * 0.045 + rand(0, 0.4)), ph: rand(0, 6.28), amp: rand(6, 22), sp: rand(0.02, 0.05) };
		}
		function build() {
			const n = counts();
			parts = [];
			if (mode === "bubbles") {
				for (let i = 0; i < n; i++) parts.push(mkBubble(true));
			} else if (mode === "constellation") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), r: rand(1.3, 2.8), e: i < 6 });
			} else if (mode === "cells") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.25, 0.25), vy: rand(-0.2, 0.2), r: rand(8, 24), ph: rand(0, 6.28) });
			} else {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15), r: rand(2.5, 7), ph: rand(0, 6.28), sp: rand(0.02, 0.06) });
			}
		}
		function resize() {
			const r = parent.getBoundingClientRect();
			w = r.width;
			h = r.height;
			canvas.width = Math.max(1, w * dpr);
			canvas.height = Math.max(1, h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			build();
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

		function drawBubbles() {
			for (const b of parts) {
				b.y += b.vy;
				b.ph += b.sp;
				b.x += Math.sin(b.ph) * b.amp * 0.03;
				const dx = b.x - mouse.x, dy = b.y - mouse.y, d2 = dx * dx + dy * dy, R = 110;
				if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; b.x += (dx / d) * f * 4; b.y += (dy / d) * f * 2.5; }
				if (b.y < -b.r - 12 || b.x < -40 || b.x > w + 40) Object.assign(b, mkBubble(false));
				ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
				ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
				ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.stroke();
				ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, Math.max(0.6, b.r * 0.22), 0, 6.2832);
				ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
			}
		}
		function drawConstellation() {
			for (const p of parts) {
				p.x += p.vx; p.y += p.vy;
				const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy, R = 160;
				if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; p.vx += (dx / d) * f * 0.06; p.vy += (dy / d) * f * 0.06; }
				p.vx *= 0.99; p.vy *= 0.99;
				if (p.x < 0 || p.x > w) p.vx *= -1;
				if (p.y < 0 || p.y > h) p.vy *= -1;
			}
			for (let i = 0; i < parts.length; i++) {
				for (let j = i + 1; j < parts.length; j++) {
					const a = parts[i], b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
					if (d < 108) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(255,255,255,${0.26 * (1 - d / 108)})`; ctx.lineWidth = 1; ctx.stroke(); }
				}
			}
			for (const p of parts) {
				ctx.beginPath(); ctx.arc(p.x, p.y, p.e ? p.r + 1.5 : p.r, 0, 6.2832);
				ctx.fillStyle = p.e ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)"; ctx.fill();
				if (p.e) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, 6.2832); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke(); }
			}
		}
		function drawCells() {
			for (let i = 0; i < parts.length; i++) {
				for (let j = i + 1; j < parts.length; j++) {
					const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
					if (d < 130) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(255,255,255,${0.13 * (1 - d / 130)})`; ctx.lineWidth = 1; ctx.stroke(); }
				}
			}
			for (const c of parts) {
				c.x += c.vx; c.y += c.vy; c.ph += 0.02;
				const dx = c.x - mouse.x, dy = c.y - mouse.y, d2 = dx * dx + dy * dy, R = 130;
				if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; c.x += (dx / d) * f * 1.6; c.y += (dy / d) * f * 1.6; }
				if (c.x < -30) c.x = w + 30;
				if (c.x > w + 30) c.x = -30;
				if (c.y < -30) c.y = h + 30;
				if (c.y > h + 30) c.y = -30;
				const rr = c.r + Math.sin(c.ph) * 2;
				ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
				ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.stroke();
				ctx.beginPath(); ctx.arc(c.x, c.y, 2.2, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fill();
			}
		}
		function drawSparkles() {
			for (const s of parts) {
				s.x += s.vx; s.y += s.vy; s.ph += s.sp;
				const dx = s.x - mouse.x, dy = s.y - mouse.y, d2 = dx * dx + dy * dy, R = 120;
				if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; s.x += (dx / d) * f * 2; s.y += (dy / d) * f * 2; }
				if (s.x < -20) s.x = w + 20;
				if (s.x > w + 20) s.x = -20;
				if (s.y < -20) s.y = h + 20;
				if (s.y > h + 20) s.y = -20;
				const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.ph));
				const r = s.r * (0.7 + 0.5 * tw);
				ctx.save();
				ctx.translate(s.x, s.y);
				ctx.fillStyle = `rgba(255,255,255,${0.85 * tw})`;
				ctx.beginPath();
				ctx.moveTo(0, -r);
				ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
				ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
				ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
				ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
				ctx.fill();
				ctx.restore();
			}
		}

		let raf = 0;
		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			if (mode === "bubbles") drawBubbles();
			else if (mode === "constellation") drawConstellation();
			else if (mode === "cells") drawCells();
			else drawSparkles();
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
