"use client";

import { useEffect } from "react";

/**
 * Pointer light on dark panels. Mounted ONCE in the root layout.
 *
 * The dark ink surfaces (`data-pointer-light`: footer, home hero, CTA band) carry
 * a screen-blended brand radial that tracks the cursor while it is inside them.
 * This component does nothing else and renders no DOM: it writes `--gx`/`--gy`
 * and a `data-lit` flag onto the panel, and the styling lives in `globals.css`.
 *
 * It previously also drew a molecule trail behind the cursor on every page,
 * modelled on the laboratory category hero. That was removed: an effect that
 * suits one hero band you look at once does not suit following the reader across
 * every page, on top of the content they are trying to read. Toning it down had
 * already been tried and the objection was to the thing itself, not its
 * intensity. The panel radial is kept because it reads as part of those three
 * surfaces rather than as a cursor effect, and only works on dark grounds.
 *
 * Product cards are deliberately untouched: `TiltLink` already tilts them toward
 * the cursor and paints a tracking glare.
 */
export function PointerLight() {
	useEffect(() => {
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
			if (!panel || !rect) return;

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

			// Keep looping only while the light still has ground to make up.
			if (Math.abs(tx - plx) > 0.5 || Math.abs(ty - ply) > 0.5) {
				raf = requestAnimationFrame(frame);
			}
		};

		const onMove = (e: PointerEvent) => {
			cx = e.clientX;
			cy = e.clientY;

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

			// Nothing to animate away from a panel now that the trail is gone.
			if (panel && !raf) raf = requestAnimationFrame(frame);
		};

		/*
		 * A cached panel rect is only valid until the page moves under it, so
		 * re-measure on scroll/resize rather than on every pointer move.
		 */
		const remeasure = () => {
			if (!panel) return;
			rect = panel.getBoundingClientRect();
			if (!raf) raf = requestAnimationFrame(frame);
		};
		/** Pointer left the window: drop the panel light. */
		const onLeave = () => clearPanel();

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

	return null;
}
