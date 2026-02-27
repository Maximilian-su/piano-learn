"use client";

import { noteToMidi } from "@/data/songs";

type Props = {
  activeNotes: string[];
  targetNotes: string[];
  targetFingers?: Record<string, number>; // note name → finger number
  hand?: "right" | "left" | "both";
};

const START_MIDI = noteToMidi("C3");
const END_MIDI = noteToMidi("C6");
const BLACK_POSITIONS = [1, 3, 6, 8, 10];

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

export default function VirtualKeyboard({ activeNotes, targetNotes, targetFingers = {} }: Props) {
  const whites = getWhiteKeys();
  const blacks = getBlackKeys();
  const totalWhites = whites.length;

  const targetMidis = new Set(targetNotes.map(noteToMidi));
  const activeMidis = new Set(activeNotes.map(noteToMidi));

  // Build midi → finger map
  const fingerByMidi: Record<number, number> = {};
  Object.entries(targetFingers).forEach(([note, finger]) => {
    fingerByMidi[noteToMidi(note)] = finger;
  });

  return (
    <div className="relative w-full select-none" style={{ height: 120 }}>
      <div className="relative w-full h-full flex">
        {whites.map((midi) => {
          const name = midiToNoteName(midi);
          const isTarget = targetMidis.has(midi);
          const isActive = activeMidis.has(midi);
          const isC = midi % 12 === 0;
          const finger = fingerByMidi[midi];

          let bg = "bg-white";
          const border = "border-gray-400";
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
                <span className="text-gray-500 text-xs font-medium select-none">{name}</span>
              )}
              {isTarget && !isActive && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                  <div className="w-5 h-5 rounded-full bg-purple-500 opacity-90 flex items-center justify-center">
                    {finger && (
                      <span className="text-white text-xs font-bold leading-none">{finger}</span>
                    )}
                  </div>
                </div>
              )}
              {isActive && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-green-600 opacity-80" />
              )}
            </div>
          );
        })}
      </div>

      {/* Black keys overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {blacks.map((midi) => {
          const ws = getWhiteKeys();
          let below = midi - 1;
          while (isBlack(below)) below--;
          const belowIdx = ws.indexOf(below);

          const isTarget = targetMidis.has(midi);
          const isActive = activeMidis.has(midi);
          const finger = fingerByMidi[midi];

          let bg = "bg-gray-900";
          if (isActive) bg = "bg-green-500";
          else if (isTarget) bg = "bg-purple-500";

          const leftPct = ((belowIdx + 0.65) / totalWhites) * 100;

          return (
            <div
              key={midi}
              className={`absolute top-0 ${bg} rounded-b z-10 flex items-center justify-center transition-colors duration-75`}
              style={{
                left: `${leftPct}%`,
                width: `${(0.6 / totalWhites) * 100}%`,
                height: "65%",
              }}
            >
              {isTarget && !isActive && (
                <div className="absolute top-1 flex items-center justify-center w-4 h-4 rounded-full bg-purple-300">
                  {finger && (
                    <span className="text-purple-900 text-xs font-bold leading-none">{finger}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
