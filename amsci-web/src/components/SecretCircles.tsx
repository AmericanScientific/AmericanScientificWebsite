"use client";

import { useEffect, useRef, useState } from "react";
import { Arcade } from "@/components/arcade/Arcade";

/**
 * Four dark circles under the CTA band that hide a sequence puzzle.
 *
 * On mount a random click order is chosen (fresh every page load). Clicking the
 * correct next circle turns it green and advances; a wrong click turns that
 * circle red and locks the whole thing. Finishing the sequence expands a hidden
 * panel (the page grows vertically). Nothing resets it but a refresh — which
 * also reshuffles the order.
 */
type CircleState = "idle" | "green" | "red";

function shuffle(n: number): number[] {
	const a = Array.from({ length: n }, (_, i) => i);
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export function SecretCircles() {
	const order = useRef<number[]>([]);
	const [step, setStep] = useState(0);
	const [states, setStates] = useState<CircleState[]>(["idle", "idle", "idle", "idle"]);
	const [failed, setFailed] = useState(false);
	const [done, setDone] = useState(false);

	// Fresh secret order per page load (client-only, so it never hydrates a value).
	useEffect(() => {
		order.current = shuffle(4);
	}, []);

	function handleClick(i: number) {
		if (failed || done || order.current.length === 0) return;

		if (i === order.current[step]) {
			setStates((prev) => {
				const next = [...prev];
				next[i] = "green";
				return next;
			});
			const advanced = step + 1;
			setStep(advanced);
			if (advanced === order.current.length) setDone(true);
		} else {
			setStates((prev) => {
				const next = [...prev];
				next[i] = "red";
				return next;
			});
			setFailed(true);
		}
	}

	const locked = failed || done;

	return (
		<>
			<div className="flex justify-center gap-4">
				{[0, 1, 2, 3].map((i) => {
					const state = states[i];
					const color =
						state === "green"
							? "bg-emerald-500 shadow-emerald-500/30"
							: state === "red"
								? "bg-red-500 shadow-red-500/30"
								: "bg-[#0a0f1c] enabled:hover:-translate-y-0.5 enabled:hover:brightness-125";
					return (
						<button
							key={i}
							type="button"
							onClick={() => handleClick(i)}
							disabled={locked}
							aria-label={`Circle ${i + 1}`}
							className={`h-10 w-10 rounded-full shadow-md transition-all duration-300 disabled:cursor-default ${color}`}
						/>
					);
				})}
			</div>

			{/* Hidden panel — animates open (page grows vertically) on success. */}
			<div
				className={`grid transition-all duration-700 ease-out ${
					done ? "mt-10 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
				}`}
				aria-hidden={!done}
			>
				<div className="overflow-hidden">
					<div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl bg-[#0a0f1c] px-6 py-16 text-center text-white">
						<span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Unlocked
						</span>
						<h3 className="mb-8 mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
							Hidden Arcade
						</h3>
						{done && <Arcade />}
					</div>
				</div>
			</div>
		</>
	);
}
