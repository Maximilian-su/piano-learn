"use client";

import { useEffect, useRef, useCallback } from "react";
import { detectPitch, freqToNote } from "@/lib/pitchDetection";
import { initMidi, stopMidi } from "@/lib/midi";

type Props = {
  inputMode: "mic" | "midi";
  onNote: (note: string) => void;
  isActive: boolean;
};

export default function AudioEngine({ inputMode, onNote, isActive }: Props) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastNoteRef = useRef<string>("");
  const lastNoteTimeRef = useRef<number>(0);

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 4096;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);

      const detect = () => {
        analyser.getFloatTimeDomainData(buffer);
        const freq = detectPitch(buffer, ctx.sampleRate);
        if (freq) {
          const note = freqToNote(freq);
          const now = Date.now();
          // Debounce: same note must hold 80ms before reporting again
          if (note !== lastNoteRef.current || now - lastNoteTimeRef.current > 400) {
            lastNoteRef.current = note;
            lastNoteTimeRef.current = now;
            onNote(note);
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, [onNote]);

  useEffect(() => {
    if (!isActive) {
      stopMic();
      stopMidi();
      return;
    }

    if (inputMode === "mic") {
      stopMidi();
      startMic();
    } else {
      stopMic();
      initMidi(onNote);
    }

    return () => {
      stopMic();
      stopMidi();
    };
  }, [inputMode, isActive, startMic, stopMic, onNote]);

  return null; // invisible component
}
