import { useCallback } from "react";
import { checkLimit, peekLimit, formatReset } from "@/lib/rateLimit";

export const useRateLimit = (key: string, max: number, window: "hour" | "day") => {
  const check = useCallback(() => checkLimit(key, max, window), [key, max, window]);
  const peek = useCallback(() => peekLimit(key, max, window), [key, max, window]);
  return { check, peek, formatReset, max };
};
