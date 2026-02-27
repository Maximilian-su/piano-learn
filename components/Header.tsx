"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="text-xl">🎹</span>
        <span className="font-bold text-white">Piano Learn</span>
      </Link>

      <div className="relative">
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
        ) : user ? (
          <div>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="hidden sm:block max-w-[140px] truncate">{user.email}</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-44 z-50">
                <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700 truncate">
                  {user.email}
                </div>
                <button
                  onClick={() => { signOut(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-b-xl transition-colors"
                >
                  Abmelden
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Anmelden
          </Link>
        )}
      </div>
    </header>
  );
}
