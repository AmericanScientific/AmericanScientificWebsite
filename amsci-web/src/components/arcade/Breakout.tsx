"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 480;
const H = 360;
const PADDLE_W = 74;
const PADDLE_H = 10;
const PADDLE_Y = H - 24;
const BALL_R = 6;
const ROWS = 5;
const COLS = 9;
const BRICK_H = 16;
const GAP = 5;
const TOP = 44;
const POINTS = 10;
const ROW_COLORS = ["#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a78bfa"];

/** Classic Breakout. Reports the live score up so the arcade can gate Pong. */
export function Breakout({ onScore }: { onScore: (score: number) => void }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onScoreRef = useRef(onScore);
	onScoreRef.current = onScore;

	const [score, setScore] = useState(0);
	const [lives, setLives] = useState(3);
	const [over, setOver] = useState(false);
	const [cleared, setCleared] = useState(false);
	const resetRef = useRef<() => void>(() => {});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const brickW = (W - GAP * (COLS + 1)) / COLS;
		let paddleX = (W - PADDLE_W) / 2;
		let ball = { x: W / 2, y: PADDLE_Y - 20, vx: 3, vy: -3 };
		let bricks: { x: number; y: number; row: number; alive: boolean }[] = [];
		let sc = 0;
		let lv = 3;
		let stopped = false;
		const keys: Record<string, boolean> = {};

		function launch(dir: number) {
			ball = { x: W / 2, y: PADDLE_Y - 20, vx: 3 * dir, vy: -3 };
		}

		function init() {
			bricks = [];
			for (let r = 0; r < ROWS; r++) {
				for (let c = 0; c < COLS; c++) {
					bricks.push({
						x: GAP + c * (brickW + GAP),
						y: TOP + r * (BRICK_H + GAP),
						row: r,
						alive: true,
					});
				}
			}
			paddleX = (W - PADDLE_W) / 2;
			sc = 0;
			lv = 3;
			stopped = false;
			launch(Math.random() < 0.5 ? -1 : 1);
			setScore(0);
			setLives(3);
			setOver(false);
			setCleared(false);
		}
		resetRef.current = init;
		init();

		function onMove(e: MouseEvent) {
			const rect = canvas!.getBoundingClientRect();
			const x = (e.clientX - rect.left) * (W / rect.width);
			paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
		}
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
				keys[e.key] = true;
				e.preventDefault();
			}
		}
		function onKeyUp(e: KeyboardEvent) {
			if (e.key === "ArrowLeft" || e.key === "ArrowRight") keys[e.key] = false;
		}
		canvas.addEventListener("mousemove", onMove);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		let raf = 0;
		function frame() {
			if (keys.ArrowLeft) paddleX = Math.max(0, paddleX - 7);
			if (keys.ArrowRight) paddleX = Math.min(W - PADDLE_W, paddleX + 7);

			if (!stopped) {
				ball.x += ball.vx;
				ball.y += ball.vy;
				if (ball.x < BALL_R || ball.x > W - BALL_R) ball.vx *= -1;
				if (ball.y < BALL_R) ball.vy *= -1;

				// paddle bounce (angle by hit position)
				if (
					ball.vy > 0 &&
					ball.y > PADDLE_Y - BALL_R &&
					ball.y < PADDLE_Y + PADDLE_H &&
					ball.x > paddleX &&
					ball.x < paddleX + PADDLE_W
				) {
					ball.vy = -Math.abs(ball.vy);
					ball.vx = ((ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2)) * 4.5;
				}

				// lost the ball
				if (ball.y > H + BALL_R) {
					lv -= 1;
					setLives(lv);
					if (lv <= 0) {
						stopped = true;
						setOver(true);
					} else {
						paddleX = (W - PADDLE_W) / 2;
						launch(Math.random() < 0.5 ? -1 : 1);
					}
				}

				// brick hits
				for (const b of bricks) {
					if (!b.alive) continue;
					if (ball.x > b.x && ball.x < b.x + brickW && ball.y > b.y && ball.y < b.y + BRICK_H) {
						b.alive = false;
						ball.vy *= -1;
						sc += POINTS;
						setScore(sc);
						onScoreRef.current(sc);
						break;
					}
				}
				if (bricks.every((b) => !b.alive)) {
					stopped = true;
					setCleared(true);
					setOver(true);
				}
			}

			ctx!.fillStyle = "#0a0f1c";
			ctx!.fillRect(0, 0, W, H);
			for (const b of bricks) {
				if (!b.alive) continue;
				ctx!.fillStyle = ROW_COLORS[b.row] ?? "#38bdf8";
				ctx!.fillRect(b.x, b.y, brickW, BRICK_H);
			}
			ctx!.fillStyle = "#e2e8f0";
			ctx!.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
			ctx!.fillStyle = "#ffffff";
			ctx!.beginPath();
			ctx!.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
			ctx!.fill();

			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			canvas.removeEventListener("mousemove", onMove);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	return (
		<GameShell
			title="Breakout"
			hud={`Score ${score} · Lives ${lives}`}
			over={over}
			overLabel={cleared ? `Cleared! ${score} pts` : `Game over · ${score} pts`}
			onRestart={() => resetRef.current()}
			controls="Move: mouse or ← →"
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
