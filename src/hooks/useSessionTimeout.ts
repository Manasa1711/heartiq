import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

const WARN_MS = 25 * 60 * 1000;
const TIMEOUT_MS = 30 * 60 * 1000;
const THROTTLE_MS = 30 * 1000;

export const useSessionTimeout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastActivity = useRef<number>(Date.now());
  const lastUpdate = useRef<number>(Date.now());
  const warned = useRef<boolean>(false);

  useEffect(() => {
    if (!user) return;

    const bump = () => {
      const now = Date.now();
      if (now - lastUpdate.current < THROTTLE_MS) return;
      lastUpdate.current = now;
      lastActivity.current = now;
      warned.current = false;
    };

    const events = ["mousemove", "keydown", "click", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const timer = window.setInterval(async () => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= TIMEOUT_MS) {
        try {
          await logAudit(user.id, "session_timeout");
        } catch {}
        await supabase.auth.signOut();
        navigate("/auth?reason=timeout");
      } else if (idle >= WARN_MS && !warned.current) {
        warned.current = true;
        const remaining = Math.max(1, Math.round((TIMEOUT_MS - idle) / 60000));
        toast.warning("You'll be signed out soon", {
          description: `Inactive for 25 minutes — auto sign-out in ${remaining} min.`,
          duration: 10_000,
        });
      }
    }, 30_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, [user, navigate]);
};
