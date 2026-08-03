"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTopLevelCategories } from "@/data/categories";
import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryBubbles, type BubbleItem } from "@/components/CategoryBubbles";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const EASE = "cubic-bezier(0.2,0.7,0.2,1)";

/**
 * The hero's floating category tiles. Hovering any tile expands it to fill the
 * whole grid area while the others dissolve away.
 *
 * This is a client component (not pure CSS) on purpose: the expanded tile
 * switches to `position:absolute` and resizes under the cursor, which makes a
 * CSS `:hover` implementation flicker (the resize drops the hover, which
 * collapses it, which re-triggers hover…). Tracking the active tile in state and
 * only clearing it on the CONTAINER's mouseleave breaks that loop — once a tile
 * is active, moving the pointer anywhere inside the panel can't un-trigger it.
 */
export function HeroCategoryTiles({ bubblesByCategory }: { bubblesByCategory: Record<string, BubbleItem[]> }) {
	const categories = getTopLevelCategories();
	const [active, setActive] = useState<string | null>(null);
	const router = useRouter();

	return (
		<div
			className="relative grid h-[520px] auto-rows-fr grid-cols-2 gap-4"
			onMouseLeave={() => setActive(null)}
		>
			{categories.map((category) => {
				const theme = categoryTheme(category.slug);
				const isActive = active === category.slug;
				const dimmed = active !== null && !isActive;
				const childCount = category.children?.length ?? 0;

				// Active tile → a bubble collage of products in this category. It's a
				// <div> (not a <Link>) because each bubble is itself a link, and an
				// <a> can't be nested inside another <a>.
				if (isActive) {
					const href = category.external ? `/${category.slug}` : `/product-category/${category.slug}`;
					return (
						<div
							key={category.slug}
							onClick={(e) => {
								// A click on the panel background (not a bubble/title/shrink) opens the category.
								if ((e.target as HTMLElement).closest("a,button")) return;
								router.push(href);
							}}
							className="absolute -inset-x-8 -inset-y-12 z-20 flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/[0.12] p-3 shadow-2xl backdrop-blur-md animate-[catMorphIn_0.4s_cubic-bezier(0.2,0.7,0.2,1)]"
						>
							{/* Category title — click to go to the category page. */}
							<Link
								href={href}
								className="group/hdr z-10 mr-24 inline-flex items-center gap-3 self-start rounded-2xl px-3 py-2 transition-colors hover:bg-white/10"
							>
								<span className={cx("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow", theme.tile)}>
									<CategoryIcon slug={category.slug} className="h-6 w-6" />
								</span>
								<span className="text-xl font-semibold text-white">{category.name}</span>
								<svg viewBox="0 0 24 24" className="h-5 w-5 text-white/70 transition-transform group-hover/hdr:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
									<path d="M5 12h14M13 6l6 6-6 6" />
								</svg>
							</Link>

							<div className="relative mt-2 min-h-0 flex-1">
								<CategoryBubbles items={bubblesByCategory[category.slug] ?? []} />
							</div>
						</div>
					);
				}

				return (
					<Link
						key={category.slug}
						href={category.external ? `/${category.slug}` : `/product-category/${category.slug}`}
						onMouseEnter={() => setActive(category.slug)}
						style={{ transition: `opacity 0.4s ${EASE}, transform 0.4s ${EASE}, background-color 0.28s ease, border-color 0.28s ease` }}
						className={cx(
							"group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md hover:border-white/25 hover:bg-white/10",
							dimmed && "pointer-events-none scale-90 opacity-0",
						)}
					>
						<span className={cx("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", theme.tile)}>
							<CategoryIcon slug={category.slug} className="h-6 w-6" />
						</span>
						<p className="mt-3 text-sm font-semibold text-white">{category.name}</p>
						<p className="text-xs text-slate-400">{childCount ? `${childCount} subcategories` : "Explore"}</p>
					</Link>
				);
			})}

			{/* Shrink button — top-right of the expanded panel; same effect as leaving the hover area. */}
			{active !== null && (
				<button
					type="button"
					aria-label="Shrink"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setActive(null);
					}}
					className="absolute right-[-1rem] top-[-2.25rem] z-30 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
				>
					<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
					</svg>
					Shrink
				</button>
			)}
		</div>
	);
}
