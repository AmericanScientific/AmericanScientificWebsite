import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { PointerLight } from "@/components/PointerLight";
import { ViewTransitions } from "@/components/ViewTransitions";
import { SiteFooter } from "@/components/SiteFooter";
import { CartProvider } from "@/lib/cart/cart-context";
import { ChatWidget } from "@/components/ChatWidget";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
	display: "swap",
	weight: ["500", "600", "700"],
});

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
		<html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			</head>
			<body className="min-h-screen bg-[#f6f7fb] font-sans text-slate-900 antialiased">
				{/*
				 * ViewTransitions wraps the header and footer too, not just <main>: the
				 * category nav lives in the header, and those links need the
				 * transition-aware navigate from its context.
				 *
				 * PointerLight sits INSIDE it but is not a link consumer — it just needs
				 * to be mounted exactly once, and it also renders the fixed ambient wash
				 * layer, so it stays last in the body.
				 */}
				<ViewTransitions>
					<CartProvider>
						<SiteHeader />
						<main>{children}</main>
						<SiteFooter />
						<ChatWidget />
						{/* One global pointer listener driving every [data-pointer-light] panel. */}
						<PointerLight />
					</CartProvider>
				</ViewTransitions>
			</body>
		</html>
	);
}
