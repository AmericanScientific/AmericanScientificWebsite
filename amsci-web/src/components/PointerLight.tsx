"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide pointer light. Mounted ONCE in the root layout.
 *
 * Two layers, because a single technique cannot work on both grounds:
 *
 *  1. PANELS — any element tagged `data-pointer-light` (the footer, the home
 *     hero, the CTA band). These are dark ink/mesh surfaces, so the light is
 *     screen-blended and ADDS light; it can never read as a grey disc.
 *
 *  2. AMBIENT — one fixed, viewport-sized layer behind all page content, for the
 *     light pages. `screen` does nothing over white, so this one is a very faint
 *     brand tint at normal blend instead. It sits at `z-index: -1`, which paints
 *     it above the propagated `#f6f7fb` canvas but below every in-flow element —
 *     so white cards and panels occlude it and it only shows in the gutters
 *     between them. That occlusion IS the subtlety: it tints the empty space and
 *     nothing else.
 *
 * JS only ever writes custom properties; CSS does the rendering. Nothing here
 * touches layout or paints content.
 *
 * Deliberately NOT applied to product cards: `TiltLink` already tilts them
 * toward the cursor and paints a tracking glare, and a third pointer effect on
 * the same element is how a site starts reading as noisy rather than responsive.
 */
export function PointerLight() {
	const ambientRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		// Coarse pointers have nothing to track, and motion-sensitive visitors get
		// the page with no pointer-driven movement at all.
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const ambient = ambientRef.current;

		/** Latest raw pointer position, in viewport space. */
		let cx = 0;
		let cy = 0;
		let seen = false;

		/** The panel currently lit, and its cached rect. */
		let panel: HTMLElement | null = null;
		let rect: DOMRect | null = null;

		/** Smoothed positions. Panel-local for the panel, viewport for the ambient. */
		let plx = 0;
		let ply = 0;
		let panelSettled = false;
		let alx = 0;
		let aly = 0;
		let ambientSettled = false;

		let raf = 0;

		const clearPanel = () => {
			if (!panel) return;
			panel.removeAttribute("data-lit");
			panel = null;
			rect = null;
			panelSettled = false;
		};

		/*
		 * ~6-frame tail. Chasing the raw pointer reads cheap; trailing it reads like
		 * the light is attached to something with mass. Returns whether it is still
		 * catching up, so the loop can stop once everything has settled.
		 */
		const EASE = 0.16;
		const frame = () => {
			raf = 0;
			let moving = false;

			if (panel && rect) {
				const tx = cx - rect.left;
				const ty = cy - rect.top;
				if (!panelSettled) {
					plx = tx;
					ply = ty;
					panelSettled = true;
				} else {
					plx += (tx - plx) * EASE;
					ply += (ty - ply) * EASE;
				}
				panel.style.setProperty("--gx", `${plx.toFixed(1)}px`);
				panel.style.setProperty("--gy", `${ply.toFixed(1)}px`);
				if (Math.abs(tx - plx) > 0.5 || Math.abs(ty - ply) > 0.5) moving = true;
			}

			if (ambient) {
				if (!ambientSettled) {
					alx = cx;
					aly = cy;
					ambientSettled = true;
					// Fade in on first movement rather than flashing in at 0,0.
					ambient.setAttribute("data-seen", "1");
				} else {
					// Slower than the panel light: a broad, quiet wash should lag further
					// behind the cursor than a tight spotlight does.
					alx += (cx - alx) * 0.09;
					aly += (cy - aly) * 0.09;
				}
				ambient.style.setProperty("--ax", `${alx.toFixed(1)}px`);
				ambient.style.setProperty("--ay", `${aly.toFixed(1)}px`);
				if (Math.abs(cx - alx) > 0.5 || Math.abs(cy - aly) > 0.5) moving = true;
			}

			if (moving) raf = requestAnimationFrame(frame);
		};

		const onMove = (e: PointerEvent) => {
			cx = e.clientX;
			cy = e.clientY;
			seen = true;

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
		 * A cached panel rect is only valid until the page moves under it. Re-measure
		 * on scroll/resize rather than per pointer move, so a stationary cursor over
		 * a scrolling page still lights the right spot.
		 */
		const remeasure = () => {
			if (panel) rect = panel.getBoundingClientRect();
			if (seen && !raf) raf = requestAnimationFrame(frame);
		};

		/** Pointer left the window: no further move fires, so wind both layers down. */
		const onLeave = () => {
			clearPanel();
			ambient?.removeAttribute("data-seen");
			ambientSettled = false;
		};

		window.addEventListener("pointermove", onMove, { passive: true });
		window.addEventListener("scroll", remeasure, { passive: true });
		window.addEventListener("resize", remeasure);
		document.addEventListener("pointerleave", onLeave);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("scroll", remeasure);
			window.removeEventListener("resize", remeasure);
			document.removeEventListener("pointerleave", onLeave);
			clearPanel();
		};
	}, []);

	return <div ref={ambientRef} className="pointer-ambient" aria-hidden="true" />;
}
