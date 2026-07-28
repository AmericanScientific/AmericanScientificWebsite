/**
 * Route-change entrance. Next re-mounts `template.tsx` on every navigation, so
 * the `.page-transition` CSS animation (globals.css) replays each time — a
 * smooth fade/slide-in between pages. Reduced-motion disables the animation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
	return <div className="page-transition">{children}</div>;
}
