"use client";

import { useCallback, useState } from "react";
import { Breakout } from "./Breakout";
import { Pong } from "./Pong";
import { Snake } from "./Snake";

/** Score in Breakout that unlocks Pong. */
const PONG_UNLOCK = 100;
/** Score (your points) in Pong that unlocks Snake. */
const SNAKE_UNLOCK = 5;

type GameId = "breakout" | "pong" | "snake";

/**
 * The hidden arcade. Breakout is always playable; hitting the score thresholds
 * unlocks Pong then Snake, and the tab bar lets you switch between whatever's
 * unlocked. Progress lives in memory only — a refresh (which also re-locks the
 * whole easter egg behind the circle puzzle) starts you over.
 */
export function Arcade() {
	const [selected, setSelected] = useState<GameId>("breakout");
	const [bestBreakout, setBestBreakout] = useState(0);
	const [bestPong, setBestPong] = useState(0);

	const onBreakoutScore = useCallback((s: number) => setBestBreakout((b) => Math.max(b, s)), []);
	const onPongScore = useCallback((s: number) => setBestPong((b) => Math.max(b, s)), []);

	const pongUnlocked = bestBreakout >= PONG_UNLOCK;
	const snakeUnlocked = bestPong >= SNAKE_UNLOCK;

	const tabs: { id: GameId; label: string; unlocked: boolean; hint: string }[] = [
		{ id: "breakout", label: "Breakout", unlocked: true, hint: "" },
		{ id: "pong", label: "Pong", unlocked: pongUnlocked, hint: `Score ${PONG_UNLOCK} in Breakout` },
		{ id: "snake", label: "Snake", unlocked: snakeUnlocked, hint: `Score ${SNAKE_UNLOCK} in Pong` },
	];

	return (
		<div className="w-full max-w-[520px]">
			<div className="mb-6 flex justify-center gap-2">
				{tabs.map((t) => {
					const isActive = selected === t.id;
					return (
						<button
							key={t.id}
							type="button"
							disabled={!t.unlocked}
							onClick={() => t.unlocked && setSelected(t.id)}
							title={t.unlocked ? undefined : t.hint}
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
								isActive
									? "bg-white text-slate-900"
									: t.unlocked
										? "bg-white/10 text-white hover:bg-white/20"
										: "cursor-not-allowed bg-white/5 text-slate-500"
							}`}
						>
							{t.unlocked ? t.label : `🔒 ${t.label}`}
						</button>
					);
				})}
			</div>

			{selected === "breakout" && <Breakout onScore={onBreakoutScore} />}
			{selected === "pong" && <Pong onScore={onPongScore} />}
			{selected === "snake" && <Snake />}

			<div className="mt-5 text-center text-xs text-slate-500">
				{!pongUnlocked ? (
					<p>
						Reach <span className="font-semibold text-slate-300">{PONG_UNLOCK}</span> in Breakout to
						unlock Pong · best {bestBreakout}
					</p>
				) : !snakeUnlocked ? (
					<p>
						Reach <span className="font-semibold text-slate-300">{SNAKE_UNLOCK}</span> in Pong to
						unlock Snake · best {bestPong}
					</p>
				) : (
					<p>All three unlocked — nicely done. 🎮</p>
				)}
			</div>
		</div>
	);
}
