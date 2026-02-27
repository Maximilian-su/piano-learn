import Link from "next/link";
import { SONGS } from "@/data/songs";

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
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-blue-900/20" />
        <div className="relative px-6 py-16 text-center max-w-3xl mx-auto">
          <div className="text-6xl mb-4">🎹</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Piano Learn
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-xl mx-auto">
            Lerne Klavier spielen — einfach, spielerisch und sofort mit echten Liedern.
            Kein Notenlernen, kein langer Weg. Einfach spielen.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Mikrofon-Erkennung
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> MIDI Support
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Schritt für Schritt
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: "🎵",
              title: "Song wählen",
              desc: "Wähle ein Lied das du spielen möchtest",
            },
            {
              icon: "👁️",
              title: "Noten fallen",
              desc: "Fallende Noten zeigen dir welche Taste du drücken musst",
            },
            {
              icon: "🎹",
              title: "Einfach spielen",
              desc: "Drückst du die falsche Taste, wartet das Lied auf dich",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center"
            >
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="font-bold mb-1">{step.title}</div>
              <div className="text-sm text-gray-400">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Song catalog */}
        <h2 className="text-2xl font-bold mb-6">Lieder wählen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SONGS.map((song) => (
            <Link
              key={song.id}
              href={`/practice/${song.id}`}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-5 flex items-start gap-4 transition-all group"
            >
              <div className="text-4xl">{song.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg group-hover:text-purple-300 transition-colors">
                    {song.title}
                  </h3>
                </div>
                <div className="text-gray-400 text-sm mb-2">{song.artist}</div>
                <p className="text-gray-500 text-sm line-clamp-2">{song.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      difficultyColor[song.difficulty]
                    }`}
                  >
                    {difficultyLabel[song.difficulty]}
                  </span>
                  <span className="text-xs text-gray-500">{song.tempo} BPM</span>
                </div>
              </div>
              <div className="text-purple-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </Link>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-8 bg-blue-950/40 border border-blue-800/50 rounded-2xl p-5">
          <div className="font-semibold text-blue-400 mb-2">Tipp für den Start</div>
          <p className="text-gray-300 text-sm">
            Fange mit <strong>Ode to Joy</strong> oder <strong>Happy Birthday</strong> an
            — beide sind sehr einfach und du kannst sie sofort spielen. Stelle sicher,
            dass dein Mikrofon aktiviert ist und du die Erlaubnis gibst, wenn der Browser
            danach fragt.
          </p>
        </div>
      </div>
    </main>
  );
}
