"use client";

import { Song } from "@/data/songs";
import { initAudio, isSamplerReady, onSamplerReady, playNote } from "./piano";

type PreviewState = "idle" | "loading" | "playing";
type StateChangeCallback = (state: PreviewState, songId: string) => void;

let currentPreviewSongId: string | null = null;
let previewTimeouts: ReturnType<typeof setTimeout>[] = [];
let stateCallbacks: StateChangeCallback[] = [];
let currentState: PreviewState = "idle";

export function onPreviewStateChange(cb: StateChangeCallback): () => void {
  stateCallbacks.push(cb);
  return () => {
    stateCallbacks = stateCallbacks.filter((c) => c !== cb);
  };
}

function setState(state: PreviewState, songId: string) {
  currentState = state;
  stateCallbacks.forEach((cb) => cb(state, songId));
}

export function isPreviewPlaying(songId?: string): boolean {
  if (songId) return currentState === "playing" && currentPreviewSongId === songId;
  return currentState === "playing";
}

export async function startPreview(song: Song): Promise<void> {
  stopPreview();

  currentPreviewSongId = song.id;
  setState("loading", song.id);

  await initAudio();

  if (!isSamplerReady()) {
    await new Promise<void>((resolve) => onSamplerReady(resolve));
  }

  // Check if stopped while loading
  if (currentPreviewSongId !== song.id) return;

  setState("playing", song.id);

  const notes = song.rightHand.filter((n) => n.hand === "right");
  const beatsPerSecond = song.tempo / 60;

  notes.forEach((note) => {
    const startTimeMs = (note.startBeat / beatsPerSecond) * 1000;
    const durationSec = note.duration * (60 / song.tempo);

    const timeout = setTimeout(() => {
      if (currentPreviewSongId !== song.id) return;
      playNote(note.note, durationSec);
    }, startTimeMs);

    previewTimeouts.push(timeout);
  });

  // Auto-stop after last note
  const lastNote = notes[notes.length - 1];
  if (lastNote) {
    const endTimeMs = ((lastNote.startBeat + lastNote.duration) / beatsPerSecond) * 1000 + 500;
    const endTimeout = setTimeout(() => {
      if (currentPreviewSongId === song.id) {
        stopPreview();
      }
    }, endTimeMs);
    previewTimeouts.push(endTimeout);
  }
}

export function stopPreview(): void {
  previewTimeouts.forEach(clearTimeout);
  previewTimeouts = [];
  const prevSongId = currentPreviewSongId;
  currentPreviewSongId = null;
  if (prevSongId) {
    setState("idle", prevSongId);
  }
}
