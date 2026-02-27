import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get or create an anonymous session ID stored in localStorage
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("piano-session-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("piano-session-id", id);
  }
  return id;
}
