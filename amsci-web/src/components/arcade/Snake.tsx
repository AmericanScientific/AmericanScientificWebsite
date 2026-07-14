"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const COLS = 24;
const ROWS = 16;
const CELL = 20;
const W = COLS * CELL;
const H = ROWS * CELL;
const STEP_MS = 115;

type Pt = { x: number; y: number };

/** Classic Snake — the final unlock. */
export function Snake() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [score, setScore] = useState(0);
	const [over, setOver] = useState(false);
	const resetRef = useRef<() => void>(() => {});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let snake: Pt[] = [];
		let dir: Pt = { x: 1, y: 0 };
		let nextDir: Pt = { x: 1, y: 0 };
		let food: Pt = { x: 0, y: 0 };
		let sc = 0;
		let dead = false;
		let acc = 0;
		let last = 0;

		function placeFood() {
			let p: Pt;
			do {
				p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
			} while (snake.some((s) => s.x === p.x && s.y === p.y));
			food = p;
		}
		function init() {
			snake = [
				{ x: 6, y: 8 },
				{ x: 5, y: 8 },
				{ x: 4, y: 8 },
			];
			dir = { x: 1, y: 0 };
			nextDir = { x: 1, y: 0 };
			sc = 0;
			dead = false;
			acc = 0;
			last = 0;
			placeFood();
			setScore(0);
			setOver(false);
		}
		resetRef.current = init;
		init();

		function onKey(e: KeyboardEvent) {
			const map: Record<string, Pt> = {
				ArrowUp: { x: 0, y: -1 },
				ArrowDown: { x: 0, y: 1 },
				ArrowLeft: { x: -1, y: 0 },
				ArrowRight: { x: 1, y: 0 },
			};
			const d = map[e.key];
			if (!d) return;
			e.preventDefault();
			// ignore direct reversals
			if (d.x === -dir.x && d.y === -dir.y) return;
			nextDir = d;
		}
		window.addEventListener("keydown", onKey);

		function step() {
			dir = nextDir;
			const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
			if (
				head.x < 0 ||
				head.x >= COLS ||
				head.y < 0 ||
				head.y >= ROWS ||
				snake.some((s) => s.x === head.x && s.y === head.y)
			) {
				dead = true;
				setOver(true);
				return;
			}
			snake.unshift(head);
			if (head.x === food.x && head.y === food.y) {
				sc += 1;
				setScore(sc);
				placeFood();
			} else {
				snake.pop();
			}
		}

		let raf = 0;
		function frame(t: number) {
			if (!last) last = t;
			acc += t - last;
			last = t;
			if (!dead) {
				while (acc >= STEP_MS) {
					acc -= STEP_MS;
					step();
					if (dead) break;
				}
			}

			ctx!.fillStyle = "#0a0f1c";
			ctx!.fillRect(0, 0, W, H);
			// food
			ctx!.fillStyle = "#fb7185";
			ctx!.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
			// snake
			for (let i = 0; i < snake.length; i++) {
				ctx!.fillStyle = i === 0 ? "#34d399" : "#10b981";
				ctx!.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2);
			}
			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("keydown", onKey);
		};
	}, []);

	return (
		<GameShell
			title="Snake"
			hud={`Score ${score}`}
			over={over}
			overLabel={`Game over · ${score}`}
			onRestart={() => resetRef.current()}
			controls="Turn: ← ↑ ↓ →"
		>
			<canvas
				ref={canvasRef}
				width={W}
				height={H}
				className="h-auto w-full rounded-xl border border-white/10"
			/>
		</GameShell>
	);
}
