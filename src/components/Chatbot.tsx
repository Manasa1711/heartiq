import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRateLimit } from "@/hooks/useRateLimit";

type Msg = { role: "user" | "assistant"; content: string };

const suggestions = ["Explain my last result", "Is sinus tachycardia dangerous?", "What should I eat for heart health?"];

export const Chatbot = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const rl = useRateLimit(`chatbot:${user?.id ?? "anon"}`, 20, "hour");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your HeartIQ AI assistant. Ask me anything about your heart, ECG results, or medications." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; remaining: number; resetAt: number | null }>(rl.peek());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { if (open) setLimitInfo(rl.peek()); }, [open, messages.length, rl]);

  // Hide on landing/auth and on chat/call pages where it overlaps the input + send button
  const hide =
    !user ||
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/doctor/chat") ||
    pathname.startsWith("/call") ||
    pathname.startsWith("/doctor"); // keep clinician portal clean
  if (hide) return null;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const gate = rl.check();
    setLimitInfo(rl.peek());
    if (!gate.allowed) {
      setMessages((prev) => [...prev, { role: "assistant", content: `You've hit the limit of 20 messages per hour. Try again in ${rl.formatReset(gate.resetAt)}.` }]);
      return;
    }
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setBusy(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grok-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, context: { page: pathname } }),
      });
      if (!resp.ok) {
        let msg = `Request failed (${resp.status})`;
        try { const j = await resp.json(); if (j?.error) msg = j.error; } catch {}
        if (resp.status === 429) msg = "Too many requests. Please wait a moment.";
        if (resp.status === 402) msg = "AI credits exhausted.";
        throw new Error(msg);
      }
      if (!resp.body) throw new Error("No response stream");

      // append assistant placeholder
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) setMessages(prev => {
              const last = prev[prev.length - 1];
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: (last.content ?? "") + c } : m);
            });
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: e.message ?? "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* FAB — lifted above mobile bottom nav */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50 h-14 w-14 rounded-full bg-gradient-coral shadow-coral grid place-items-center hover:scale-110 transition">
        {open ? <X className="h-5 w-5 text-white" /> : <>
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="absolute inset-0 rounded-full border border-primary animate-pulse-ring" />
        </>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-44 lg:bottom-24 right-4 lg:right-8 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[600px] max-h-[70vh] glass-strong rounded-3xl flex flex-col overflow-hidden shadow-panel">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-teal grid place-items-center">
                <Sparkles className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div>
                <div className="font-display text-sm">HeartIQ AI</div>
                <div className="text-xs text-muted-foreground">Powered by Grok</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user" ? "bg-primary/15 border border-primary/20 rounded-br-sm" : "bg-white/5 border border-white/5 rounded-bl-sm"
                  }`}>
                    {m.content || (busy && i === messages.length - 1 ? <Typing /> : null)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-secondary/40 text-muted-foreground hover:text-foreground transition">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-white/5">
              {limitInfo.remaining <= 5 && (
                <div className="mb-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {limitInfo.remaining} of 20 messages left this hour
                  {limitInfo.resetAt && limitInfo.remaining === 0 && <span>· resets in {rl.formatReset(limitInfo.resetAt)}</span>}
                </div>
              )}
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder={limitInfo.remaining === 0 ? "Hourly limit reached" : "Ask anything…"}
                  disabled={limitInfo.remaining === 0}
                  className="flex-1 bg-input/40 rounded-full px-4 py-2.5 text-sm border border-white/10 focus:outline-none focus:border-primary/40 disabled:opacity-50" />
                <button type="submit" disabled={busy || limitInfo.remaining === 0} className="h-10 w-10 rounded-full bg-gradient-coral grid place-items-center disabled:opacity-50">
                  <Send className="h-4 w-4 text-white" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Typing = () => (
  <div className="flex gap-1">
    {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />)}
  </div>
);
