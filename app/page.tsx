"use client";

import Link from "next/link";
import { SONGS, Song } from "@/data/songs";
import { useAllProgress, useTotalStats, getSongPlayCounts } from "@/lib/useProgress";
import { startPreview, stopPreview, isPreviewPlaying, onPreviewStateChange } from "@/lib/songPreview";
import { useState, useEffect } from "react";

const difficultyLabel: Record<string, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Profi",
};

const difficultyColor: Record<string, string> = {
  beginner: "text-green-400 bg-green-400/10 border-green-400/30",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  advanced: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function HomePage() {
  const allProgress = useAllProgress();
  const totalStats = useTotalStats();
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);

  useEffect(() => {
    setPlayCounts(getSongPlayCounts());
  }, []);

  useEffect(() => {
    const unsub = onPreviewStateChange((state, songId) => {
      setPreviewingSongId(state === "playing" ? songId : null);
    });
    return () => { unsub(); stopPreview(); };
  }, []);

  function handlePreviewClick(e: React.MouseEvent, song: Song) {
    e.preventDefault();
    e.stopPropagation();
    if (isPreviewPlaying(song.id)) {
      stopPreview();
    } else {
      startPreview(song);
    }
  }

  function getBestScore(songId: string) {
    const right = allProgress[`${songId}__right`];
    const both = allProgress[`${songId}__both`];
    return Math.max(right?.score ?? 0, both?.score ?? 0);
  }

  function isCompleted(songId: string) {
    return allProgress[`${songId}__right`]?.completed || allProgress[`${songId}__both`]?.completed;
  }

  function getProgressPct(songId: string) {
    const song = SONGS.find((s) => s.id === songId);
    if (!song) return 0;
    const totalNotes = song.rightHand.filter((n) => n.hand === "right").length;
    if (totalNotes === 0) return 0;
    return Math.min(100, Math.round((getBestScore(songId) / totalNotes) * 100));
  }

  const hasAnyProgress = totalStats.totalSessions > 0;

  return (
    <main className="min-h-[calc(100vh-57px)] bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-blue-900/20" />
        <div className="relative px-6 py-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Piano Learn
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Lerne Klavier spielen — einfach, spielerisch, sofort mit echten Liedern.
          </p>

          {/* Total stats */}
          {hasAnyProgress && (
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="bg-gray-900/80 rounded-2xl px-5 py-3 text-center border border-gray-800">
                <div className="text-2xl font-bold text-purple-400">{totalStats.totalSessions}</div>
                <div className="text-xs text-gray-400">Sessions</div>
              </div>
              <div className="bg-gray-900/80 rounded-2xl px-5 py-3 text-center border border-gray-800">
                <div className="text-2xl font-bold text-green-400">{totalStats.totalCorrectNotes.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Noten richtig</div>
              </div>
              <div className="bg-gray-900/80 rounded-2xl px-5 py-3 text-center border border-gray-800">
                <div className="text-2xl font-bold text-blue-400">
                  {SONGS.filter((s) => isCompleted(s.id)).length}
                </div>
                <div className="text-xs text-gray-400">Songs gelernt</div>
              </div>
            </div>
          )}

          {!hasAnyProgress && (
            <div className="flex items-center justify-center gap-5 mt-5 text-sm text-gray-400 flex-wrap">
              {["🎤 Mikrofon", "🎹 MIDI", "💡 Fingernummern", "🎯 Tempo wählen"].map((f) => (
                <div key={f} className="flex items-center gap-1">
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* How it works (only if no progress yet) */}
        {!hasAnyProgress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
            {[
              { icon: "🎵", title: "Song wählen", desc: "Wähle ein Lied das du spielen möchtest" },
              { icon: "👁️", title: "Noten fallen", desc: "Sieh welche Taste du drücken musst" },
              { icon: "🎹", title: "Richtig spielen", desc: "Falsche Note → Lied wartet auf dich" },
            ].map((step, i) => (
              <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 text-center">
                <div className="text-3xl mb-2">{step.icon}</div>
                <div className="font-bold mb-1 text-sm">{step.title}</div>
                <div className="text-xs text-gray-400">{step.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Song catalog */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Lieder</h2>
          <span className="text-sm text-gray-500">{SONGS.length} Songs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SONGS.map((song) => {
            const pct = getProgressPct(song.id);
            const completed = isCompleted(song.id);
            const playCount = playCounts[song.id] || 0;
            const started = getBestScore(song.id) > 0;

            return (
              <Link
                key={song.id}
                href={`/practice/${song.id}`}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-4 flex items-start gap-3 transition-all group relative overflow-hidden"
              >
                {started && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-purple-500/60"
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="text-3xl flex-shrink-0">{song.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h3 className="font-bold group-hover:text-purple-300 transition-colors">
                      {song.title}
                    </h3>
                    {completed && (
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-1.5">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">{song.artist}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${difficultyColor[song.difficulty]}`}>
                      {difficultyLabel[song.difficulty]}
                    </span>
                    <span className="text-xs text-gray-500">{song.tempo} BPM</span>
                    {playCount > 0 && (
                      <span className="text-xs text-gray-500">{playCount}× gespielt</span>
                    )}
                    {started && !completed && (
                      <span className="text-xs text-purple-400">{pct}%</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handlePreviewClick(e, song)}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    previewingSongId === song.id
                      ? "bg-purple-500 text-white animate-pulse"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                  title={previewingSongId === song.id ? "Stoppen" : "Anhören"}
                >
                  {previewingSongId === song.id ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <rect width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                      <polygon points="0,0 12,7 0,14" />
                    </svg>
                  )}
                </button>
              </Link>
            );
          })}
        </div>

        {/* Tip */}
        {!hasAnyProgress && (
          <div className="mt-6 bg-blue-950/40 border border-blue-800/50 rounded-2xl p-4">
            <div className="font-semibold text-blue-400 mb-1 text-sm">Tipp für den Start</div>
            <p className="text-gray-300 text-sm">
              Fange mit <strong>Ode to Joy</strong> oder <strong>Happy Birthday</strong> an.
              Starte mit <strong>75% Tempo</strong>. Die Fingernummern (1=Daumen bis 5=kleiner Finger)
              helfen dir bei der richtigen Handposition.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
