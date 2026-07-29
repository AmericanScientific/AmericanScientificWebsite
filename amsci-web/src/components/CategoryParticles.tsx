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

type Mode = "bubbles" | "constellation" | "cells" | "sparkles" | "trail" | "diamonds";

function modeFor(variant: string): Mode {
	switch (variant) {
		case "physics-physical-science":
		case "phywe":
			return "constellation";
		case "life-science":
			return "cells";
		case "special":
			return "diamonds";
		case "laboratory":
			return "trail";
		default:
			return "bubbles"; // chemistry + fallback
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
			if (mode === "bubbles") return Math.round(Math.min(900, w / 1.6));
			if (mode === "constellation") return Math.round(Math.min(260, w / 4.2));
			if (mode === "cells") return Math.round(Math.min(140, w / 7.5));
			if (mode === "trail") return Math.round(Math.min(80, w / 16)); // sparse ambient motes
			if (mode === "diamonds") return Math.round(Math.min(100, w / 17));
			return Math.round(Math.min(220, w / 5)); // sparkles
		}
		function mkBubble(seed: boolean) {
			const r = rand(3, 20);
			return { x: rand(0, w), y: seed ? rand(0, h) : h + r + rand(0, 50), r, vy: -(0.35 + r * 0.045 + rand(0, 0.4)), ph: rand(0, 6.28), amp: rand(6, 22), sp: rand(0.02, 0.05) };
		}
		function mkDiamond() {
			return { x: rand(0, w), y: rand(0, h), vx: rand(-0.14, 0.14), vy: rand(-0.14, 0.14), base: rand(6, 11), scale: 0.2, target: 1, rot: rand(0, Math.PI), vr: rand(-0.004, 0.004), bob: rand(0, 6.28) };
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
			} else if (mode === "trail") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15), r: rand(1, 2.5) });
			} else if (mode === "diamonds") {
				for (let i = 0; i < n; i++) parts.push(Object.assign(mkDiamond(), { scale: 1 }));
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
		// Trail-mode particles + diamond-mode burst shards.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const trail: any[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const shards: any[] = [];
		const onMove = (e: MouseEvent) => {
			const r = canvas.getBoundingClientRect();
			mouse.x = e.clientX - r.left;
			mouse.y = e.clientY - r.top;
			if (mode === "trail") {
				for (let k = 0; k < 3; k++) {
					trail.push({ x: mouse.x, y: mouse.y, vx: rand(-0.8, 0.8), vy: rand(-1.2, 0.2), life: 1, r: rand(1.5, 4) });
				}
				if (trail.length > 400) trail.splice(0, trail.length - 400);
			}
		};
		const onLeave = () => {
			mouse.x = -9999;
			mouse.y = -9999;
			parent.style.cursor = "";
		};
		// Diamonds: click bursts the diamond under the pointer into shards.
		const onDown = (e: MouseEvent) => {
			if (mode !== "diamonds") return;
			const r = canvas.getBoundingClientRect();
			const px = e.clientX - r.left, py = e.clientY - r.top;
			let bi = -1, bd = Infinity;
			for (let i = 0; i < parts.length; i++) {
				const d = parts[i], dist = Math.hypot(d.x - px, d.y - py), drawn = d.base * d.scale;
				if (dist < drawn + 14 && dist < bd) { bd = dist; bi = i; }
			}
			if (bi < 0) return;
			const d = parts[bi];
			const k = 16;
			for (let j = 0; j < k; j++) {
				const a = (j / k) * 6.2832 + rand(-0.25, 0.25), sp = rand(1.6, 4.2);
				shards.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: d.base * rand(0.35, 0.6), life: 1, rot: rand(0, 6.28), vr: rand(-0.25, 0.25) });
			}
			parts.splice(bi, 1);
			parts.push(mkDiamond()); // respawn elsewhere so the field stays full
		};
		parent.addEventListener("mousemove", onMove);
		parent.addEventListener("mouseleave", onLeave);
		parent.addEventListener("pointerdown", onDown);

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

		function drawTrail() {
			// Quiet ambient motes so the banner isn't dead when idle.
			for (const p of parts) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -8) p.x = w + 8;
				if (p.x > w + 8) p.x = -8;
				if (p.y < -8) p.y = h + 8;
				if (p.y > h + 8) p.y = -8;
				ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
			}
			// Soft light following the cursor.
			if (mouse.x > -9000) {
				const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
				g.addColorStop(0, "rgba(255,255,255,0.18)");
				g.addColorStop(1, "rgba(255,255,255,0)");
				ctx.fillStyle = g;
				ctx.fillRect(mouse.x - 90, mouse.y - 90, 180, 180);
			}
			// Glowing molecule trail spawned by cursor movement; drifts + fades.
			for (let i = trail.length - 1; i >= 0; i--) {
				const t = trail[i];
				t.life -= 0.02;
				if (t.life <= 0) { trail.splice(i, 1); continue; }
				t.x += t.vx;
				t.y += t.vy;
				t.vy += 0.02;
				ctx.globalAlpha = Math.max(0, t.life);
				ctx.beginPath(); ctx.arc(t.x, t.y, t.r * t.life + 0.5, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
				ctx.globalAlpha = 1;
			}
		}

		function diamondPath(s: number) {
			ctx.beginPath();
			ctx.moveTo(0, -s);
			ctx.lineTo(s, 0);
			ctx.lineTo(0, s);
			ctx.lineTo(-s, 0);
			ctx.closePath();
		}
		function drawDiamonds() {
			// Nearest diamond under the cursor grows to 6×; the rest ease back to 1×.
			let hi = -1, hd = Infinity;
			if (mouse.x > -9000) {
				for (let i = 0; i < parts.length; i++) {
					const d = parts[i], dist = Math.hypot(d.x - mouse.x, d.y - mouse.y), drawn = d.base * d.scale;
					if (dist < drawn + 16 && dist < hd) { hd = dist; hi = i; }
				}
			}
			parent.style.cursor = hi >= 0 ? "pointer" : "";
			for (let i = 0; i < parts.length; i++) {
				const d = parts[i];
				d.target = i === hi ? 6 : 1;
				d.scale += (d.target - d.scale) * 0.18;
				d.bob += 0.02;
				d.rot += d.vr;
				d.x += d.vx + Math.sin(d.bob) * 0.06;
				d.y += d.vy + Math.cos(d.bob) * 0.06;
				if (d.x < -24) d.x = w + 24;
				if (d.x > w + 24) d.x = -24;
				if (d.y < -24) d.y = h + 24;
				if (d.y > h + 24) d.y = -24;
				const s = d.base * d.scale;
				ctx.save();
				ctx.translate(d.x, d.y);
				ctx.rotate(d.rot);
				diamondPath(s);
				ctx.fillStyle = `rgba(255,255,255,${0.16 + 0.1 * Math.min(1, d.scale - 1)})`;
				ctx.fill();
				ctx.lineWidth = 1.2;
				ctx.strokeStyle = "rgba(255,255,255,0.75)";
				ctx.stroke();
				// facet highlight
				ctx.beginPath();
				ctx.moveTo(0, -s);
				ctx.lineTo(-s, 0);
				ctx.lineTo(0, 0);
				ctx.closePath();
				ctx.fillStyle = "rgba(255,255,255,0.28)";
				ctx.fill();
				ctx.restore();
			}
			// Burst shards fly out + fade.
			for (let i = shards.length - 1; i >= 0; i--) {
				const f = shards[i];
				f.life -= 0.02;
				if (f.life <= 0) { shards.splice(i, 1); continue; }
				f.x += f.vx;
				f.y += f.vy;
				f.vx *= 0.96;
				f.vy *= 0.96;
				f.vy += 0.03;
				f.rot += f.vr;
				ctx.save();
				ctx.translate(f.x, f.y);
				ctx.rotate(f.rot);
				ctx.globalAlpha = Math.max(0, f.life);
				diamondPath(f.size);
				ctx.fillStyle = "rgba(255,255,255,0.5)";
				ctx.fill();
				ctx.lineWidth = 1;
				ctx.strokeStyle = "rgba(255,255,255,0.85)";
				ctx.stroke();
				ctx.globalAlpha = 1;
				ctx.restore();
			}
		}

		let raf = 0;
		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			if (mode === "bubbles") drawBubbles();
			else if (mode === "constellation") drawConstellation();
			else if (mode === "cells") drawCells();
			else if (mode === "trail") drawTrail();
			else if (mode === "diamonds") drawDiamonds();
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
			parent.removeEventListener("pointerdown", onDown);
			parent.style.cursor = "";
		};
	}, [variant]);

	return <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
