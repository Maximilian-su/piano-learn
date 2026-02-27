"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Song, NoteEvent } from "@/data/songs";
import { notesMatch } from "@/lib/pitchDetection";
import { saveProgress, useProgress, useSongStats, incrementPlayCount } from "@/lib/useProgress";
import { initAudio, playNote, playCorrect, playWrong, playFinish } from "@/lib/piano";
import FallingNotes from "@/components/FallingNotes";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import AudioEngine from "@/components/AudioEngine";
import Link from "next/link";

type Mode = "right" | "both";
type InputMode = "mic" | "midi";
type GameState = "idle" | "countdown" | "playing" | "wrong" | "finished";

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
  const [countdown, setCountdown] = useState(3);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedNote, setDetectedNote] = useState<string>("");
  const [wrongNoteDetected, setWrongNoteDetected] = useState(false);
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  const savedProgress = useProgress(song.id, mode);
  const songStats = useSongStats(song.id);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedBeatRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const playedBeatsRef = useRef<Set<number>>(new Set());

  const beatsPerSecond = (song.tempo * tempoMultiplier) / 60;

  const activeNotes: NoteEvent[] = mode === "right"
    ? song.rightHand.filter((n) => n.hand === "right")
    : song.bothHands;

  const rightHandNotes = activeNotes.filter((n) => n.hand === "right");
  const nextNote = rightHandNotes[currentNoteIndex];
  const totalNotes = rightHandNotes.length;
  const progressPct = totalNotes > 0 ? Math.round((currentNoteIndex / totalNotes) * 100) : 0;

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Countdown logic
  useEffect(() => {
    if (gameState !== "countdown") return;
    setCountdown(3);
    playedBeatsRef.current = new Set();

    const steps = [3, 2, 1, 0];
    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach((n, i) => {
      timers.push(setTimeout(() => setCountdown(n), i * 900));
    });

    timers.push(
      setTimeout(() => {
        startTimeRef.current = performance.now();
        setGameState("playing");
      }, 3600)
    );

    return () => timers.forEach(clearTimeout);
  }, [gameState]);

  const startGame = useCallback(async () => {
    await initAudio();
    incrementPlayCount(song.id);
    setCurrentNoteIndex(0);
    setCurrentBeat(0);
    setScore(0);
    scoreRef.current = 0;
    setWrongNoteDetected(false);
    pausedBeatRef.current = 0;
    playedBeatsRef.current = new Set();
    setGameState("countdown");
  }, [song.id]);

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

      // Sound preview: play notes as they hit the line
      if (soundEnabled) {
        activeNotes.forEach((note) => {
          const beatKey = Math.round(note.startBeat * 100);
          const diff = Math.abs(note.startBeat - beat);
          if (diff < 0.08 && !playedBeatsRef.current.has(beatKey)) {
            playedBeatsRef.current.add(beatKey);
            playNote(note.note, note.duration * (60 / (song.tempo * tempoMultiplier)));
          }
        });
      }

      const maxBeat = Math.max(...activeNotes.map((n) => n.startBeat + n.duration));
      if (beat > maxBeat + 2) {
        setGameState("finished");
        if (soundEnabled) playFinish();
        saveProgress(song.id, mode, scoreRef.current, true, Math.round(song.tempo * tempoMultiplier), totalNotes);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, beatsPerSecond, activeNotes, song.id, song.tempo, tempoMultiplier, mode, soundEnabled, totalNotes]);

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
        if (soundEnabled) playCorrect();

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
          if (soundEnabled) playWrong();
          setGameState("wrong");
        }
      }
    },
    [gameState, nextNote, rightHandNotes, currentNoteIndex, currentBeat, song.id, mode, song.tempo, tempoMultiplier, soundEnabled]
  );

  const targetNoteNames = nextNote ? [nextNote.note] : [];
  const activeNoteNames = detectedNote ? [detectedNote] : [];
  const targetFingers: Record<string, number> = nextNote?.finger
    ? { [nextNote.note]: nextNote.finger }
    : {};

  if (showIntro) {
    return (
      <div className="min-h-[calc(100vh-57px)] bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="mb-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
              ← Zurück zur Songauswahl
            </Link>
          </div>
          <div className="text-5xl mb-3">{song.emoji}</div>
          <h1 className="text-3xl font-bold mb-1">{song.title}</h1>
          <p className="text-gray-400 mb-5">{song.artist}</p>

          {/* Stats */}
          {(savedProgress || songStats.count > 0) && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-5 flex gap-4">
              {songStats.count > 0 && (
                <div className="text-center flex-1 border-r border-gray-700">
                  <div className="text-2xl font-bold text-purple-400">{songStats.count}×</div>
                  <div className="text-xs text-gray-400 mt-0.5">gespielt</div>
                </div>
              )}
              {savedProgress && (
                <div className="text-center flex-1 border-r border-gray-700">
                  <div className="text-2xl font-bold text-green-400">{savedProgress.score}</div>
                  <div className="text-xs text-gray-400 mt-0.5">bester Score</div>
                </div>
              )}
              {savedProgress?.completed && (
                <div className="text-center flex-1">
                  <div className="text-2xl">🏆</div>
                  <div className="text-xs text-gray-400 mt-0.5">Abgeschlossen</div>
                </div>
              )}
              {!savedProgress?.completed && savedProgress && (
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round((savedProgress.score / totalNotes) * 100)}%
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Fortschritt</div>
                </div>
              )}
            </div>
          )}

          {/* Letzte 5 Sessions Mini-Chart */}
          {songStats.sessions.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-5">
              <div className="text-xs text-gray-400 mb-2">Letzte Sessions</div>
              <div className="flex items-end gap-1 h-10">
                {songStats.sessions.slice(0, 7).reverse().map((s, i) => {
                  const pct = totalNotes > 0 ? Math.round((s.score / totalNotes) * 100) : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-sm bg-purple-500 opacity-70 min-h-[2px]"
                        style={{ height: `${Math.max(4, pct * 0.36)}px` }}
                        title={`${pct}% (${s.score} Noten)`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Intro text */}
          <div className="bg-gray-900 rounded-2xl p-5 mb-4">
            <h2 className="text-base font-semibold mb-2 text-purple-400">Über dieses Stück</h2>
            <p className="text-gray-300 leading-relaxed text-sm">{song.introText}</p>
          </div>

          {/* Mode */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
            <h2 className="text-base font-semibold mb-3 text-purple-400">Lernmodus</h2>
            <div className="grid grid-cols-2 gap-3">
              {(["right", "both"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    mode === m ? "border-purple-500 bg-purple-500/20" : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="text-xl mb-0.5">{m === "right" ? "🤚" : "🙌"}</div>
                  <div className="font-semibold text-sm">{m === "right" ? "Rechte Hand" : "Beide Hände"}</div>
                  <div className="text-xs text-gray-400">{m === "right" ? "Nur Melodie" : "Volle Version"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tempo */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
            <h2 className="text-base font-semibold mb-3 text-purple-400">Tempo</h2>
            <div className="flex gap-2">
              {TEMPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTempoMultiplier(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    tempoMultiplier === opt.value
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                  <div className="text-xs font-normal text-gray-500">{Math.round(song.tempo * opt.value)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input + Sound */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-6">
            <h2 className="text-base font-semibold mb-3 text-purple-400">Eingabe & Sound</h2>
            <div className="grid grid-cols-3 gap-2">
              {(["mic", "midi"] as InputMode[]).map((inp) => (
                <button
                  key={inp}
                  onClick={() => setInputMode(inp)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    inputMode === inp ? "border-blue-500 bg-blue-500/20" : "border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="text-xl mb-0.5">{inp === "mic" ? "🎤" : "🎹"}</div>
                  <div className="text-xs font-semibold">{inp === "mic" ? "Mikrofon" : "MIDI/USB"}</div>
                </button>
              ))}
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  soundEnabled ? "border-yellow-500 bg-yellow-500/20" : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-xl mb-0.5">{soundEnabled ? "🔊" : "🔇"}</div>
                <div className="text-xs font-semibold">Sound {soundEnabled ? "an" : "aus"}</div>
              </button>
            </div>
          </div>

          <button
            onClick={() => { setShowIntro(false); setTimeout(startGame, 100); }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-lg font-bold transition-all active:scale-95"
          >
            Los geht&apos;s! 🎵
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => { setShowIntro(true); setGameState("idle"); cancelAnimationFrame(rafRef.current); }}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Zurück
        </button>
        <div className="text-center">
          <div className="font-bold text-sm">{song.title}</div>
          <div className="text-xs text-gray-400">
            {mode === "right" ? "🤚" : "🙌"} {Math.round(song.tempo * tempoMultiplier)} BPM
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="text-lg"
            title={soundEnabled ? "Sound aus" : "Sound an"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <span className="text-purple-400 font-bold">{score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 flex-shrink-0">
        <div
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Falling notes — fills remaining space */}
      <div className="flex-1 relative min-h-0">
        <FallingNotes
          notes={activeNotes}
          currentBeat={currentBeat}
          tempo={song.tempo * tempoMultiplier}
          isPaused={gameState === "wrong" || gameState === "countdown"}
          wrongNote={wrongNoteDetected}
          mode={mode}
        />

        {/* Countdown overlay */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-center">
              {countdown > 0 ? (
                <div
                  key={countdown}
                  className="text-8xl font-black text-white"
                  style={{ animation: "countPulse 0.9s ease-out" }}
                >
                  {countdown}
                </div>
              ) : (
                <div className="text-5xl font-black text-green-400">Los!</div>
              )}
            </div>
          </div>
        )}

        {/* Wrong note overlay */}
        {gameState === "wrong" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/60 z-10">
            <div className="text-center bg-gray-900 rounded-2xl p-5 shadow-2xl border border-red-500 mx-4">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-base font-bold text-red-400 mb-1">Falsche Note</div>
              <div className="text-gray-300 text-sm mb-2">Spiele die markierte Taste</div>
              {nextNote && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-purple-400">{nextNote.note}</span>
                  {nextNote.finger && (
                    <span className="text-sm bg-purple-900/50 text-purple-300 rounded-full px-2 py-0.5">
                      Finger {nextNote.finger}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Finished overlay */}
        {gameState === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center bg-gray-900 rounded-2xl p-8 shadow-2xl mx-4">
              <div className="text-5xl mb-3">🎉</div>
              <div className="text-2xl font-bold mb-1">Geschafft!</div>
              <div className="text-gray-400 mb-0.5">{score} von {totalNotes} Noten richtig</div>
              <div className="text-gray-500 text-sm mb-6">
                {Math.round((score / totalNotes) * 100)}% • {Math.round(song.tempo * tempoMultiplier)} BPM
              </div>
              <div className="flex gap-3 justify-center">
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
                  Songauswahl
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* HUD */}
        {(gameState === "playing" || gameState === "wrong") && (
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
            {detectedNote && gameState === "playing" && (
              <div className="absolute top-3 left-3 bg-gray-900/90 rounded-xl p-2.5 text-center min-w-16">
                <div className="text-xs text-gray-400 mb-0.5">Erkannt</div>
                <div className="text-lg font-bold text-green-400">{detectedNote}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Virtual keyboard */}
      <div className="bg-gray-900 px-2 pt-2 pb-1 border-t border-gray-800 flex-shrink-0">
        <VirtualKeyboard
          activeNotes={activeNoteNames}
          targetNotes={targetNoteNames}
          targetFingers={targetFingers}
        />
      </div>

      {/* Audio engine */}
      <AudioEngine
        inputMode={inputMode}
        onNote={handleNote}
        isActive={gameState === "playing" || gameState === "wrong"}
      />

      <style>{`
        @keyframes countPulse {
          0% { transform: scale(1.5); opacity: 0; }
          30% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
