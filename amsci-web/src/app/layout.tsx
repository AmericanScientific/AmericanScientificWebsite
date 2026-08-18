import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { PointerLight } from "@/components/PointerLight";
import { SiteFooter } from "@/components/SiteFooter";
import { CartProvider } from "@/lib/cart/cart-context";
import { ChatWidget } from "@/components/ChatWidget";
import { SITE_ORIGIN } from "@/lib/site";

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

const SITE_DESCRIPTION =
	"American Scientific is a wholesale distributor, manufacturer, and exporter of scientific and STEM educational products for schools, districts, and institutions.";

export const metadata: Metadata = {
	// Without this, every relative canonical/Open Graph URL resolves against
	// localhost at build time. Sourced from the same constant as the sitemap and
	// robots so the three can't disagree about what the canonical origin is.
	metadataBase: new URL(SITE_ORIGIN),
	title: {
		default: "American Scientific — Wholesale STEM & Laboratory Supply",
		template: "%s | American Scientific",
	},
	description: SITE_DESCRIPTION,
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		siteName: "American Scientific",
		title: "American Scientific — Wholesale STEM & Laboratory Supply",
		description: SITE_DESCRIPTION,
		url: "/",
	},
	twitter: {
		card: "summary",
		title: "American Scientific — Wholesale STEM & Laboratory Supply",
		description: SITE_DESCRIPTION,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
			{/*
			 * No manual <link rel="icon"> here. src/app/icon.png and
			 * src/app/apple-icon.png are picked up by Next's file convention, which
			 * emits the tags with content hashes. A hand-written link alongside them
			 * competes for the same slot and is how the old Next.js default kept
			 * winning the browser tab.
			 */}
			<body className="min-h-screen bg-[#f6f7fb] font-sans text-slate-900 antialiased">
				<CartProvider>
					<SiteHeader />
					<main>{children}</main>
					<SiteFooter />
					<ChatWidget />
					{/* One global pointer listener driving the trail + every [data-pointer-light] panel. */}
					<PointerLight />
				</CartProvider>
			</body>
		</html>
	);
}
