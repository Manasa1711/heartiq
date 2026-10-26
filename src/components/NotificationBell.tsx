import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageCircle, PhoneIncoming, FileCheck2, Calendar, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";

const iconFor = (type: string) => {
  switch (type) {
    case "new_message": return MessageCircle;
    case "incoming_call": return PhoneIncoming;
    case "ecg_reviewed": return FileCheck2;
    case "appointment_confirmed":
    case "appointment_reminder": return Calendar;
    default: return Bell;
  }
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const NotificationBell = () => {
  const { items, unreadCount, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const chatBase = profile?.role === "doctor" ? "/doctor/chat" : "/chat";

  const onClickItem = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    if (n.type === "new_message" && n.related_id) navigate(`${chatBase}?c=${n.related_id}`);
    else if (n.type === "incoming_call" && n.related_id) navigate(`/call/${n.related_id}`);
    else if (n.type === "ecg_reviewed" && n.related_id) navigate(`/results/${n.related_id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center hover:border-white/20 transition active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono grid place-items-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-[360px] max-h-[480px] glass-strong rounded-2xl overflow-hidden z-50 shadow-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h4 className="font-display text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-secondary hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto scrollbar-thin max-h-[420px]">
              {items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                items.map((n) => {
                  const Icon = iconFor(n.type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => onClickItem(n)}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition flex gap-3 ${
                        !n.is_read ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center">
                        <Icon className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground/60 font-mono mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
