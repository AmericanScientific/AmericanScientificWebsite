import type { ReactNode } from "react";

/**
 * Shared frame for the arcade games: a title/score HUD, the canvas, an optional
 * game-over overlay with a restart button, and a controls hint. Games render
 * their <canvas> as children and drive the HUD via props.
 */
export function GameShell({
	title,
	hud,
	over,
	overLabel,
	onRestart,
	controls,
	children,
}: {
	title: string;
	hud: string;
	over: boolean;
	overLabel: string;
	onRestart: () => void;
	controls: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="flex w-full max-w-[480px] items-center justify-between text-sm">
				<span className="font-semibold text-white">{title}</span>
				<span className="text-slate-300 [font-variant-numeric:tabular-nums]">{hud}</span>
			</div>
			<div className="relative w-full max-w-[480px]">
				{children}
				{over && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 backdrop-blur-sm">
						<span className="text-lg font-bold text-white">{overLabel}</span>
						<button
							type="button"
							onClick={onRestart}
							className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
						>
							Play again
						</button>
					</div>
				)}
			</div>
			<p className="text-xs text-slate-500">{controls}</p>
		</div>
	);
}
