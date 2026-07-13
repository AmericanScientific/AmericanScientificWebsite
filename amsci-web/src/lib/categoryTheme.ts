/**
 * Presentation theme per top-level category.
 *
 * Kept separate from `categories.ts` (data) so the taxonomy stays a clean mirror
 * of NetSuite `class`. Class strings are written literally so Tailwind's scanner
 * picks them up.
 */
export interface CategoryTheme {
	/** Gradient for placeholder tiles and icon chips (`from-* to-*`). */
	tile: string;
	/** Light chip background + text for category labels. */
	chip: string;
	/** Solid accent dot / bar color. */
	dot: string;
	/** Soft text color used on light section accents. */
	text: string;
}

const THEMES: Record<string, CategoryTheme> = {
	chemistry: {
		tile: "from-amber-400 to-orange-600",
		chip: "bg-amber-50 text-amber-700 ring-amber-100",
		dot: "bg-amber-500",
		text: "text-amber-600",
	},
	laboratory: {
		tile: "from-sky-400 to-blue-600",
		chip: "bg-sky-50 text-sky-700 ring-sky-100",
		dot: "bg-sky-500",
		text: "text-sky-600",
	},
	"life-science": {
		tile: "from-emerald-400 to-teal-600",
		chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
		dot: "bg-emerald-500",
		text: "text-emerald-600",
	},
	"physics-physical-science": {
		tile: "from-violet-400 to-indigo-600",
		chip: "bg-violet-50 text-violet-700 ring-violet-100",
		dot: "bg-violet-500",
		text: "text-violet-600",
	},
	special: {
		tile: "from-rose-400 to-red-600",
		chip: "bg-rose-50 text-rose-700 ring-rose-100",
		dot: "bg-rose-500",
		text: "text-rose-600",
	},
	phywe: {
		tile: "from-slate-500 to-slate-800",
		chip: "bg-slate-100 text-slate-700 ring-slate-200",
		dot: "bg-slate-500",
		text: "text-slate-600",
	},
};

const FALLBACK: CategoryTheme = {
	tile: "from-slate-400 to-slate-700",
	chip: "bg-slate-50 text-slate-700 ring-slate-200",
	dot: "bg-slate-500",
	text: "text-slate-600",
};

/** Theme for a top-level category slug (falls back to neutral slate). */
export function categoryTheme(topLevelSlug: string): CategoryTheme {
	return THEMES[topLevelSlug] ?? FALLBACK;
}
