"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useTransitionNavigate } from "@/components/ViewTransitions";

type LinkProps = ComponentPropsWithoutRef<typeof Link>;

/**
 * A `next/link` that runs the route change inside a view transition.
 *
 * Drop-in for `Link` on any internal navigation worth animating. Falls back to
 * ordinary Link behaviour when the browser lacks the API, when the visitor prefers
 * reduced motion, or when rendered outside <ViewTransitions>.
 */
export function TransitionLink({ href, onClick, ...rest }: LinkProps & { href: string }) {
	const navigate = useTransitionNavigate();

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		onClick?.(event);
		if (!navigate || event.defaultPrevented) return;
		/*
		 * Modified and non-primary clicks belong to the browser: cmd/ctrl-click opens
		 * a new tab, shift a new window, middle-click a background tab. Hijacking
		 * those would break expected behaviour for the sake of an animation.
		 */
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (event.button !== 0) return;

		event.preventDefault();
		navigate(href);
	}

	return <Link href={href} onClick={handleClick} {...rest} />;
}
