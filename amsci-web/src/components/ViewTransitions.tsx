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
 * Route transitions are ON, running the "stage slide" treatment (the incoming page
 * slides in from the right while the outgoing one drops back and away). The
 * animation itself lives in `globals.css` under "Route transitions: STAGE SLIDE".
 *
 * Keeping this as a flag earned its keep: the first treatment was rejected, and
 * turning it off and back on with a different animation cost one boolean and a CSS
 * block rather than a rebuild of the commit-timing machinery documented above.
 *
 * Set to `false` and nothing calls `startViewTransition`, so no transition starts
 * and the browser's own default crossfade never kicks in either.
 */
const ROUTE_TRANSITIONS_ENABLED = true;

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
