"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supportsViewTransitions, type DocumentWithViewTransitions } from "@/lib/viewTransition";

/**
 * Wires the native View Transitions API to App Router navigation.
 *
 * The problem this exists to solve: `document.startViewTransition(cb)` snapshots
 * the page immediately, runs `cb`, and snapshots again as soon as `cb`'s promise
 * resolves. `router.push()` returns straight away, long before the new route has
 * rendered — so a naive wrapper captures the OUTGOING page as the "new" state and
 * you get a transition from a page to itself.
 *
 * So `cb` returns a promise that this provider resolves from a `pathname` effect,
 * once the destination has actually committed and painted.
 *
 * (React's `unstable_ViewTransition` would handle this, but it is
 * experimental-channel only and absent from React 19.2, which is what we ship.)
 */
/**
 * Route transitions are currently OFF.
 *
 * The slide-and-fade shipped in #58 wasn't liked, so navigation is instant again.
 * The machinery below is deliberately left in place rather than reverted: the hard
 * part was never the animation, it was the commit-timing problem documented above.
 * With this flag and the `::view-transition-*` rules in globals.css both parked, a
 * different transition becomes a CSS change plus flipping this to `true` — not a
 * rebuild.
 *
 * While it is `false` nothing calls `startViewTransition`, so no transition starts
 * and the browser's own default crossfade never kicks in either.
 */
const ROUTE_TRANSITIONS_ENABLED = false;

const NavigateContext = createContext<((href: string) => void) | null>(null);

/** Returns a transition-aware navigate, or null outside the provider. */
export function useTransitionNavigate(): ((href: string) => void) | null {
	return useContext(NavigateContext);
}

/**
 * A view transition freezes the page until the update callback resolves, so it
 * MUST always resolve. If the route never commits — same href, an intercepted
 * navigation, a segment fetch that stalls — this releases it and the navigation
 * finishes without the animation. A missed animation is a blemish; a frozen page
 * is a broken site.
 */
const COMMIT_TIMEOUT_MS = 900;

export function ViewTransitions({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	/** Releases the in-flight transition, if any. Always cleared after firing. */
	const release = useRef<(() => void) | null>(null);

	useEffect(() => {
		const done = release.current;
		if (!done) return;
		release.current = null;
		/*
		 * Two frames, not one: the first lets React commit the new route, the second
		 * lets the browser paint it. Resolving any earlier snapshots a half-rendered
		 * destination.
		 */
		requestAnimationFrame(() => requestAnimationFrame(done));
	}, [pathname]);

	const navigate = useCallback(
		(href: string) => {
			const doc = document as DocumentWithViewTransitions;
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			if (!ROUTE_TRANSITIONS_ENABLED || !supportsViewTransitions() || reduce) {
				router.push(href);
				return;
			}

			// A second click mid-transition would otherwise strand the first one.
			release.current?.();
			release.current = null;

			doc.startViewTransition!(
				() =>
					new Promise<void>((resolve) => {
						let settled = false;
						const finish = () => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							resolve();
						};
						const timer = window.setTimeout(finish, COMMIT_TIMEOUT_MS);
						release.current = finish;
						router.push(href);
					}),
			);
		},
		[router],
	);

	return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>;
}
