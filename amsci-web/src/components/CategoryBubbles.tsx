"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
	forceSimulation,
	forceCollide,
	forceX,
	forceY,
	type Simulation,
	type SimulationNodeDatum,
} from "d3-force";

/** One product, ready to render as a bubble. Built on the server (see page.tsx). */
export interface BubbleItem {
	id: string;
	slug: string;
	title: string;
	/** Same-origin `/api/media` proxy URL for the product image. */
	src: string;
}

interface BubbleNode extends SimulationNodeDatum {
	id: string;
	slug: string;
	title: string;
	src: string;
	baseR: number;
	/** Animated radius (eases toward baseR, or baseR * HOVER_SCALE when hovered). */
	curR: number;
}

const R_MIN = 30;
const R_MAX = 62;
const GAP = 5; // keeps bubbles close but not touching
const HOVER_SCALE = 1.7;
const MAX_BUBBLES = 16;

/** Fisher–Yates shuffle (client-only; Math.random is fine here). */
function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * A collage of product-image "bubbles" for one top-level category, packed with a
 * d3-force collision simulation. Bubbles never overlap; hovering one grows it and
 * the collision force nudges its neighbors aside. Clicking a bubble opens that
 * product. Rendered inside the expanded hero category panel.
 */
export function CategoryBubbles({ items }: { items: BubbleItem[] }) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const elsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
	const hoverRef = useRef<string | null>(null);
	const [empty, setEmpty] = useState(false);
	const [nodeList, setNodeList] = useState<BubbleNode[]>([]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const W = container.clientWidth;
		const H = container.clientHeight;
		if (W === 0 || H === 0) return;

		// Products in this category that have an image (already filtered server-side).
		if (items.length === 0) {
			setEmpty(true);
			return;
		}

		const count = Math.min(items.length, MAX_BUBBLES);
		const nodes: BubbleNode[] = shuffle(items)
			.slice(0, count)
			.map((p) => {
				const baseR = R_MIN + Math.random() * (R_MAX - R_MIN);
				return {
					id: p.id,
					slug: p.slug,
					title: p.title,
					src: p.src,
					baseR,
					curR: baseR * 0.6, // start close to full size so there's little settle travel
					// mild jitter around center so the sim spreads them outward gently
					x: W / 2 + (Math.random() - 0.5) * W * 0.45,
					y: H / 2 + (Math.random() - 0.5) * H * 0.45,
				};
			});

		const sim: Simulation<BubbleNode, undefined> = forceSimulation(nodes)
			.alpha(1)
			.alphaDecay(0.03)
			.velocityDecay(0.72) // high friction → slow, settled motion
			.force("x", forceX<BubbleNode>(W / 2).strength(0.025))
			.force("y", forceY<BubbleNode>(H / 2).strength(0.03))
			.stop();

		let raf = 0;
		const tick = () => {
			let easing = false;
			for (const n of nodes) {
				const target = hoverRef.current === n.id ? n.baseR * HOVER_SCALE : n.baseR;
				n.curR += (target - n.curR) * 0.1; // slow, smooth grow/shrink
				if (Math.abs(target - n.curR) > 0.4) easing = true;
			}

			// Collision uses the current (animated) radii, so growing a bubble shoves
			// its neighbors. Rebuilt each frame because radii change. Soft strength so
			// neighbors ease aside rather than snapping.
			sim.force("collide", forceCollide<BubbleNode>().radius((d) => d.curR + GAP).strength(0.7).iterations(2));

			// Keep the centering forces alive while anything is moving/resizing.
			if (easing || hoverRef.current) sim.alpha(Math.max(sim.alpha(), 0.12));
			sim.tick();

			for (const n of nodes) {
				n.x = Math.max(n.curR, Math.min(W - n.curR, n.x ?? W / 2));
				n.y = Math.max(n.curR, Math.min(H - n.curR, n.y ?? H / 2));
				const el = elsRef.current.get(n.id);
				if (el) {
					const d = n.curR * 2;
					el.style.width = `${d}px`;
					el.style.height = `${d}px`;
					el.style.transform = `translate(${n.x - n.curR}px, ${n.y - n.curR}px)`;
					el.style.zIndex = hoverRef.current === n.id ? "20" : "1";
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		// Stash nodes on the container so render can read them (see below).
		setNodeList(nodes);

		return () => {
			cancelAnimationFrame(raf);
			sim.stop();
			elsRef.current.clear();
		};
	}, [items]);

	if (empty) {
		return (
			<div ref={containerRef} className="flex h-full w-full items-center justify-center text-center">
				<p className="text-sm text-slate-300">Browse this collection →</p>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="relative h-full w-full">
			{nodeList.map((n) => (
				<Link
					key={n.id}
					href={`/product/${n.slug}`}
					title={n.title}
					ref={(el) => {
						if (el) elsRef.current.set(n.id, el);
						else elsRef.current.delete(n.id);
					}}
					onMouseEnter={() => (hoverRef.current = n.id)}
					onMouseLeave={() => {
						if (hoverRef.current === n.id) hoverRef.current = null;
					}}
					className="absolute left-0 top-0 block overflow-hidden rounded-full bg-white shadow-xl ring-2 ring-white/40 transition-[box-shadow] duration-200 hover:ring-4 hover:ring-white/90"
					style={{ width: 4, height: 4, willChange: "transform,width,height" }}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={n.src} alt={n.title} draggable={false} className="h-full w-full object-cover" loading="lazy" />
				</Link>
			))}
		</div>
	);
}
