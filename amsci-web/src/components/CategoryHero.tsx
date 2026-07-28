import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AccountPricingBadge } from "@/components/AccountPricingBadge";
import { CountUp } from "@/components/CountUp";
import { CategoryHeroMotif } from "@/components/CategoryHeroMotif";

/**
 * Category page banner ("hero").
 *
 * Layered over the category's own theme gradient: a light bloom + fine dot grid
 * (`.cat-hero` in globals.css), a sweeping sheen, drifting particles, and a big
 * ghosted, ANIMATED science motif unique to each top-level category
 * (<CategoryHeroMotif>). `eyebrow` shows the parent family on leaf pages.
 */

/** Deterministic particle field (fixed so SSR/CSR match). */
const PARTICLES = [
	{ left: "14%", size: 6, delay: "0s", dur: "9s" },
	{ left: "28%", size: 4, delay: "2.4s", dur: "11s" },
	{ left: "41%", size: 8, delay: "1.2s", dur: "8s" },
	{ left: "55%", size: 5, delay: "3.6s", dur: "12s" },
	{ left: "67%", size: 3, delay: "0.8s", dur: "10s" },
	{ left: "78%", size: 6, delay: "4.2s", dur: "9.5s" },
	{ left: "88%", size: 4, delay: "1.8s", dur: "13s" },
];

export function CategoryHero({
	themeSlug,
	title,
	count,
	eyebrow,
}: {
	/** Top-level slug — drives both the color theme and the glyph. */
	themeSlug: string;
	title: string;
	count: number;
	eyebrow?: string;
}) {
	const theme = categoryTheme(themeSlug);

	return (
		<div className={`cat-hero bg-gradient-to-br text-white ${theme.tile}`}>
			{/* Sweeping sheen + animated motif + particles (all decorative, z-0). */}
			<div className="cat-hero-sheen" aria-hidden="true" />
			<CategoryHeroMotif slug={themeSlug} />
			<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
				{PARTICLES.map((p, i) => (
					<span
						key={i}
						className="cat-particle"
						style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }}
					/>
				))}
			</div>

			<div className="cat-hero-content relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20 lg:px-8">
				{eyebrow ? (
					<p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">{eyebrow}</p>
				) : null}

				<div className="flex items-center gap-5">
					<span className="group flex h-20 w-20 flex-none items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg shadow-black/10 ring-1 ring-white/25 backdrop-blur transition-transform duration-500 hover:rotate-6 hover:scale-105">
						<CategoryIcon slug={themeSlug} className="h-10 w-10 drop-shadow" />
					</span>
					<div>
						<h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-white text-balance drop-shadow-sm sm:text-5xl lg:text-6xl">
							{title}
						</h1>
						<div className="mt-4 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur [font-variant-numeric:tabular-nums]">
								<CountUp value={String(count)} /> {count === 1 ? "product" : "products"}
							</span>
							<AccountPricingBadge />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
