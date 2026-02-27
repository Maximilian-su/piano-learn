"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (tab === "login") {
      const err = await signIn(email, password);
      if (err) {
        setError("E-Mail oder Passwort falsch.");
      } else {
        router.push("/");
      }
    } else {
      const err = await signUp(email, password);
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Konto erstellt! Du kannst dich jetzt anmelden.");
        setTab("login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎹</div>
          <h1 className="text-2xl font-bold">Piano Learn</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Melde dich an um deinen Fortschritt zu speichern
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          {/* Tab Switch */}
          <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "login"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "signup"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mindestens 6 Zeichen"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-950/50 border border-green-800 rounded-xl px-4 py-3 text-green-400 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-400 text-white rounded-xl font-semibold transition-all"
            >
              {loading
                ? "Lädt..."
                : tab === "login"
                ? "Anmelden"
                : "Konto erstellen"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Ohne Konto weiter spielen →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Kein Konto? Kein Problem — dein Fortschritt wird auch ohne Anmeldung
          in diesem Browser gespeichert.
        </p>
      </div>
    </div>
  );
}
