import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type IncomingCall = {
  id: string;
  initiator_id: string;
  callerName: string;
};

export const IncomingCallOverlay = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`incoming-call:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_sessions", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const row: any = payload.new;
          if (row.status !== "ringing") return;
          const { data: caller } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", row.initiator_id)
            .maybeSingle();
          setIncoming({ id: row.id, initiator_id: row.initiator_id, callerName: (caller as any)?.display_name ?? "Caller" });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const accept = async () => {
    if (!incoming) return;
    await supabase.from("call_sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", incoming.id);
    const id = incoming.id;
    setIncoming(null);
    navigate(`/call/${id}`);
  };

  const decline = async () => {
    if (!incoming) return;
    await supabase.from("call_sessions").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", incoming.id);
    setIncoming(null);
  };

  return (
    <AnimatePresence>
      {incoming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background/85 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-strong rounded-3xl p-10 max-w-sm w-full mx-4 text-center"
          >
            <div className="relative mx-auto h-32 w-32 mb-6">
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" style={{ animationDelay: "0.7s" }} />
              <div className="relative h-32 w-32 rounded-full bg-gradient-coral grid place-items-center font-display text-4xl text-white">
                {incoming.callerName.split(" ").slice(-1)[0]?.[0] ?? "?"}
              </div>
            </div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Incoming video call…</p>
            <h3 className="font-display text-2xl mb-8">{incoming.callerName}</h3>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={decline}
                className="h-16 w-16 rounded-full bg-destructive grid place-items-center hover:scale-105 transition active:scale-95"
                aria-label="Decline"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={accept}
                className="h-16 w-16 rounded-full bg-secondary grid place-items-center hover:scale-105 transition active:scale-95"
                aria-label="Accept"
              >
                <Phone className="h-6 w-6 text-secondary-foreground" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
