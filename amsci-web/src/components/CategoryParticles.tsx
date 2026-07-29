"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed, mouse-reactive particle field for the category hero — a <canvas>
 * behind the banner, with a behavior unique per category `variant`:
 *   - bubbles       (chemistry):    dense effervescence rising + popping
 *   - constellation (physics,phywe): drifting nodes linked by lines + electrons
 *   - biolum        (life-science): glowing plankton that pulse, drift, and gather to the cursor
 *   - trail         (laboratory):   quiet field + a lingering molecule trail on
 *                                   hover, over a faint graph-paper texture
 *   - diamonds      (special):      floating diamonds; hover grows the nearest to
 *                                   6×, click shatters it into smaller diamonds
 *                                   that linger and are themselves hoverable/
 *                                   clickable (recursive) until they're tiny
 * Client-only (drawn in an effect), rAF-throttled, particle counts capped to
 * viewport width, and prefers-reduced-motion draws a single static frame.
 */

type Mode = "bubbles" | "constellation" | "biolum" | "trail" | "diamonds";

function modeFor(variant: string): Mode {
	switch (variant) {
		case "physics-physical-science":
		case "phywe":
			return "constellation";
		case "life-science":
			return "biolum";
		case "special":
			return "diamonds";
		case "laboratory":
			return "trail";
		default:
			return "bubbles"; // chemistry + fallback
	}
}

