"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget. Loads the challenge script once and renders
 * explicitly into a ref, reporting the token up via `onToken` (empty string on
 * expire/error so the parent can disable submit). Renders nothing when no site
 * key is configured — the signup form then submits without a token and the
 * server skips verification (dev).
 */
declare global {
	interface Window {
		turnstile?: {
			render: (
				el: HTMLElement,
				opts: {
					sitekey: string;
					callback: (token: string) => void;
					"expired-callback"?: () => void;
					"error-callback"?: () => void;
					theme?: "light" | "dark" | "auto";
				},
			) => string;
			remove: (id: string) => void;
		};
	}
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
	siteKey,
	onToken,
}: {
	siteKey: string;
	onToken: (token: string) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const widgetId = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		function renderWidget() {
			if (cancelled || !ref.current || !window.turnstile || widgetId.current) return;
			widgetId.current = window.turnstile.render(ref.current, {
				sitekey: siteKey,
				theme: "auto",
				callback: (token) => onToken(token),
				"expired-callback": () => onToken(""),
				"error-callback": () => onToken(""),
			});
		}

		if (window.turnstile) {
			renderWidget();
		} else if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
			const s = document.createElement("script");
			s.src = SCRIPT_SRC;
			s.async = true;
			s.defer = true;
			s.onload = renderWidget;
			document.head.appendChild(s);
		} else {
			// Script tag exists but may not have finished loading — poll briefly.
			const t = setInterval(() => {
				if (window.turnstile) {
					clearInterval(t);
					renderWidget();
				}
			}, 200);
			return () => clearInterval(t);
		}

		return () => {
			cancelled = true;
			if (widgetId.current && window.turnstile) {
				try {
					window.turnstile.remove(widgetId.current);
				} catch {
					// widget already gone
				}
				widgetId.current = null;
			}
		};
		// siteKey is stable for the life of the form
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <div ref={ref} className="min-h-[65px]" />;
}
