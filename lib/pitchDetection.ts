"use client";

// Autocorrelation-based pitch detection
// Returns frequency in Hz or null if no pitch detected
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const MIN_SAMPLES = Math.floor(sampleRate / 1000); // 1000 Hz max

  // Check RMS volume first — ignore silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // too quiet

  // Autocorrelation
  const autocorr = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    autocorr[lag] = sum;
  }

  // Find first minimum
  let d = 0;
  while (d < MAX_SAMPLES && autocorr[d] > autocorr[d + 1]) d++;

  // Find maximum after first minimum
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < MAX_SAMPLES; i++) {
    if (autocorr[i] > maxVal) {
      maxVal = autocorr[i];
      maxPos = i;
    }
  }

  if (maxPos < MIN_SAMPLES || maxPos >= MAX_SAMPLES) return null;

  // Parabolic interpolation for better accuracy
  const y0 = autocorr[maxPos - 1] || 0;
  const y1 = autocorr[maxPos];
  const y2 = autocorr[maxPos + 1] || 0;
  const betterPos = maxPos - (y2 - y0) / (2 * (2 * y1 - y2 - y0));

  const frequency = sampleRate / betterPos;

  // Piano range: A0 (27.5 Hz) to C8 (4186 Hz)
  if (frequency < 27 || frequency > 4200) return null;

  // Confidence check
  const confidence = maxVal / autocorr[0];
  if (confidence < 0.9) return null;

  return frequency;
}

// Convert frequency to closest note name
export function freqToNote(freq: number): string {
  const A4 = 440;
  const noteNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  ];
  const semitones = Math.round(12 * Math.log2(freq / A4)) + 69;
  const octave = Math.floor(semitones / 12) - 1;
  const noteName = noteNames[((semitones % 12) + 12) % 12];
  return `${noteName}${octave}`;
}

// Check if detected note matches target note (within 1 semitone)
export function notesMatch(detected: string, target: string): boolean {
  const noteNames = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
  ];
  const enharmonics: Record<string, string> = {
    "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
    Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
  };

  const normalize = (note: string) => {
    const match = note.match(/^([A-G][b#]?)(\d+)$/);
    if (!match) return note;
    const [, name, oct] = match;
    const normalized = enharmonics[name] || name;
    return `${normalized}${oct}`;
  };

  return normalize(detected) === normalize(target) || detected === target;
}
