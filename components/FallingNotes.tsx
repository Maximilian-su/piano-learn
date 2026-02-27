"use client";

import { useEffect, useRef } from "react";
import { NoteEvent } from "@/data/songs";
import { noteToMidi } from "@/data/songs";

type Props = {
  notes: NoteEvent[];
  currentBeat: number;
  tempo: number; // BPM
  isPaused: boolean;
  wrongNote: boolean;
  mode: "right" | "both";
};

// Same range as VirtualKeyboard: C3 to C6
const START_MIDI = noteToMidi("C3");
const END_MIDI = noteToMidi("C6");
const TOTAL_MIDI_RANGE = END_MIDI - START_MIDI;

// How many beats are visible on screen (look-ahead)
const VISIBLE_BEATS = 8;

// Colors
const RIGHT_COLOR = "#a855f7"; // purple-500
const LEFT_COLOR = "#3b82f6"; // blue-500
const HIT_COLOR = "#22c55e"; // green-500

function midiToXPercent(midi: number): number {
  const BLACK_POSITIONS = [1, 3, 6, 8, 10];
  // Count white keys from START_MIDI to midi
  let whiteCount = 0;
  let totalWhites = 0;
  for (let m = START_MIDI; m <= END_MIDI; m++) {
    if (!BLACK_POSITIONS.includes(m % 12)) totalWhites++;
  }

  let whitesBefore = 0;
  for (let m = START_MIDI; m < midi; m++) {
    if (!BLACK_POSITIONS.includes(m % 12)) whitesBefore++;
  }

  const isBlack = BLACK_POSITIONS.includes(midi % 12);
  if (isBlack) {
    // Find white key just below
    let below = midi - 1;
    while (BLACK_POSITIONS.includes(below % 12)) below--;
    let belowWhites = 0;
    for (let m = START_MIDI; m < below; m++) {
      if (!BLACK_POSITIONS.includes(m % 12)) belowWhites++;
    }
    return ((belowWhites + 0.65 + 0.3) / totalWhites) * 100;
  }

  return ((whitesBefore + 0.5) / totalWhites) * 100;
}

function getNoteWidth(midi: number): number {
  const BLACK_POSITIONS = [1, 3, 6, 8, 10];
  return BLACK_POSITIONS.includes(midi % 12) ? 2.5 : 4;
}

export default function FallingNotes({
  notes,
  currentBeat,
  tempo,
  isPaused,
  wrongNote,
  mode,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0f0f1a");
      grad.addColorStop(1, "#1a1a2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Hit line (where notes need to be played)
      const hitY = H - 30;
      ctx.strokeStyle = wrongNote ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = wrongNote ? "#ef4444" : "#22c55e";
      ctx.beginPath();
      ctx.moveTo(0, hitY);
      ctx.lineTo(W, hitY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw visible notes
      const filteredNotes = mode === "right"
        ? notes.filter((n) => n.hand === "right")
        : notes;

      filteredNotes.forEach((note) => {
        const midi = noteToMidi(note.note);
        if (midi < START_MIDI || midi > END_MIDI) return;

        // y position: notes fall from top to hit line
        // currentBeat = beat at hit line
        // note.startBeat = when note should be at hit line
        const beatDiff = note.startBeat - currentBeat;
        // beatDiff > 0 = note is still coming (above hit line)
        // beatDiff < 0 = note has passed
        // beatDiff === 0 = note is exactly at hit line

        if (beatDiff < -note.duration || beatDiff > VISIBLE_BEATS) return;

        const x = (midiToXPercent(midi) / 100) * W;
        const noteW = (getNoteWidth(midi) / 100) * W;

        // Y position of top of note
        const noteTopBeat = note.startBeat;
        const noteBotBeat = note.startBeat + note.duration;

        const yTop = hitY - ((noteTopBeat - currentBeat) / VISIBLE_BEATS) * hitY;
        const yBot = hitY - ((noteBotBeat - currentBeat) / VISIBLE_BEATS) * hitY;

        // Clamp to canvas
        const drawTop = Math.max(0, Math.min(hitY, yBot));
        const drawBot = Math.max(0, Math.min(hitY, yTop));
        const noteH = drawBot - drawTop;

        if (noteH <= 0) return;

        const color = note.hand === "left" ? LEFT_COLOR : RIGHT_COLOR;

        // Glow effect
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;

        // Note body
        ctx.fillStyle = color;
        const radius = Math.min(6, noteW / 2, noteH / 2);
        ctx.beginPath();
        ctx.roundRect(x - noteW / 2, drawTop, noteW, noteH, radius);
        ctx.fill();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x - noteW / 2 + 2, drawTop + 2, noteW * 0.4, noteH - 4);
      });

      // Beat lines (subtle grid)
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      for (let b = 0; b <= VISIBLE_BEATS; b++) {
        const y = hitY - (b / VISIBLE_BEATS) * hitY;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    };

    draw();
  }, [notes, currentBeat, tempo, isPaused, wrongNote, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="w-full h-full rounded-t-xl"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
