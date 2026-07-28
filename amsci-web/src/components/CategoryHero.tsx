import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AccountPricingBadge } from "@/components/AccountPricingBadge";
import { CountUp } from "@/components/CountUp";
import { CategoryParticles } from "@/components/CategoryParticles";

/**
 * Category page banner ("hero").
 *
 * Layered over the category's own theme gradient: a light bloom + fine dot grid
 * (`.cat-hero` in globals.css), a sweeping sheen, and a full-bleed, mouse-reactive
 * particle field unique per category (<CategoryParticles>). `eyebrow` shows the
 * parent family on leaf pages.
 */

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
			{/* Mouse-reactive particle field + a sweeping sheen (decorative, z-0). */}
			<CategoryParticles variant={themeSlug} />
			<div className="cat-hero-sheen" aria-hidden="true" />

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
