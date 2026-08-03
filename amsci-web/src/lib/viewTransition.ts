/**
 * Same-document View Transitions, used for route changes.
 *
 * We drive the native API directly rather than React's `unstable_ViewTransition`:
 * that component is experimental-channel only and does not exist in React 19.2,
 * which is what this app ships. The native API is in Chrome/Edge and Safari 18+,
 * and everything here degrades to a plain navigation elsewhere.
 */

/** A transition handle, as returned by `document.startViewTransition`. */
export interface ViewTransitionHandle {
	finished: Promise<void>;
	ready: Promise<void>;
	updateCallbackDone: Promise<void>;
}

export type DocumentWithViewTransitions = Document & {
	startViewTransition?: (callback: () => void | Promise<void>) => ViewTransitionHandle;
};

/** Whether the browser can run a same-document view transition. */
export function supportsViewTransitions(): boolean {
	if (typeof document === "undefined") return false;
	return typeof (document as DocumentWithViewTransitions).startViewTransition === "function";
}

/**
 * `view-transition-name` takes a `<custom-ident>`, which may not begin with a
 * digit — and plenty of our slugs are SKUs like `3484-01`, so anything derived
 * from one needs a prefix and needs the invalid characters stripped.
 */
export function transitionName(prefix: string, value: string): string {
	return `vt-${prefix}-${value.replace(/[^a-z0-9-]/gi, "-")}`;
}
