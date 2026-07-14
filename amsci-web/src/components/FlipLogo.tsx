"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

/**
 * Home-link logo that flips like a pancake on hover.
 *
 * Each HOVER rotates the logo another 180° around the horizontal axis IN THE SAME
 * DIRECTION — front (original) → back (alternate) → front → … It doesn't rewind
 * when the pointer leaves; the next hover simply continues the spin. Because the
 * angle only ever grows, the motion always turns the same way. Clicking only
 * navigates home — it never flips (no focus trigger). The alternate art lives at
 * /am-sci-logo-alt.png.
 */
export function FlipLogo() {
	const [flips, setFlips] = useState(0);
	const advance = () => setFlips((n) => n + 1);

	return (
		<Link
			href="/"
			aria-label="American Scientific — home"
			className="flip-logo"
			onMouseEnter={advance}
			style={{ "--flip-deg": `${flips * 180}deg` } as CSSProperties}
		>
			<span className="flip-logo-inner">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					className="flip-face flip-front"
					src="/am-sci-logo.png"
					alt="American Scientific"
					width={308}
					height={110}
				/>
				{/* Back face — decorative duplicate of the home link, so it's aria-hidden. */}
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					className="flip-face flip-back"
					src="/am-sci-logo-alt.png"
					alt=""
					aria-hidden="true"
					width={694}
					height={151}
				/>
			</span>
		</Link>
	);
}