const MIN_DIAMOND = 3.6;
const MAX_DIAMONDS = 200;

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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const trail: any[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const shards: any[] = [];

		function counts(): number {
			if (mode === "bubbles") return Math.round(Math.min(900, w / 1.6));
			if (mode === "constellation") return Math.round(Math.min(260, w / 4.2));
			if (mode === "biolum") return Math.round(Math.min(120, w / 12));
			if (mode === "trail") return Math.round(Math.min(80, w / 16));
			return Math.round(Math.min(100, w / 17)); // diamonds
		}
		function mkBubble(seed: boolean) {
			const r = rand(3, 20);
			return { x: rand(0, w), y: seed ? rand(0, h) : h + r + rand(0, 50), r, vy: -(0.35 + r * 0.045 + rand(0, 0.4)), ph: rand(0, 6.28), amp: rand(6, 22), sp: rand(0.02, 0.05) };
		}
		function mkDiamond(base = rand(6, 12), x = rand(0, w), y = rand(0, h), vx = 0, vy = 0) {
			return { x, y, dx: rand(-0.12, 0.12), dy: rand(-0.12, 0.12), vx, vy, base, scale: 1, target: 1, bob: rand(0, 6.28) };
		}
		function build() {
			const n = counts();
			parts = [];
			if (mode === "bubbles") {
				for (let i = 0; i < n; i++) parts.push(mkBubble(true));
			} else if (mode === "constellation") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), r: rand(1.3, 2.8), e: i < 6 });
			} else if (mode === "biolum") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), r: rand(1.5, 3.6), ph: rand(0, 6.28), sp: rand(0.02, 0.05) });
			} else if (mode === "trail") {
				for (let i = 0; i < n; i++) parts.push({ x: rand(0, w), y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.15, 0.15), r: rand(1, 2.5) });
			} else {
				for (let i = 0; i < n; i++) parts.push(mkDiamond());
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
			if (mode === "trail") {
				// Bigger spread: more per move, wider launch velocity.
				for (let k = 0; k < 5; k++) {
					trail.push({ x: mouse.x, y: mouse.y, vx: rand(-2, 2), vy: rand(-2.6, 1.2), life: 1, r: rand(1.5, 4.5) });
				}
				if (trail.length > 800) trail.splice(0, trail.length - 800);
			}
		};
		const onLeave = () => {
			mouse.x = -9999;
			mouse.y = -9999;
			parent.style.cursor = "";
		};
		// Diamonds: click shatters the diamond under the pointer.
		const onDown = (e: MouseEvent) => {
			if (mode !== "diamonds") return;
			const r = canvas.getBoundingClientRect();
			const px = e.clientX - r.left, py = e.clientY - r.top;
			let bi = -1, bd = Infinity;
			for (let i = 0; i < parts.length; i++) {
				const d = parts[i], dist = Math.hypot(d.x - px, d.y - py), drawn = d.base * d.scale;
				if (dist < drawn + 16 && dist < bd) { bd = dist; bi = i; }
			}
			if (bi < 0) return;
			const d = parts[bi];
			parts.splice(bi, 1);
			if (d.base > MIN_DIAMOND && parts.length < MAX_DIAMONDS) {
				// Shatter into smaller INTERACTIVE diamonds that fly out then settle.
				const k = 4;
				for (let j = 0; j < k; j++) {
					const a = (j / k) * 6.2832 + rand(-0.3, 0.3), sp = rand(2, 4.5);
					parts.push(mkDiamond(d.base * 0.62, d.x, d.y, Math.cos(a) * sp, Math.sin(a) * sp));
				}
			} else {
				// Too small (or field full): terminal sparkle-burst + one fresh diamond.
				for (let j = 0; j < 12; j++) {
					const a = (j / 12) * 6.2832 + rand(-0.25, 0.25), sp = rand(1.4, 3.6);
					shards.push({ x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: d.base * rand(0.4, 0.7), life: 1, rot: rand(0, 6.28), vr: rand(-0.25, 0.25) });
				}
				parts.push(mkDiamond());
			}
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
		function drawBiolum() {
			for (const o of parts) {
				o.ph += o.sp;
				o.x += o.vx;
				o.y += o.vy;
				// Drawn toward the cursor (like organisms to light) + brighten near it.
				let near = 0;
				if (mouse.x > -9000) {
					const dx = mouse.x - o.x, dy = mouse.y - o.y, d2 = dx * dx + dy * dy, R = 150;
					if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (R - d) / R; o.vx += (dx / d) * f * 0.04; o.vy += (dy / d) * f * 0.04; near = f; }
				}
				o.vx *= 0.98;
				o.vy *= 0.98;
				if (o.x < -12) o.x = w + 12;
				if (o.x > w + 12) o.x = -12;
				if (o.y < -12) o.y = h + 12;
				if (o.y > h + 12) o.y = -12;
				const pulse = 0.5 + 0.5 * Math.sin(o.ph);
				const bright = Math.min(1, 0.32 + 0.5 * pulse + near * 0.6);
				const r = o.r * (0.8 + 0.4 * pulse);
				// Soft bioluminescent glow (minty cyan) + a bright core.
				const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 4.5);
				g.addColorStop(0, `rgba(190,255,225,${0.5 * bright})`);
				g.addColorStop(1, "rgba(190,255,225,0)");
				ctx.fillStyle = g;
				ctx.beginPath(); ctx.arc(o.x, o.y, r * 4.5, 0, 6.2832); ctx.fill();
				ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.2832); ctx.fillStyle = `rgba(240,255,248,${bright})`; ctx.fill();
			}
		}
		function drawTrail() {
			// Faint graph-paper texture behind everything (laboratory notebook feel).
			ctx.strokeStyle = "rgba(255,255,255,0.05)";
			ctx.lineWidth = 1;
			for (let gx = 0; gx <= w; gx += 42) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
			for (let gy = 0; gy <= h; gy += 42) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
			// Quiet ambient motes.
			for (const p of parts) {
				p.x += p.vx; p.y += p.vy;
				if (p.x < -8) p.x = w + 8;
				if (p.x > w + 8) p.x = -8;
				if (p.y < -8) p.y = h + 8;
				if (p.y > h + 8) p.y = -8;
				ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
			}
			// Soft light following the cursor.
			if (mouse.x > -9000) {
				const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
				g.addColorStop(0, "rgba(255,255,255,0.18)");
				g.addColorStop(1, "rgba(255,255,255,0)");
				ctx.fillStyle = g;
				ctx.fillRect(mouse.x - 100, mouse.y - 100, 200, 200);
			}
			// Molecule trail — bigger spread, lingers longer (slow fade + damping).
			for (let i = trail.length - 1; i >= 0; i--) {
				const t = trail[i];
				t.life -= 0.01;
				if (t.life <= 0) { trail.splice(i, 1); continue; }
				t.x += t.vx;
				t.y += t.vy;
				t.vx *= 0.985;
				t.vy *= 0.985;
				t.vy += 0.01;
				ctx.globalAlpha = Math.max(0, t.life);
				ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.4 + 0.6 * t.life) + 0.4, 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
				ctx.globalAlpha = 1;
			}
		}
		function diamondPath(s: number) {
			ctx.beginPath();
			ctx.moveTo(0, -s * 1.15);
			ctx.lineTo(s * 0.8, 0);
			ctx.lineTo(0, s * 1.15);
			ctx.lineTo(-s * 0.8, 0);
			ctx.closePath();
		}
		function drawDiamonds() {
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
				d.vx *= 0.9;
				d.vy *= 0.9;
				d.bob += 0.02;
				d.x += d.dx + d.vx + Math.sin(d.bob) * 0.05;
				d.y += d.dy + d.vy + Math.cos(d.bob) * 0.05;
				if (d.x < -24) d.x = w + 24;
				if (d.x > w + 24) d.x = -24;
				if (d.y < -24) d.y = h + 24;
				if (d.y > h + 24) d.y = -24;
				const s = d.base * d.scale;
				ctx.save();
				ctx.translate(d.x, d.y);
				diamondPath(s);
				ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.12 * Math.min(1, d.scale - 1)})`;
				ctx.fill();
				ctx.lineWidth = 1.2;
				ctx.strokeStyle = "rgba(255,255,255,0.8)";
				ctx.stroke();
				// Gem facets: crown ridge + a bright left face.
				ctx.beginPath();
				ctx.moveTo(-s * 0.8, 0);
				ctx.lineTo(s * 0.8, 0);
				ctx.moveTo(0, -s * 1.15);
				ctx.lineTo(0, s * 1.15);
				ctx.strokeStyle = "rgba(255,255,255,0.35)";
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, -s * 1.15);
				ctx.lineTo(-s * 0.8, 0);
				ctx.lineTo(0, 0);
				ctx.closePath();
				ctx.fillStyle = "rgba(255,255,255,0.3)";
				ctx.fill();
				ctx.restore();
			}
			// Terminal shards (only from the smallest diamonds) drift + fade.
			for (let i = shards.length - 1; i >= 0; i--) {
				const f = shards[i];
				f.life -= 0.015;
				if (f.life <= 0) { shards.splice(i, 1); continue; }
				f.x += f.vx;
				f.y += f.vy;
				f.vx *= 0.96;
				f.vy *= 0.96;
				f.rot += f.vr;
				ctx.save();
				ctx.translate(f.x, f.y);
				ctx.rotate(f.rot);
				ctx.globalAlpha = Math.max(0, f.life);
				diamondPath(f.size);
				ctx.fillStyle = "rgba(255,255,255,0.55)";
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.restore();
			}
		}

		let raf = 0;
		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			if (mode === "bubbles") drawBubbles();
			else if (mode === "constellation") drawConstellation();
			else if (mode === "biolum") drawBiolum();
			else if (mode === "trail") drawTrail();
			else drawDiamonds();
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
