"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Song, NoteEvent } from "@/data/songs";
import { notesMatch } from "@/lib/pitchDetection";
import { saveProgress, useProgress } from "@/lib/useProgress";
import FallingNotes from "@/components/FallingNotes";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import AudioEngine from "@/components/AudioEngine";
import Link from "next/link";

type Mode = "right" | "both";
type InputMode = "mic" | "midi";
type GameState = "idle" | "playing" | "paused" | "wrong" | "finished";

const TEMPO_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Normal", value: 1.0 },
  { label: "125%", value: 1.25 },
];

export default function PracticeClient({ song }: { song: Song }) {
  const [mode, setMode] = useState<Mode>("right");
  const [inputMode, setInputMode] = useState<InputMode>("mic");
  const [tempoMultiplier, setTempoMultiplier] = useState(1.0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedNote, setDetectedNote] = useState<string>("");
  const [wrongNoteDetected, setWrongNoteDetected] = useState(false);
  const [score, setScore] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  const savedProgress = useProgress(song.id, mode);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedBeatRef = useRef<number>(0);
  const scoreRef = useRef(0);

  const beatsPerSecond = (song.tempo * tempoMultiplier) / 60;

  const activeNotes: NoteEvent[] = mode === "right"
    ? song.rightHand.filter((n) => n.hand === "right")
    : song.bothHands;

  const rightHandNotes = activeNotes.filter((n) => n.hand === "right");
  const nextNote = rightHandNotes[currentNoteIndex];

  // Sync scoreRef with score state for callbacks
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const startGame = () => {
    setCurrentNoteIndex(0);
    setCurrentBeat(0);
    setScore(0);
    scoreRef.current = 0;
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

      const maxBeat = Math.max(...activeNotes.map((n) => n.startBeat + n.duration));
      if (beat > maxBeat + 2) {
        setGameState("finished");
        saveProgress(song.id, mode, scoreRef.current, true, Math.round(song.tempo * tempoMultiplier));
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, beatsPerSecond, activeNotes, song.id, mode, song.tempo, tempoMultiplier]);

  // Handle incoming note from mic/midi
  const handleNote = useCallback(
    (note: string) => {
      setDetectedNote(note);
      if (gameState !== "playing" && gameState !== "wrong") return;
      if (!nextNote) return;

      const expectedNote = rightHandNotes[currentNoteIndex];
      if (!expectedNote) return;

      if (notesMatch(note, expectedNote.note)) {
        setWrongNoteDetected(false);
        const newScore = scoreRef.current + 1;
        setScore(newScore);
        scoreRef.current = newScore;
        setCurrentNoteIndex((i) => i + 1);

        // Auto-save progress every 5 correct notes
        if (newScore % 5 === 0) {
          saveProgress(song.id, mode, newScore, false, Math.round(song.tempo * tempoMultiplier));
        }

        if (gameState === "wrong") {
          startTimeRef.current = performance.now();
          setGameState("playing");
        }
      } else {
        if (gameState === "playing") {
          setWrongNoteDetected(true);
          pausedBeatRef.current = currentBeat;
          setGameState("wrong");
        }
      }
    },
    [gameState, nextNote, rightHandNotes, currentNoteIndex, currentBeat, song.id, mode, song.tempo, tempoMultiplier]
  );

  // Target notes for keyboard
  const targetNoteNames = nextNote ? [nextNote.note] : [];
  const activeNoteNames = detectedNote ? [detectedNote] : [];
  const targetFingers: Record<string, number> = nextNote?.finger
    ? { [nextNote.note]: nextNote.finger }
    : {};

  const totalNotes = rightHandNotes.length;
  const progressPct = totalNotes > 0 ? Math.round((currentNoteIndex / totalNotes) * 100) : 0;

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

          {/* Saved progress */}
          {savedProgress && (
            <div className="bg-green-950/40 border border-green-800/50 rounded-xl p-4 mb-5 flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <div className="text-green-400 font-semibold text-sm">Letzter Fortschritt</div>
                <div className="text-gray-300 text-sm">
                  {savedProgress.score} Noten richtig gespielt
                  {savedProgress.completed && " • Abgeschlossen ✓"}
                  {savedProgress.tempo_used && ` • ${savedProgress.tempo_used} BPM`}
                </div>
              </div>
            </div>
          )}

          {/* Intro text */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-5">
            <h2 className="text-lg font-semibold mb-3 text-purple-400">Über dieses Stück</h2>
            <p className="text-gray-300 leading-relaxed">{song.introText}</p>
          </div>

          {/* Mode selection */}
          <div className="bg-gray-900 rounded-2xl p-5 mb-5">
            <h2 className="text-lg font-semibold mb-4 text-purple-400">Lernmodus</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("right")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "right"
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-1">🤚</div>
                <div className="font-semibold">Rechte Hand</div>
                <div className="text-xs text-gray-400 mt-1">Nur die Melodie</div>
              </button>
              <button
                onClick={() => setMode("both")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === "both"
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-2xl mb-1">🙌</div>
                <div className="font-semibold">Beide Hände</div>
                <div className="text-xs text-gray-400 mt-1">Vollständiges Stück</div>
              </button>
            </div>
          </div>

          {/* Tempo */}
          <div className="bg-gray-900 rounded-2xl p-5 mb-5">
            <h2 className="text-lg font-semibold mb-3 text-purple-400">Tempo</h2>
            <div className="flex gap-2">
              {TEMPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTempoMultiplier(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    tempoMultiplier === opt.value
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                  <div className="text-xs font-normal mt-0.5 text-gray-500">
                    {Math.round(song.tempo * opt.value)} BPM
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tipp: Starte mit 75% und steigere dich bis auf 100% (Normal)
            </p>
          </div>

          {/* Input */}
          <div className="bg-gray-900 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-purple-400">Eingabe</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInputMode("mic")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  inputMode === "mic"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-xl mb-1">🎤</div>
                <div className="font-semibold text-sm">Mikrofon</div>
              </button>
              <button
                onClick={() => setInputMode("midi")}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  inputMode === "midi"
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-xl mb-1">🎹</div>
                <div className="font-semibold text-sm">MIDI / USB</div>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setShowIntro(false);
              setTimeout(startGame, 300);
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
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => { setShowIntro(true); setGameState("idle"); }}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Zurück
        </button>
        <div className="text-center">
          <div className="font-bold text-sm">{song.title}</div>
          <div className="text-xs text-gray-400">
            {mode === "right" ? "Rechte Hand" : "Beide Hände"} •{" "}
            {Math.round(song.tempo * tempoMultiplier)} BPM
          </div>
        </div>
        <div className="text-purple-400 font-bold">{score} ✓</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Falling notes */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: 280 }}>
        <FallingNotes
          notes={activeNotes}
          currentBeat={currentBeat}
          tempo={song.tempo * tempoMultiplier}
          isPaused={gameState === "paused" || gameState === "wrong"}
          wrongNote={wrongNoteDetected}
          mode={mode}
        />

        {/* Overlays */}
        {gameState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
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
            <div className="text-center bg-gray-900 rounded-2xl p-5 shadow-2xl border border-red-500 mx-4">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-base font-bold text-red-400 mb-1">Falsche Note</div>
              <div className="text-gray-300 text-sm">Spiele die markierte Taste</div>
              {nextNote && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-purple-400">{nextNote.note}</span>
                  {nextNote.finger && (
                    <span className="text-sm text-gray-400">Finger {nextNote.finger}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {gameState === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center bg-gray-900 rounded-2xl p-8 shadow-2xl mx-4">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-2xl font-bold mb-2">Geschafft!</div>
              <div className="text-gray-400 mb-1">{score} Noten richtig gespielt</div>
              <div className="text-gray-500 text-sm mb-6">
                {Math.round(song.tempo * tempoMultiplier)} BPM • {mode === "right" ? "Rechte Hand" : "Beide Hände"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm"
                >
                  Nochmal
                </button>
                <Link
                  href="/"
                  className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm"
                >
                  Andere Songs
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* HUD: next note + detected note */}
        {gameState === "playing" && (
          <>
            {nextNote && (
              <div className="absolute top-3 right-3 bg-gray-900/90 rounded-xl p-2.5 text-center min-w-16">
                <div className="text-xs text-gray-400 mb-0.5">Nächste</div>
                <div className="text-lg font-bold text-purple-400">{nextNote.note}</div>
                {nextNote.finger && (
                  <div className="text-xs text-gray-500">Finger {nextNote.finger}</div>
                )}
              </div>
            )}
            {detectedNote && (
              <div className="absolute top-3 left-3 bg-gray-900/90 rounded-xl p-2.5 text-center min-w-16">
                <div className="text-xs text-gray-400 mb-0.5">Erkannt</div>
                <div className="text-lg font-bold text-green-400">{detectedNote}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Virtual keyboard */}
      <div className="bg-gray-900 px-2 pt-2 pb-1 border-t border-gray-800">
        <VirtualKeyboard
          activeNotes={activeNoteNames}
          targetNotes={targetNoteNames}
          targetFingers={targetFingers}
          hand={mode === "right" ? "right" : "both"}
        />
      </div>

      {/* Audio engine */}
      <AudioEngine
        inputMode={inputMode}
        onNote={handleNote}
        isActive={gameState === "playing" || gameState === "wrong"}
      />
    </div>
  );
}
