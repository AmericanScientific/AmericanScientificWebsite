"use client";

import { useEffect } from "react";

/**
 * Site-wide pointer light for the dark brand surfaces.
 *
 * Mounted ONCE in the root layout. Any element tagged `data-pointer-light` gets
 * `--gx` / `--gy` (pointer position in that element's own space) and
 * `data-lit="1"` while the pointer is inside it; `globals.css` turns those into a
 * screen-blended brand radial. JS writes two numbers and a flag, nothing else.
 *
 * Why one global listener rather than per-panel handlers: the panels are dark
 * brand surfaces (footer on every page, the CTA band, the home hero) and the
 * footer alone would otherwise mean a listener on every route. Event delegation
 * through `closest()` makes the cost O(1) per pointer move regardless of how
 * many panels a page has, and only the panel actually under the pointer is ever
 * measured.
 *
 * Deliberately NOT applied to product cards: `TiltLink` already tilts them
 * toward the cursor and paints a tracking glare, and stacking a third
 * pointer effect on the same element is how a site starts to feel noisy rather
 * than responsive.
 */
export function PointerLight() {
	useEffect(() => {
		// Coarse pointers have nothing to track, and motion-sensitive visitors get
		// the page with no pointer-driven movement at all.
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		/** The panel currently lit, and its cached rect. */
		let active: HTMLElement | null = null;
		let rect: DOMRect | null = null;
		let raf = 0;
		let cx = 0;
		let cy = 0;
		/** Smoothed position, so the light trails the cursor instead of snapping to it. */
		let lx = 0;
		let ly = 0;
		let settled = false;

		const clear = () => {
			if (!active) return;
			active.removeAttribute("data-lit");
			active = null;
			rect = null;
			settled = false;
		};

		const frame = () => {
			raf = 0;
			if (!active || !rect) return;
			const tx = cx - rect.left;
			const ty = cy - rect.top;
			if (!settled) {
				lx = tx;
				ly = ty;
				settled = true;
			} else {
				// ~6-frame tail. Chasing the raw pointer reads cheap; trailing it reads
				// like the light is attached to something with mass.
				lx += (tx - lx) * 0.16;
				ly += (ty - ly) * 0.16;
			}
			active.style.setProperty("--gx", `${lx.toFixed(1)}px`);
			active.style.setProperty("--gy", `${ly.toFixed(1)}px`);
			// Keep easing until it has essentially caught up.
			if (Math.abs(tx - lx) > 0.5 || Math.abs(ty - ly) > 0.5) {
				raf = requestAnimationFrame(frame);
			}
		};

		const onMove = (e: PointerEvent) => {
			const target = e.target as Element | null;
			const panel = target?.closest?.("[data-pointer-light]") as HTMLElement | null;

			if (!panel) {
				clear();
				return;
			}
			if (panel !== active) {
				clear();
				active = panel;
				rect = panel.getBoundingClientRect();
				panel.setAttribute("data-lit", "1");
			}
			cx = e.clientX;
			cy = e.clientY;
			if (!raf) raf = requestAnimationFrame(frame);
		};

		/*
		 * The cached rect is only valid until the page moves under it. Re-measure on
		 * scroll/resize rather than per pointer move, so a stationary cursor over a
		 * scrolling page still lights the right spot.
		 */
		const remeasure = () => {
			if (active) rect = active.getBoundingClientRect();
		};

		window.addEventListener("pointermove", onMove, { passive: true });
		window.addEventListener("scroll", remeasure, { passive: true });
		window.addEventListener("resize", remeasure);
		// A pointer leaving the window never fires a final move inside a panel.
		document.addEventListener("pointerleave", clear);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("scroll", remeasure);
			window.removeEventListener("resize", remeasure);
			document.removeEventListener("pointerleave", clear);
			clear();
		};
	}, []);

	return null;
}
