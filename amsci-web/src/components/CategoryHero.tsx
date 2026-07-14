import { categoryTheme } from "@/lib/categoryTheme";
import { CategoryIcon } from "@/components/CategoryIcon";

/**
 * Category page banner ("hero").
 *
 * Shared by the top-level category page and every leaf page beneath it so the
 * treatment stays in one place. The surface is layered over the category's own
 * theme gradient — a light bloom, a depth burn, a fine dot grid (`.cat-hero`
 * in globals.css), and an oversized family glyph ghosted off the right edge —
 * so it comes alive without hard-coding anything per category.
 *
 * `eyebrow` shows the parent family on leaf pages (e.g. "Chemistry" above
 * "Chemical Reactions"), replacing the old redundant "Catalog / …" breadcrumb.
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
			<div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
				{eyebrow ? (
					<p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
						{eyebrow}
					</p>
				) : null}

				<div className="flex items-center gap-4">
					<span className="flex h-[4.5rem] w-[4.5rem] flex-none items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg shadow-black/10 ring-1 ring-white/25 backdrop-blur">
						<CategoryIcon slug={themeSlug} className="h-9 w-9" />
					</span>
					<div>
						<h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white text-balance drop-shadow-sm sm:text-4xl lg:text-5xl">
							{title}
						</h1>
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur [font-variant-numeric:tabular-nums]">
								{count} {count === 1 ? "product" : "products"}
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/40">
								Sign in for your account pricing
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
