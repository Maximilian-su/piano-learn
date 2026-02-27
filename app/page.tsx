"use client";

import Link from "next/link";
import { SONGS } from "@/data/songs";
import { useAllProgress } from "@/lib/useProgress";

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

  function getSongProgress(songId: string) {
    const right = allProgress[`${songId}__right`];
    const both = allProgress[`${songId}__both`];
    return { right, both };
  }

  function getBestScore(songId: string) {
    const { right, both } = getSongProgress(songId);
    const scores = [right?.score ?? 0, both?.score ?? 0];
    return Math.max(...scores);
  }

  function isCompleted(songId: string) {
    const { right, both } = getSongProgress(songId);
    return right?.completed || both?.completed;
  }

  function getProgressPct(songId: string) {
    const song = SONGS.find((s) => s.id === songId);
    if (!song) return 0;
    const totalNotes = song.rightHand.filter((n) => n.hand === "right").length;
    const best = getBestScore(songId);
    return Math.min(100, Math.round((best / totalNotes) * 100));
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-blue-900/20" />
        <div className="relative px-6 py-14 text-center max-w-3xl mx-auto">
          <div className="text-6xl mb-4">🎹</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Piano Learn
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Lerne Klavier spielen — einfach, spielerisch, sofort mit echten Liedern.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Mikrofon-Erkennung
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> MIDI Support
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Fingernummern
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span> Tempo anpassen
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "🎵", title: "Song wählen", desc: "Wähle ein Lied das du spielen möchtest" },
            { icon: "👁️", title: "Noten fallen", desc: "Sieh welche Taste du drücken musst" },
            { icon: "🎹", title: "Richtig spielen", desc: "Falsche Note → Lied wartet auf dich" },
          ].map((step, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <div className="text-3xl mb-2">{step.icon}</div>
              <div className="font-bold mb-1">{step.title}</div>
              <div className="text-sm text-gray-400">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Song catalog */}
        <h2 className="text-2xl font-bold mb-5">Lieder wählen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SONGS.map((song) => {
            const pct = getProgressPct(song.id);
            const completed = isCompleted(song.id);
            const best = getBestScore(song.id);
            const started = best > 0;

            return (
              <Link
                key={song.id}
                href={`/practice/${song.id}`}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-5 flex items-start gap-4 transition-all group relative overflow-hidden"
              >
                {/* Progress bar background */}
                {started && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-purple-500/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="text-4xl">{song.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-lg group-hover:text-purple-300 transition-colors">
                      {song.title}
                    </h3>
                    {completed && (
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                        ✓ Fertig
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm mb-1">{song.artist}</div>
                  <p className="text-gray-500 text-sm line-clamp-2">{song.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColor[song.difficulty]}`}
                    >
                      {difficultyLabel[song.difficulty]}
                    </span>
                    <span className="text-xs text-gray-500">{song.tempo} BPM</span>
                    {started && !completed && (
                      <span className="text-xs text-purple-400">{pct}% gespielt</span>
                    )}
                  </div>
                </div>
                <div className="text-purple-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
                  →
                </div>
              </Link>
            );
          })}
        </div>

        {/* Tip */}
        <div className="mt-8 bg-blue-950/40 border border-blue-800/50 rounded-2xl p-5">
          <div className="font-semibold text-blue-400 mb-2">Tipp für den Start</div>
          <p className="text-gray-300 text-sm">
            Fange mit <strong>Ode to Joy</strong> oder <strong>Happy Birthday</strong> an.
            Starte mit <strong>75% Tempo</strong> und steigere dich, wenn du sicherer wirst.
            Die Fingernummern (1=Daumen, 5=kleiner Finger) helfen dir beim Lernen der richtigen
            Handposition.
          </p>
        </div>
      </div>
    </main>
  );
}
