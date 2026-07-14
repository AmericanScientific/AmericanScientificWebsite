"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "./GameShell";

const W = 480;
const H = 360;
const PADDLE_W = 10;
const PADDLE_H = 66;
const BALL_R = 7;
const WIN = 7;

/** Pong vs a simple AI. Reports the player's score up so the arcade can gate Snake. */
export function Pong({ onScore }: { onScore: (score: number) => void }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onScoreRef = useRef(onScore);
	onScoreRef.current = onScore;

	const [you, setYou] = useState(0);
	const [cpu, setCpu] = useState(0);
	const [over, setOver] = useState(false);
	const [won, setWon] = useState(false);
	const resetRef = useRef<() => void>(() => {});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let playerY = (H - PADDLE_H) / 2;
		let aiY = (H - PADDLE_H) / 2;
		let ball = { x: W / 2, y: H / 2, vx: 4, vy: 2 };
		let ps = 0;
		let cs = 0;
		let stopped = false;
		const keys: Record<string, boolean> = {};

		function serve(toPlayer: boolean) {
			ball = { x: W / 2, y: H / 2, vx: toPlayer ? -4 : 4, vy: (Math.random() * 2 - 1) * 3 };
		}
		function init() {
			playerY = (H - PADDLE_H) / 2;
			aiY = (H - PADDLE_H) / 2;
			ps = 0;
			cs = 0;
			stopped = false;
			serve(Math.random() < 0.5);
			setYou(0);
			setCpu(0);
			setOver(false);
			setWon(false);
		}
		resetRef.current = init;
		init();

		function onMove(e: MouseEvent) {
			const rect = canvas!.getBoundingClientRect();
			const y = (e.clientY - rect.top) * (H / rect.height);
			playerY = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
		}
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				keys[e.key] = true;
				e.preventDefault();
			}
		}
		function onKeyUp(e: KeyboardEvent) {
			if (e.key === "ArrowUp" || e.key === "ArrowDown") keys[e.key] = false;
		}
		canvas.addEventListener("mousemove", onMove);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		let raf = 0;
		function frame() {
			if (keys.ArrowUp) playerY = Math.max(0, playerY - 7);
			if (keys.ArrowDown) playerY = Math.min(H - PADDLE_H, playerY + 7);

			if (!stopped) {
				// AI: slow, and reacts LATE — it only starts tracking once the ball has
				// crossed midfield heading toward it, and drifts to center otherwise.
				const AI_SPEED = 2.2;
				const chasing = ball.vx > 0 && ball.x > W * 0.45;
				const target = chasing ? ball.y - PADDLE_H / 2 : (H - PADDLE_H) / 2;
				const diff = target - aiY;
				if (Math.abs(diff) > 10) aiY += Math.max(-AI_SPEED, Math.min(AI_SPEED, diff));
				aiY = Math.max(0, Math.min(H - PADDLE_H, aiY));

				ball.x += ball.vx;
				ball.y += ball.vy;
				if (ball.y < BALL_R || ball.y > H - BALL_R) ball.vy *= -1;

				// player paddle (left)
				if (
					ball.vx < 0 &&
					ball.x - BALL_R < 10 + PADDLE_W &&
					ball.x > 10 &&
					ball.y > playerY &&
					ball.y < playerY + PADDLE_H
				) {
					ball.vx = Math.abs(ball.vx) + 0.4;
					ball.vy = ((ball.y - (playerY + PADDLE_H / 2)) / (PADDLE_H / 2)) * 4;
				}
				// ai paddle (right)
				if (
					ball.vx > 0 &&
					ball.x + BALL_R > W - 10 - PADDLE_W &&
					ball.x < W - 10 &&
					ball.y > aiY &&
					ball.y < aiY + PADDLE_H
				) {
					ball.vx = -(Math.abs(ball.vx) + 0.4);
					ball.vy = ((ball.y - (aiY + PADDLE_H / 2)) / (PADDLE_H / 2)) * 4;
				}

				// scoring
				if (ball.x < -BALL_R) {
					cs += 1;
					setCpu(cs);
					if (cs >= WIN) {
						stopped = true;
						setOver(true);
					} else serve(false);
				} else if (ball.x > W + BALL_R) {
					ps += 1;
					setYou(ps);
					onScoreRef.current(ps);
					if (ps >= WIN) {
						stopped = true;
						setWon(true);
						setOver(true);
					} else serve(true);
				}
			}

			ctx!.fillStyle = "#0a0f1c";
			ctx!.fillRect(0, 0, W, H);
			// net
			ctx!.fillStyle = "rgba(255,255,255,0.12)";
			for (let y = 8; y < H; y += 22) ctx!.fillRect(W / 2 - 1, y, 2, 12);
			// paddles + ball
			ctx!.fillStyle = "#38bdf8";
			ctx!.fillRect(10, playerY, PADDLE_W, PADDLE_H);
			ctx!.fillStyle = "#fb7185";
			ctx!.fillRect(W - 10 - PADDLE_W, aiY, PADDLE_W, PADDLE_H);
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
			title="Pong"
			hud={`You ${you} — CPU ${cpu}`}
			over={over}
			overLabel={won ? `You win ${you}–${cpu}!` : `CPU wins ${cpu}–${you}`}
			onRestart={() => resetRef.current()}
			controls="Move: mouse or ↑ ↓ · first to 7"
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
