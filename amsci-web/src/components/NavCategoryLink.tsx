"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A top-level category nav link with the rolling-gradient treatment.
 *
 * Solid ink at rest, gradient on hover/focus (via `.nav-category`), and when this
 * link's page is the one being viewed it stays permanently lit (`.nav-category-active`)
 * so the current section "continues the pattern". Active state is derived from the
 * URL, so this is a client component; the styling itself lives in globals.css.
 *
 * `matchSlug` is the top-level key this link owns: a category slug, `"all"` for the
 * All Products page, or an external slug (e.g. `"phywe"`).
 */
export function NavCategoryLink({
	href,
	matchSlug,
	className = "",
	children,
}: {
	href: string;
	matchSlug: string;
	className?: string;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const active = activeTopSlug(pathname) === matchSlug;

	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={`nav-category${active ? " nav-category-active" : ""} ${className}`}
		>
			{children}
		</Link>
	);
}

/** Which top-level nav entry the current path belongs to (null if none). */
function activeTopSlug(pathname: string): string | null {
	if (pathname === "/products") return "all";

	// Category pages: /product-category/<parent>[/<child>] → the parent is active.
	const category = pathname.match(/^\/product-category\/([^/]+)/);
	if (category) return category[1];

	// Standalone top-level pages (e.g. external PHYWE at /phywe). Single segment only,
	// so /product/<slug> detail pages don't falsely light a nav item.
	const top = pathname.match(/^\/([^/]+)\/?$/);
	if (top) return top[1];

	return null;
}
