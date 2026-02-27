"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Song, NoteEvent } from "@/data/songs";
import { notesMatch } from "@/lib/pitchDetection";
import FallingNotes from "@/components/FallingNotes";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import AudioEngine from "@/components/AudioEngine";
import Link from "next/link";

type Mode = "right" | "both";
type InputMode = "mic" | "midi";
type GameState = "idle" | "playing" | "paused" | "wrong" | "finished";

export default function PracticeClient({ song }: { song: Song }) {
  const [mode, setMode] = useState<Mode>("right");
  const [inputMode, setInputMode] = useState<InputMode>("mic");
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedNote, setDetectedNote] = useState<string>("");
  const [wrongNoteDetected, setWrongNoteDetected] = useState(false);
  const [score, setScore] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedBeatRef = useRef<number>(0);
  const beatsPerSecond = song.tempo / 60;

  // Get only the notes for current mode
  const activeNotes: NoteEvent[] = mode === "right"
    ? song.rightHand.filter((n) => n.hand === "right")
    : song.bothHands;

  // Notes that need to be played right now (at hit line)
  const currentTargetNotes = activeNotes.filter((note) => {
    const diff = Math.abs(note.startBeat - currentBeat);
    return diff < 0.3; // within 0.3 beats of hit line
  });

  // For the next upcoming note
  const nextNoteIndex = activeNotes
    .filter((n) => n.hand === "right" || mode === "right")
    .findIndex((n, i) => i === currentNoteIndex);

  const nextNote = activeNotes.filter(
    (n) => mode === "right" ? n.hand === "right" : true
  )[currentNoteIndex];

  const startGame = () => {
    setCurrentNoteIndex(0);
    setCurrentBeat(0);
    setScore(0);
    setWrongNoteDetected(false);
    pausedBeatRef.current = 0;
    startTimeRef.current = performance.now();
    setGameState("playing");
  };

  // Animation loop
  useEffect(() => {
    if (gameState !== "playing") {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const beat = pausedBeatRef.current + elapsed * beatsPerSecond;
      setCurrentBeat(beat);

      // Check if song is finished
      const maxBeat = Math.max(...activeNotes.map((n) => n.startBeat + n.duration));
      if (beat > maxBeat + 2) {
        setGameState("finished");
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, beatsPerSecond, activeNotes]);

  // Handle incoming note from mic/midi
  const handleNote = useCallback(
    (note: string) => {
      setDetectedNote(note);
      if (gameState !== "playing" && gameState !== "wrong") return;
      if (!nextNote) return;

      // Only check right-hand notes for validation
      const rightHandNotes = activeNotes.filter((n) => n.hand === "right");
      const expectedNote = rightHandNotes[currentNoteIndex];
      if (!expectedNote) return;

      if (notesMatch(note, expectedNote.note)) {
        // Correct!
        setWrongNoteDetected(false);
        setScore((s) => s + 1);
        setCurrentNoteIndex((i) => i + 1);

        // If was paused on wrong note, resume
        if (gameState === "wrong") {
          startTimeRef.current = performance.now();
          setGameState("playing");
        }
      } else {
        // Wrong note!
        if (gameState === "playing") {
          setWrongNoteDetected(true);
          pausedBeatRef.current = currentBeat;
          setGameState("wrong");
        }
      }
    },
    [gameState, nextNote, activeNotes, currentNoteIndex, currentBeat]
  );

  // Target notes for keyboard highlight
  const targetNoteNames = nextNote ? [nextNote.note] : [];
  const activeNoteNames = detectedNote ? [detectedNote] : [];

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="mb-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
              ← Zurück zur Songauswahl
            </Link>
          </div>
          <div className="text-5xl mb-4">{song.emoji}</div>
          <h1 className="text-3xl font-bold mb-2">{song.title}</h1>
          <p className="text-gray-400 mb-6">{song.artist}</p>

          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-purple-400">Über dieses Stück</h2>
            <p className="text-gray-300 leading-relaxed">{song.introText}</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-purple-400">Lernmodus wählen</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode("right")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "right"
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-2">🤚</div>
                <div className="font-semibold">Rechte Hand</div>
                <div className="text-sm text-gray-400 mt-1">
                  Nur die Melodie — perfekt zum Einstieg
                </div>
              </button>
              <button
                onClick={() => setMode("both")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "both"
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-2">🙌</div>
                <div className="font-semibold">Beide Hände</div>
                <div className="text-sm text-gray-400 mt-1">
                  Melodie + Begleitung — die volle Version
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-purple-400">Eingabe wählen</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setInputMode("mic")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  inputMode === "mic"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-2">🎤</div>
                <div className="font-semibold">Mikrofon</div>
                <div className="text-sm text-gray-400 mt-1">
                  Dein PC-Mikrofon hört das Klavier
                </div>
              </button>
              <button
                onClick={() => setInputMode("midi")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  inputMode === "midi"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-2">🎹</div>
                <div className="font-semibold">MIDI / USB</div>
                <div className="text-sm text-gray-400 mt-1">
                  Klavier per USB-Kabel verbinden
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setShowIntro(false);
              setTimeout(startGame, 500);
            }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-lg font-bold transition-all active:scale-95"
          >
            Los geht&apos;s! 🎵
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => setShowIntro(true)}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Zurück
        </button>
        <div className="text-center">
          <div className="font-bold">{song.title}</div>
          <div className="text-xs text-gray-400">
            {mode === "right" ? "Rechte Hand" : "Beide Hände"} •{" "}
            {inputMode === "mic" ? "Mikrofon" : "MIDI"}
          </div>
        </div>
        <div className="text-purple-400 font-bold">{score} ✓</div>
      </div>

      {/* Falling notes area */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: 300 }}>
        <FallingNotes
          notes={activeNotes}
          currentBeat={currentBeat}
          tempo={song.tempo}
          isPaused={gameState === "paused" || gameState === "wrong"}
          wrongNote={wrongNoteDetected}
          mode={mode}
        />

        {/* Status overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl text-xl font-bold"
            >
              ▶ Start
            </button>
          </div>
        )}
        {gameState === "wrong" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/60">
            <div className="text-center bg-gray-900 rounded-2xl p-6 shadow-2xl border border-red-500">
              <div className="text-4xl mb-2">❌</div>
              <div className="text-lg font-bold text-red-400 mb-1">Falsche Note</div>
              <div className="text-gray-300 text-sm mb-2">Spiele die markierte Taste</div>
              {nextNote && (
                <div className="text-2xl font-bold text-purple-400">{nextNote.note}</div>
              )}
            </div>
          </div>
        )}
        {gameState === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center bg-gray-900 rounded-2xl p-8 shadow-2xl">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-2xl font-bold mb-2">Geschafft!</div>
              <div className="text-gray-400 mb-6">{score} Noten richtig gespielt</div>
              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold"
                >
                  Nochmal
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                >
                  Andere Songs
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Next note indicator */}
        {gameState === "playing" && nextNote && (
          <div className="absolute top-4 right-4 bg-gray-900/90 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Nächste Note</div>
            <div className="text-xl font-bold text-purple-400">{nextNote.note}</div>
            <div className="text-xs text-gray-500 mt-1">
              {nextNote.hand === "right" ? "Rechts" : "Links"}
            </div>
          </div>
        )}

        {/* Detected note indicator */}
        {detectedNote && gameState === "playing" && (
          <div className="absolute top-4 left-4 bg-gray-900/90 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Erkannte Note</div>
            <div className="text-xl font-bold text-green-400">{detectedNote}</div>
          </div>
        )}
      </div>

      {/* Virtual keyboard */}
      <div className="bg-gray-900 p-2 border-t border-gray-800">
        <VirtualKeyboard
          activeNotes={activeNoteNames}
          targetNotes={targetNoteNames}
          hand={mode === "right" ? "right" : "both"}
        />
      </div>

      {/* Audio engine (invisible) */}
      <AudioEngine
        inputMode={inputMode}
        onNote={handleNote}
        isActive={gameState === "playing" || gameState === "wrong"}
      />
    </div>
  );
}
