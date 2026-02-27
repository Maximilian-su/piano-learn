"use client";

import { noteToMidi } from "@/data/songs";

type Props = {
  activeNotes: string[]; // currently pressed notes (green = correct)
  targetNotes: string[]; // notes to press (highlighted)
  hand?: "right" | "left" | "both";
};

// Keys to show: from C3 to C6 (3 octaves)
const START_MIDI = noteToMidi("C3");
const END_MIDI = noteToMidi("C6");

const BLACK_POSITIONS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A# within octave

function isBlack(midi: number): boolean {
  return BLACK_POSITIONS.includes(midi % 12);
}

function getWhiteKeys() {
  const keys: number[] = [];
  for (let m = START_MIDI; m <= END_MIDI; m++) {
    if (!isBlack(m)) keys.push(m);
  }
  return keys;
}

function getBlackKeys() {
  const keys: number[] = [];
  for (let m = START_MIDI; m <= END_MIDI; m++) {
    if (isBlack(m)) keys.push(m);
  }
  return keys;
}

function midiToNoteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

// Position of white key (index among white keys)
function whiteKeyIndex(midi: number): number {
  const whites = getWhiteKeys();
  return whites.indexOf(midi);
}

// For black keys: position between white keys
function blackKeyPosition(midi: number): number {
  const whites = getWhiteKeys();
  // Find the white key just below
  let below = midi - 1;
  while (isBlack(below)) below--;
  const belowIdx = whites.indexOf(below);
  return belowIdx + 0.6; // slightly right of the white key
}

export default function VirtualKeyboard({ activeNotes, targetNotes }: Props) {
  const whites = getWhiteKeys();
  const blacks = getBlackKeys();
  const totalWhites = whites.length;

  const targetMidis = new Set(targetNotes.map(noteToMidi));
  const activeMidis = new Set(activeNotes.map(noteToMidi));

  return (
    <div className="relative w-full select-none" style={{ height: 120 }}>
      <div className="relative w-full h-full flex">
        {whites.map((midi, i) => {
          const name = midiToNoteName(midi);
          const isTarget = targetMidis.has(midi);
          const isActive = activeMidis.has(midi);
          const isC = midi % 12 === 0;

          let bg = "bg-white";
          let border = "border-gray-400";
          if (isActive) {
            bg = "bg-green-400";
          } else if (isTarget) {
            bg = "bg-purple-300";
          }

          return (
            <div
              key={midi}
              className={`relative flex-1 ${bg} border ${border} border-b-2 rounded-b-sm flex items-end justify-center pb-1 cursor-pointer transition-colors duration-75`}
              style={{ minWidth: 0 }}
            >
              {isC && (
                <span className="text-gray-500 text-xs font-medium select-none">
                  {name}
                </span>
              )}
              {isTarget && !isActive && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 opacity-80" />
              )}
            </div>
          );
        })}
      </div>

      {/* Black keys overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {blacks.map((midi) => {
          const whites = getWhiteKeys();
          let below = midi - 1;
          while (isBlack(below)) below--;
          const belowIdx = whites.indexOf(below);

          const isTarget = targetMidis.has(midi);
          const isActive = activeMidis.has(midi);

          let bg = "bg-gray-900";
          if (isActive) bg = "bg-green-500";
          else if (isTarget) bg = "bg-purple-500";

          const leftPct = ((belowIdx + 0.65) / totalWhites) * 100;

          return (
            <div
              key={midi}
              className={`absolute top-0 ${bg} rounded-b z-10 flex items-end justify-center pb-1 transition-colors duration-75`}
              style={{
                left: `${leftPct}%`,
                width: `${(0.6 / totalWhites) * 100}%`,
                height: "65%",
              }}
            >
              {isTarget && !isActive && (
                <div className="w-3 h-3 rounded-full bg-purple-300 opacity-90" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
