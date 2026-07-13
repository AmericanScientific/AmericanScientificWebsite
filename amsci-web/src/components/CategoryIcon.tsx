import { getTopLevelSlug } from "@/data/categories";

/**
 * Clean line icon per top-level category. Accepts any category slug (leaf or
 * top-level) and resolves to its top-level family. Uses `currentColor` so the
 * caller controls color.
 */
export function CategoryIcon({
	slug,
	className = "h-6 w-6",
}: {
	slug: string;
	className?: string;
}) {
	const top = getTopLevelSlug(slug);
	const common = {
		className,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.6,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true,
	};

	switch (top) {
		case "chemistry": // Erlenmeyer flask
			return (
				<svg {...common}>
					<path d="M9 3h6" />
					<path d="M10 3v6l-4.7 8.4A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-3.1L14 9V3" />
					<path d="M7.4 15h9.2" />
				</svg>
			);
		case "laboratory": // graduated beaker
			return (
				<svg {...common}>
					<path d="M6 4h12" />
					<path d="M8 4v13a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V4" />
					<path d="M8.5 11H16" />
					<path d="M9 15h5" />
				</svg>
			);
		case "life-science": // leaf
			return (
				<svg {...common}>
					<path d="M20 4s-1 9-6 12A7 7 0 0 1 6 6c4-2.5 14-2 14-2z" />
					<path d="M8.5 17.5c3-3.5 6.5-5.5 9-6.5" />
				</svg>
			);
		case "physics-physical-science": // atom
			return (
				<svg {...common}>
					<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
					<ellipse cx="12" cy="12" rx="10" ry="4.2" />
					<ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
					<ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
				</svg>
			);
		case "special": // sparkle
			return (
				<svg {...common}>
					<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17l-1.9-5.1L4.5 10l5.6-1.4z" />
					<path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
				</svg>
			);
		case "phywe": // lightning bolt
		default:
			return (
				<svg {...common}>
					<path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" />
				</svg>
			);
	}
}
