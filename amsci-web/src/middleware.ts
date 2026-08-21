import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "amsci_session";

/**
 * Lightweight gate for authenticated-only routes. Middleware only checks for the
 * presence of the session cookie (it can't hit D1 here) to redirect obvious
 * guests to /login without a flash of protected content. The authoritative
 * session validation still happens in each protected page via getCurrentUser().
 */
/**
 * Routes under a guarded prefix that must stay reachable signed-out.
 *
 * /cart/restore hands a customer back a cart rescued from the old WooCommerce
 * site. Many of those people still have to set a password on the new site, so
 * bouncing them to /login is the exact wall the link exists to get them past.
 * It carries its own expiring, single-purpose token and grants nothing else —
 * the cart lands in localStorage, and prices still require signing in.
 */
const PUBLIC_PATHS = new Set(["/cart/restore"]);

export function middleware(request: NextRequest) {
	if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
		return NextResponse.next();
	}

	const hasCookie = request.cookies.has(SESSION_COOKIE);
	if (!hasCookie) {
		const url = new URL("/login", request.url);
		url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/account/:path*", "/checkout/:path*", "/cart/:path*", "/cart", "/admin/:path*", "/admin"],
};
