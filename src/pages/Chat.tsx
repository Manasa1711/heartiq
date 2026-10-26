import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import {
  Send, Paperclip, X, FileText, Download, Phone, Check, CheckCheck,
  MessageSquare, Search, Plus, ArrowLeft, Image as ImageIcon, Activity,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConversations, getOrCreateConversation, type Conversation } from "@/hooks/useConversations";
import { useChat, type Message } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formatTimestamp = (d: string) => {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60000)}m ago`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (diff < 7 * 86_400_000) return format(date, "EEE");
  return format(date, "MMM d");
};

const dayHeader = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

const ChatPage = () => {
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const activeId = params.get("c");
  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && conversations.length > 0 && window.innerWidth >= 768) {
      setParams({ c: conversations[0].id }, { replace: true });
    }
  }, [conversations, activeId, setParams]);

  const filtered = conversations.filter((c) =>
    !search || c.other_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-[#050d1a]" style={{ height: "calc(100dvh - 57px)", minHeight: 480 }}>
      <aside className={`${active ? "hidden md:flex" : "flex"} flex-col w-full md:w-[320px] border-r border-white/10 bg-white/[0.02] min-h-0`}>
        <div className="h-[65px] px-5 flex items-center justify-between border-b border-white/10">
          <h2 className="font-display text-xl text-white">Messages</h2>
          <button
            onClick={() => setShowNew(true)}
            className="h-9 w-9 rounded-xl bg-[#ff2d55] hover:bg-[#ff2d55]/90 grid place-items-center transition"
            aria-label="New chat"
          >
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-9 pl-9 bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          {loading && <div className="px-3 text-xs text-white/40">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center px-6 py-12">
              <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/60">{search ? "No matches" : "No conversations yet"}</p>
              {!search && (
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-4 px-3 py-1.5 rounded-xl text-xs bg-[#ff2d55] text-white hover:bg-[#ff2d55]/90"
                >
                  Start a chat
                </button>
              )}
            </div>
          )}
          {filtered.map((c) => (
            <ConvRow key={c.id} c={c} active={c.id === activeId} onClick={() => setParams({ c: c.id })} />
          ))}
        </div>
      </aside>

      {active ? (
        <Thread conversation={active} onBack={() => setParams({})} />
      ) : (
        <div className="hidden md:grid place-items-center flex-1 text-center text-white/40">
          <div>
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40 text-[#ff2d55]" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNew && profile && (
          <NewChatModal role={profile.role} onClose={() => setShowNew(false)} onPicked={(cid) => {
            setShowNew(false);
            setParams({ c: cid });
          }} />
        )}
      </AnimatePresence>
    </div>
  );
};

const ConvRow = ({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex gap-3 px-3 py-3 rounded-xl transition mb-1 ${
      active ? "bg-white/10" : "hover:bg-white/5"
    }`}
  >
    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff2d55] to-[#ff2d55]/60 grid place-items-center font-mono text-sm font-semibold text-white shrink-0">
      {(c.other_name ?? "?").trim().split(" ").pop()?.[0] ?? "?"}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-white truncate">{c.other_name}</div>
        <div className="text-[10px] text-white/40 font-mono shrink-0">
          {formatTimestamp(c.last_message_at)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-white/60 truncate">{c.last_message || "No messages yet"}</div>
        {c.unread > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff2d55] text-white text-[10px] font-mono grid place-items-center font-bold shrink-0">
            {c.unread > 9 ? "9+" : c.unread}
          </span>
        )}
      </div>
    </div>
  </button>
);

