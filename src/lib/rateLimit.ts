import { supabase } from "@/integrations/supabase/client";

const KEY_PREFIX = "heartiq_rl::";

type Window = "hour" | "day";
const WIN_MS: Record<Window, number> = { hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000 };

const read = (key: string): number[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY_PREFIX + key) ?? "[]");
  } catch {
    return [];
  }
};

const write = (key: string, arr: number[]) => {
  localStorage.setItem(KEY_PREFIX + key, JSON.stringify(arr));
};

/**
 * Returns { allowed, remaining, resetAt } and records a hit if allowed.
 * Storage is per-browser only — soft client guard, easily bypassed.
 */
export const checkLimit = (key: string, max: number, window: Window) => {
  const now = Date.now();
  const winMs = WIN_MS[window];
  const arr = read(key).filter((t) => now - t < winMs);
  if (arr.length >= max) {
    const resetAt = arr[0] + winMs;
    return { allowed: false, remaining: 0, resetAt };
  }
  arr.push(now);
  write(key, arr);
  return { allowed: true, remaining: max - arr.length, resetAt: now + winMs };
};

export const peekLimit = (key: string, max: number, window: Window) => {
  const now = Date.now();
  const winMs = WIN_MS[window];
  const arr = read(key).filter((t) => now - t < winMs);
  return { used: arr.length, remaining: Math.max(0, max - arr.length), resetAt: arr[0] ? arr[0] + winMs : null };
};

export const ecgUploadsTodayCount = async (userId: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ecg_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return count ?? 0;
};

export const formatReset = (ms: number | null) => {
  if (!ms) return "soon";
  const diff = ms - Date.now();
  const m = Math.max(1, Math.round(diff / 60000));
  if (m >= 60) return `${Math.round(m / 60)}h`;
  return `${m}m`;
};
