"use client";

import * as Tone from "tone";

let synth: Tone.PolySynth | null = null;
let errorSynth: Tone.Synth | null = null;
let initialized = false;

function getSynth(): Tone.PolySynth {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.8, sustain: 0.15, release: 1.5 },
      volume: -8,
    }).toDestination();
  }
  return synth;
}

function getErrorSynth(): Tone.Synth {
  if (!errorSynth) {
    errorSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -16,
    }).toDestination();
  }
  return errorSynth;
}

// Must call this on user interaction (browser autoplay policy)
export async function initAudio() {
  if (initialized) return;
  await Tone.start();
  initialized = true;
}

// Play a piano note (e.g. "C4", "Eb5")
export function playNote(note: string, durationSeconds = 0.5) {
  if (!initialized) return;
  try {
    const s = getSynth();
    s.triggerAttackRelease(note, durationSeconds);
  } catch {
    // ignore if note format is invalid
  }
}

// Short positive "ding" for correct note
export function playCorrect() {
  if (!initialized) return;
  try {
    const s = getSynth();
    s.triggerAttackRelease("C5", 0.15);
  } catch {}
}

// Short low buzz for wrong note
export function playWrong() {
  if (!initialized) return;
  try {
    const s = getErrorSynth();
    s.triggerAttackRelease("C2", 0.2);
  } catch {}
}

// Fanfare for song completion
export function playFinish() {
  if (!initialized) return;
  try {
    const s = getSynth();
    const now = Tone.now();
    s.triggerAttackRelease("C5", 0.2, now);
    s.triggerAttackRelease("E5", 0.2, now + 0.15);
    s.triggerAttackRelease("G5", 0.2, now + 0.3);
    s.triggerAttackRelease("C6", 0.5, now + 0.45);
  } catch {}
}
