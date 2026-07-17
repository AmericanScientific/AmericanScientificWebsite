import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "amsci_session";

/**
 * Lightweight gate for authenticated-only routes. Middleware only checks for the
 * presence of the session cookie (it can't hit D1 here) to redirect obvious
 * guests to /login without a flash of protected content. The authoritative
 * session validation still happens in each protected page via getCurrentUser().
 */
export function middleware(request: NextRequest) {
	const hasCookie = request.cookies.has(SESSION_COOKIE);
	if (!hasCookie) {
		const url = new URL("/login", request.url);
		url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/account/:path*", "/checkout/:path*", "/cart/:path*", "/cart"],
};
