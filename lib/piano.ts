"use client";

import * as Tone from "tone";

// Salamander Grand Piano — comprehensive sample set
// More samples = less pitch-shifting = more natural sound
const SAMPLE_URLS: Record<string, string> = {
  A0: "A0.mp3", B0: "B0.mp3",
  C1: "C1.mp3", D1: "D1.mp3", "D#1": "Ds1.mp3", E1: "E1.mp3", "F#1": "Fs1.mp3", G1: "G1.mp3",
  A1: "A1.mp3", B1: "B1.mp3",
  C2: "C2.mp3", D2: "D2.mp3", "D#2": "Ds2.mp3", E2: "E2.mp3", "F#2": "Fs2.mp3", G2: "G2.mp3",
  A2: "A2.mp3", B2: "B2.mp3",
  C3: "C3.mp3", D3: "D3.mp3", "D#3": "Ds3.mp3", E3: "E3.mp3", "F#3": "Fs3.mp3", G3: "G3.mp3",
  A3: "A3.mp3", B3: "B3.mp3",
  C4: "C4.mp3", D4: "D4.mp3", "D#4": "Ds4.mp3", E4: "E4.mp3", "F#4": "Fs4.mp3", G4: "G4.mp3",
  A4: "A4.mp3", B4: "B4.mp3",
  C5: "C5.mp3", D5: "D5.mp3", "D#5": "Ds5.mp3", E5: "E5.mp3", "F#5": "Fs5.mp3", G5: "G5.mp3",
  A5: "A5.mp3", B5: "B5.mp3",
  C6: "C6.mp3", D6: "D6.mp3", "D#6": "Ds6.mp3", E6: "E6.mp3", "F#6": "Fs6.mp3", G6: "G6.mp3",
  A6: "A6.mp3", B6: "B6.mp3",
  C7: "C7.mp3", D7: "D7.mp3", "D#7": "Ds7.mp3", E7: "E7.mp3", "F#7": "Fs7.mp3", G7: "G7.mp3",
  A7: "A7.mp3", B7: "B7.mp3",
  C8: "C8.mp3",
};

let sampler: Tone.Sampler | null = null;
let compressor: Tone.Compressor | null = null;
let eq3: Tone.EQ3 | null = null;
let reverb: Tone.Reverb | null = null;
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

// Call on first user interaction — loads real piano samples with effects chain
export async function initAudio(): Promise<void> {
  if (audioStarted) return;
  audioStarted = true;

  await Tone.start();

  if (samplerLoading || samplerReady) return;
  samplerLoading = true;

  // Effects chain for realistic piano sound
  compressor = new Tone.Compressor({
    threshold: -24,
    ratio: 3,
    attack: 0.003,
    release: 0.25,
    knee: 10,
  });

  eq3 = new Tone.EQ3({
    low: -2,
    mid: 1,
    high: -1,
    lowFrequency: 250,
    highFrequency: 4000,
  });

  reverb = new Tone.Reverb({
    decay: 2.5,
    preDelay: 0.01,
    wet: 0.25,
  });

  await reverb.ready;

  sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    release: 1.2,
    attack: 0,
    curve: "exponential",
    onload: notifyReady,
    onerror: (err) => {
      console.warn("Piano samples failed to load:", err);
      notifyReady();
    },
  });

  // Chain: Sampler → Compressor → EQ → Reverb → Speakers
  sampler.chain(compressor, eq3, reverb, Tone.getDestination());
}

// Map note names like "Eb5" → "D#5" for Tone.js
function normalizeNote(note: string): string {
  const flatToSharp: Record<string, string> = {
    Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B",
  };
  return note.replace(/^([A-G]b)/, (_, flat) => flatToSharp[flat] ?? flat);
}

// Play a real piano note with natural attack and release
export function playNote(note: string, durationSeconds = 0.8) {
  if (!samplerReady || !sampler) return;
  try {
    const n = normalizeNote(note);
    const now = Tone.now();
    sampler.triggerAttack(n, now, 0.8);
    sampler.triggerRelease(n, now + durationSeconds);
  } catch {
    // ignore invalid note
  }
}

export function playCorrect() {
  // Don't play extra sound on correct — the note itself already plays
}

// Short muted thud for wrong note
export function playWrong() {
  if (!samplerReady || !sampler) return;
  try {
    const now = Tone.now();
    sampler.triggerAttack("C2", now, 0.3);
    sampler.triggerRelease("C2", now + 0.15);
  } catch {}
}

// Ascending fanfare when song is finished
export function playFinish() {
  if (!samplerReady || !sampler) return;
  try {
    const now = Tone.now();
    sampler.triggerAttack("C5", now, 0.7);
    sampler.triggerRelease("C5", now + 0.4);
    sampler.triggerAttack("E5", now + 0.18, 0.7);
    sampler.triggerRelease("E5", now + 0.58);
    sampler.triggerAttack("G5", now + 0.36, 0.7);
    sampler.triggerRelease("G5", now + 0.76);
    sampler.triggerAttack("C6", now + 0.54, 0.8);
    sampler.triggerRelease("C6", now + 1.5);
  } catch {}
}

// Cleanup resources
export function disposeAudio() {
  sampler?.dispose();
  compressor?.dispose();
  eq3?.dispose();
  reverb?.dispose();
  sampler = null;
  compressor = null;
  eq3 = null;
  reverb = null;
  samplerReady = false;
  samplerLoading = false;
  audioStarted = false;
}
