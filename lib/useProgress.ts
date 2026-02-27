"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, getSessionId } from "./supabase";

export type ProgressEntry = {
  song_id: string;
  mode: string;
  score: number;
  completed: boolean;
  tempo_used?: number;
};

// Alle Progress-Einträge aus localStorage laden
export function getAllProgressLocal(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("piano-progress") || "{}");
  } catch {
    return {};
  }
}

function saveProgressLocal(entry: ProgressEntry) {
  const key = `${entry.song_id}__${entry.mode}`;
  const all = getAllProgressLocal();
  all[key] = entry;
  localStorage.setItem("piano-progress", JSON.stringify(all));
}

function getProgressLocal(songId: string, mode: string): ProgressEntry | null {
  const key = `${songId}__${mode}`;
  return getAllProgressLocal()[key] ?? null;
}

// Speichert Fortschritt in localStorage + Supabase
export async function saveProgress(
  songId: string,
  mode: string,
  score: number,
  completed: boolean,
  tempoUsed?: number
) {
  const entry: ProgressEntry = { song_id: songId, mode, score, completed, tempo_used: tempoUsed };
  saveProgressLocal(entry);

  try {
    const sessionId = getSessionId();
    await supabase.from("progress").upsert(
      {
        session_id: sessionId,
        song_id: songId,
        mode,
        score,
        completed,
        tempo_used: tempoUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,song_id,mode" }
    );
  } catch {
    // Supabase fehler ignorieren, localStorage hat die Daten
  }
}

// Hook: lädt Progress für einen Song
export function useProgress(songId: string, mode: string) {
  const [progress, setProgress] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    // Sofort aus localStorage laden
    const local = getProgressLocal(songId, mode);
    if (local) setProgress(local);

    // Dann aus Supabase synchronisieren
    const sync = async () => {
      try {
        const sessionId = getSessionId();
        const { data } = await supabase
          .from("progress")
          .select("*")
          .eq("session_id", sessionId)
          .eq("song_id", songId)
          .eq("mode", mode)
          .single();
        if (data) {
          const entry: ProgressEntry = {
            song_id: data.song_id,
            mode: data.mode,
            score: data.score,
            completed: data.completed,
            tempo_used: data.tempo_used,
          };
          setProgress(entry);
          saveProgressLocal(entry); // lokale Kopie aktualisieren
        }
      } catch {
        // ignore
      }
    };
    sync();
  }, [songId, mode]);

  return progress;
}

// Hook: lädt allen Progress (für Startseite)
export function useAllProgress() {
  const [allProgress, setAllProgress] = useState<Record<string, ProgressEntry>>({});

  useEffect(() => {
    // Aus localStorage laden
    setAllProgress(getAllProgressLocal());

    // Aus Supabase sync
    const sync = async () => {
      try {
        const sessionId = getSessionId();
        const { data } = await supabase
          .from("progress")
          .select("*")
          .eq("session_id", sessionId);
        if (data && data.length > 0) {
          const map: Record<string, ProgressEntry> = {};
          data.forEach((row) => {
            const key = `${row.song_id}__${row.mode}`;
            map[key] = {
              song_id: row.song_id,
              mode: row.mode,
              score: row.score,
              completed: row.completed,
              tempo_used: row.tempo_used,
            };
          });
          setAllProgress(map);
          localStorage.setItem("piano-progress", JSON.stringify(map));
        }
      } catch {
        // ignore
      }
    };
    sync();
  }, []);

  return allProgress;
}
