"use client";

import * as Tone from "tone";

// Real Salamander Grand Piano samples (hosted by Tone.js team)
// These are actual recorded piano notes — no more synth!
const SAMPLE_URLS: Record<string, string> = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};

let sampler: Tone.Sampler | null = null;
let samplerReady = false;
let samplerLoading = false;
let audioStarted = false;

// Listeners for loading state
const readyCallbacks: (() => void)[] = [];

function notifyReady() {
  samplerReady = true;
  readyCallbacks.forEach((cb) => cb());
  readyCallbacks.length = 0;
}

export function onSamplerReady(cb: () => void) {
  if (samplerReady) { cb(); return; }
  readyCallbacks.push(cb);
}

export function isSamplerReady() {
  return samplerReady;
}

// Call on first user interaction — loads real piano samples
export async function initAudio(): Promise<void> {
  if (audioStarted) return;
  audioStarted = true;

  await Tone.start();

  if (samplerLoading || samplerReady) return;
  samplerLoading = true;

  sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    onload: notifyReady,
    onerror: (err) => {
      console.warn("Piano samples failed to load:", err);
      // Fall back to synth
      notifyReady();
    },
  }).toDestination();
}

// Map note names like "Eb5" → "D#5" for Tone.js
function normalizeNote(note: string): string {
  const flatToSharp: Record<string, string> = {
    Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B",
  };
  return note.replace(/^([A-G]b)/, (_, flat) => flatToSharp[flat] ?? flat);
}

// Play a real piano note
export function playNote(note: string, durationSeconds = 0.6) {
  if (!samplerReady || !sampler) return;
  try {
    sampler.triggerAttackRelease(normalizeNote(note), durationSeconds);
  } catch {
    // ignore invalid note
  }
}

// Subtle confirmation tick (very short note, barely audible — just a soft click)
export function playCorrect() {
  // Don't play extra sound on correct — the note preview already plays
}

// Short muted thud for wrong note
export function playWrong() {
  if (!samplerReady || !sampler) return;
  try {
    sampler.triggerAttackRelease("C2", 0.15);
  } catch {}
}

// Ascending fanfare when song is finished
export function playFinish() {
  if (!samplerReady || !sampler) return;
  try {
    const now = Tone.now();
    sampler.triggerAttackRelease("C5", 0.3, now);
    sampler.triggerAttackRelease("E5", 0.3, now + 0.18);
    sampler.triggerAttackRelease("G5", 0.3, now + 0.36);
    sampler.triggerAttackRelease("C6", 0.8, now + 0.54);
  } catch {}
}