export const Thread = ({
  conversation,
  onBack,
  embedded = false,
}: {
  conversation: Conversation;
  onBack?: () => void;
  embedded?: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, sending, typingUsers, otherOnline, sendMessage, markAsRead, sendTypingSignal } = useChat(conversation.id);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBadge, setNewBadge] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void markAsRead();
  }, [conversation.id, markAsRead, messages.length]);

  useEffect(() => {
    if (atBottom) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewBadge(false);
    } else if (messages.length > 0) {
      setNewBadge(true);
    }
  }, [messages.length, typingUsers.length, atBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(isBottom);
    if (isBottom) setNewBadge(false);
  };

  const onSend = async () => {
    if (!user) return;
    if (file) {
      setUploading(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext ?? "");
        const path = `${conversation.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        await sendMessage(text || file.name, {
          type: isImage ? "image" : "file",
          fileUrl: data.publicUrl,
          fileName: file.name,
          fileSize: file.size,
        });
        setFile(null);
        setText("");
      } catch (e: any) {
        toast.error(e.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
      return;
    }
    if (!text.trim()) return;
    try {
      await sendMessage(text);
      setText("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send");
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    } else {
      void sendTypingSignal();
    }
  };

  const startCall = async () => {
    if (!user) return;
    const otherId = conversation.other_user_id;
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
        conversation_id: conversation.id,
        initiator_id: user.id,
        receiver_id: otherId,
        status: "ringing",
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Could not start call");
      return;
    }
    await supabase.from("notifications").insert({
      user_id: otherId,
      type: "incoming_call",
      title: "Incoming video call",
      body: "Tap to answer",
      related_id: (data as any).id,
    });
    navigate(`/call/${(data as any).id}`);
  };

  // Group by day
  const groups: Array<{ day: string; items: Message[] }> = [];
  messages.forEach((m) => {
    const key = dayHeader(m.created_at);
    if (groups[groups.length - 1]?.day === key) groups[groups.length - 1].items.push(m);
    else groups.push({ day: key, items: [m] });
  });

  return (
    <section className="flex-1 flex flex-col min-w-0 bg-[#050d1a]">
      <header className="h-[65px] flex items-center justify-between gap-3 px-5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="md:hidden text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#ff2d55] to-[#ff2d55]/60 grid place-items-center font-mono text-xs font-semibold text-white">
              {(conversation.other_name ?? "?").trim().split(" ").pop()?.[0] ?? "?"}
            </div>
            {otherOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#050d1a]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{conversation.other_name}</div>
            <div className="text-[10px] text-white/40 font-mono">
              {typingUsers.length > 0 ? <span className="text-[#00e5cc]">typing…</span> : conversation.other_specialty ?? conversation.other_role}
            </div>
          </div>
        </div>
        {!embedded && (
          <div className="flex items-center gap-1">
            {conversation.other_role === "patient" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const { data } = await supabase
                    .from("ecg_uploads")
                    .select("id")
                    .eq("user_id", conversation.other_user_id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if ((data as any)?.id) {
                    navigate(`/doctor/patients/${conversation.other_user_id}`);
                  } else {
                    toast.message("No ECG records yet for this patient");
                  }
                }}
                className="text-[#ff2d55] hover:text-[#ff2d55]/80"
              >
                <Activity className="h-4 w-4" /> ECG
              </Button>
            )}
            {conversation.other_role === "doctor" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/results/latest")}
                className="text-[#ff2d55] hover:text-[#ff2d55]/80"
              >
                <Activity className="h-4 w-4" /> My ECG
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={startCall} className="text-[#00e5cc] hover:text-[#00e5cc]/80">
              <Phone className="h-4 w-4" /> Call
            </Button>
          </div>
        )}
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto scrollbar-thin px-5 py-6 space-y-6">
        {groups.map((g) => (
          <div key={g.day} className="space-y-3">
            <div className="flex justify-center">
              <span className="text-[10px] font-mono uppercase text-white/40 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                {g.day}
              </span>
            </div>
            {g.items.map((m) => {
              const me = m.sender_id === user?.id;
              if (m.type === "system") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="text-[11px] italic text-white/50 px-3 py-1 rounded-full bg-white/5">{m.content}</span>
                  </div>
                );
              }
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: m._optimistic ? 0.6 : 1, y: 0 }}
                  className={`flex ${me ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[75%] ${me ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {m.type === "image" && m.file_url ? (
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                        <img src={m.file_url} alt={m.file_name ?? "image"} className="max-w-[220px] rounded-2xl border border-white/10" />
                      </a>
                    ) : m.type === "file" || m.type === "ecg_report" ? (
                      <a
                        href={m.file_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm border ${
                          me ? "bg-[#ff2d55]/15 border-[#ff2d55]/30 rounded-br-sm" : "bg-white/10 border-white/10 rounded-bl-sm"
                        }`}
                      >
                        {m.type === "ecg_report" ? (
                          <Activity className="h-4 w-4 text-[#ff2d55] shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-[#00e5cc] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate max-w-[180px]">{m.file_name ?? "File"}</div>
                          <div className="text-[10px] text-white/60 flex items-center gap-1 mt-0.5">
                            <Download className="h-2.5 w-2.5" />
                            {m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : "Download"}
                          </div>
                        </div>
                      </a>
                    ) : (
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm ${
                          me
                            ? "bg-[#ff2d55]/90 text-white rounded-br-sm"
                            : "bg-white/10 border border-white/10 text-white rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                    )}
                    <div className="text-[10px] text-white/40 font-mono flex items-center gap-1 px-1">
                      {format(new Date(m.created_at), "HH:mm")}
                      {me && (m.is_read ? <CheckCheck className="h-3 w-3 text-[#00e5cc]" /> : <Check className="h-3 w-3" />)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/10 flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e5cc] animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e5cc] animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e5cc] animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />

        {newBadge && !atBottom && (
          <button
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#ff2d55] text-white text-xs shadow-lg"
          >
            New message ↓
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        {file && (
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white">
            <FileText className="h-3 w-3 text-[#00e5cc]" />
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-white/60 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,.pdf,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 grid place-items-center hover:border-white/20 transition shrink-0 text-white"
            aria-label="Attach"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Type a message…"
            className="flex-1 resize-none bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00e5cc] max-h-[120px]"
          />
          <button
            onClick={onSend}
            disabled={uploading || sending || (!text.trim() && !file)}
            className="h-10 w-10 rounded-xl bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white grid place-items-center transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0 active:scale-95"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

const NewChatModal = ({
  role,
  onClose,
  onPicked,
}: {
  role: "patient" | "doctor";
  onClose: () => void;
  onPicked: (conversationId: string) => void;
}) => {
  const { user } = useAuth();
  const [people, setPeople] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (role === "patient") {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, specialty, avatar_url")
          .eq("role", "doctor")
          .eq("is_verified", true);
        setPeople(data ?? []);
      } else {
        const { data: ecgs } = await supabase
          .from("ecg_uploads")
          .select("user_id, created_at")
          .order("created_at", { ascending: false });
        const ids = Array.from(new Set((ecgs ?? []).map((e: any) => e.user_id)));
        if (ids.length === 0) {
          setPeople([]);
          setLoading(false);
          return;
        }
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        setPeople(profs ?? []);
      }
      setLoading(false);
    })();
  }, [user, role]);

  const filtered = people.filter(
    (p) => !q || (p.display_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const pick = async (otherId: string) => {
    if (!user) return;
    const patientId = role === "patient" ? user.id : otherId;
    const doctorId = role === "doctor" ? user.id : otherId;
    const cid = await getOrCreateConversation(patientId, doctorId);
    if (cid) onPicked(cid);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#050d1a] border border-white/10 rounded-2xl p-5 w-full max-w-md backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-white">
            {role === "patient" ? "Choose a doctor" : "Choose a patient"}
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mb-4 bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl"
        />
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin space-y-1">
          {loading && <div className="text-xs text-white/40 px-2">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-xs text-white/40 px-2 py-6 text-center">No one found</div>}
          {filtered.map((p) => (
            <button
              key={p.user_id}
              onClick={() => pick(p.user_id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-left transition"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff2d55] to-[#ff2d55]/60 grid place-items-center text-white text-sm font-mono">
                {(p.display_name ?? "?").trim().split(" ").pop()?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{p.display_name ?? "Unknown"}</div>
                {p.specialty && <div className="text-[10px] text-[#00e5cc] font-mono truncate">{p.specialty}</div>}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChatPage;
