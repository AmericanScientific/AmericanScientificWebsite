import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
	title: {
		default: "American Scientific — Wholesale STEM & Laboratory Supply",
		template: "%s | American Scientific",
	},
	description:
		"American Scientific is a wholesale distributor, manufacturer, and exporter of scientific and STEM educational products for schools, districts, and institutions.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
				<SiteHeader />
				<main>{children}</main>
				<footer className="mt-16 border-t border-slate-200 bg-white">
					<div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
						<p className="font-semibold text-slate-700">American Scientific, LLC</p>
						<p>Columbus, OH · 888-490-9002 · office@american-scientific.com</p>
						<p className="mt-2 text-xs text-slate-400">
							Wholesale B2B pricing is account-specific. Sign in to view your negotiated pricing and
							place orders.
						</p>
					</div>
				</footer>
			</body>
		</html>
	);
}
