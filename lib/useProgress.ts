"use client";

import { useState, useEffect } from "react";
import { supabase, getSessionId } from "./supabase";

export type ProgressEntry = {
  song_id: string;
  mode: string;
  score: number;
  completed: boolean;
  tempo_used?: number;
};

export type PlaySession = {
  song_id: string;
  mode: string;
  score: number;
  total_notes: number;
  completed: boolean;
  tempo_used?: number;
  played_at: string;
};

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
  // Only update if score improved or newly completed
  const existing = all[key];
  if (!existing || entry.score > existing.score || (!existing.completed && entry.completed)) {
    all[key] = entry;
    localStorage.setItem("piano-progress", JSON.stringify(all));
  }
}

function getProgressLocal(songId: string, mode: string): ProgressEntry | null {
  const key = `${songId}__${mode}`;
  return getAllProgressLocal()[key] ?? null;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function saveProgress(
  songId: string,
  mode: string,
  score: number,
  completed: boolean,
  tempoUsed?: number,
  totalNotes?: number
) {
  const entry: ProgressEntry = { song_id: songId, mode, score, completed, tempo_used: tempoUsed };
  saveProgressLocal(entry);

  try {
    const sessionId = getSessionId();
    const userId = await getCurrentUserId();

    // Upsert best progress
    await supabase.from("progress").upsert(
      {
        session_id: sessionId,
        user_id: userId,
        song_id: songId,
        mode,
        score,
        completed,
        tempo_used: tempoUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,song_id,mode" }
    );

    // Insert play session (always a new record for stats)
    if (totalNotes !== undefined) {
      await supabase.from("play_sessions").insert({
        session_id: sessionId,
        user_id: userId,
        song_id: songId,
        mode,
        score,
        total_notes: totalNotes,
        completed,
        tempo_used: tempoUsed,
        played_at: new Date().toISOString(),
      });
    }
  } catch {
    // ignore, localStorage has the data
  }
}

// Hook: lädt Progress für einen Song
export function useProgress(songId: string, mode: string) {
  const [progress, setProgress] = useState<ProgressEntry | null>(null);

  useEffect(() => {
    const local = getProgressLocal(songId, mode);
    if (local) setProgress(local);

    const sync = async () => {
      try {
        const sessionId = getSessionId();
        const userId = await getCurrentUserId();

        let query = supabase
          .from("progress")
          .select("*")
          .eq("song_id", songId)
          .eq("mode", mode);

        if (userId) {
          query = query.eq("user_id", userId);
        } else {
          query = query.eq("session_id", sessionId);
        }

        const { data } = await query.single();
        if (data) {
          const entry: ProgressEntry = {
            song_id: data.song_id,
            mode: data.mode,
            score: data.score,
            completed: data.completed,
            tempo_used: data.tempo_used,
          };
          setProgress(entry);
          saveProgressLocal(entry);
        }
      } catch {
        // ignore
      }
    };
    sync();
  }, [songId, mode]);

  return progress;
}

// Hook: lädt Statistiken für einen Song (Anzahl Sessions + letzte)
export function useSongStats(songId: string) {
  const [stats, setStats] = useState<{ count: number; sessions: PlaySession[] }>({
    count: 0,
    sessions: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const sessionId = getSessionId();
        const { data } = await supabase
          .from("play_sessions")
          .select("*")
          .eq("session_id", sessionId)
          .eq("song_id", songId)
          .order("played_at", { ascending: false })
          .limit(10);

        if (data) {
          setStats({
            count: data.length,
            sessions: data.map((r) => ({
              song_id: r.song_id,
              mode: r.mode,
              score: r.score,
              total_notes: r.total_notes,
              completed: r.completed,
              tempo_used: r.tempo_used,
              played_at: r.played_at,
            })),
          });
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [songId]);

  return stats;
}

// Hook: lädt allen Progress (für Startseite)
export function useAllProgress() {
  const [allProgress, setAllProgress] = useState<Record<string, ProgressEntry>>({});

  useEffect(() => {
    setAllProgress(getAllProgressLocal());

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

// Hook: Gesamtstatistik für Homepage
export function useTotalStats() {
  const [stats, setStats] = useState({ totalSessions: 0, totalCorrectNotes: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const sessionId = getSessionId();
        const { data } = await supabase
          .from("play_sessions")
          .select("score")
          .eq("session_id", sessionId);
        if (data) {
          setStats({
            totalSessions: data.length,
            totalCorrectNotes: data.reduce((sum, r) => sum + (r.score || 0), 0),
          });
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  return stats;
}

// Play count per song (from localStorage for instant display)
export function getSongPlayCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("piano-play-counts") || "{}");
  } catch {
    return {};
  }
}

export function incrementPlayCount(songId: string) {
  const counts = getSongPlayCounts();
  counts[songId] = (counts[songId] || 0) + 1;
  localStorage.setItem("piano-play-counts", JSON.stringify(counts));
}
