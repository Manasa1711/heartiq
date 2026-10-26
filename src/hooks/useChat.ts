import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "file" | "ecg_report" | "system";
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  is_read: boolean;
  created_at: string;
  _optimistic?: boolean;
};

type SendOpts = {
  type?: Message["type"];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
};

export const useChat = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherOnline, setOtherOnline] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimers = useRef<Record<string, number>>({});

  // Fetch + subscribe
  useEffect(() => {
    if (!conversationId || !user) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      setMessages((data as any as Message[]) ?? []);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any as Message;
          setMessages((prev) => {
            // Replace optimistic placeholder if same sender/content/type within 5s
            const idx = prev.findIndex(
              (x) =>
                x._optimistic &&
                x.sender_id === m.sender_id &&
                x.content === m.content &&
                x.type === m.type
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = m;
              return next;
            }
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        }
      )
      .subscribe();
    channelRef.current = ch;

    // Presence channel for typing + online
    const presence = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState() as Record<string, Array<{ name?: string; typing?: boolean }>>;
        const others: string[] = [];
        let online = false;
        Object.entries(state).forEach(([uid, metas]) => {
          if (uid === user.id) return;
          online = true;
          if (metas.some((m) => m.typing)) others.push(metas[0]?.name ?? "Typing");
        });
        setTypingUsers(others);
        setOtherOnline(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ name: user.email, typing: false, at: Date.now() });
        }
      });
    presenceRef.current = presence;

    return () => {
      alive = false;
      supabase.removeChannel(ch);
      supabase.removeChannel(presence);
      channelRef.current = null;
      presenceRef.current = null;
      Object.values(typingTimers.current).forEach((t) => window.clearTimeout(t));
      typingTimers.current = {};
    };
  }, [conversationId, user]);

  const sendMessage = useCallback(
    async (content: string, opts: SendOpts = {}) => {
      if (!conversationId || !user) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type: opts.type ?? "text",
        file_url: opts.fileUrl ?? null,
        file_name: opts.fileName ?? null,
        file_size: opts.fileSize ?? null,
        is_read: false,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          type: opts.type ?? "text",
          file_url: opts.fileUrl ?? null,
          file_name: opts.fileName ?? null,
          file_size: opts.fileSize ?? null,
        })
        .select("*")
        .single();
      setSending(false);
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw error;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as any as Message) : m))
      );
    },
    [conversationId, user]
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    // Reset unread counter on conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("patient_id, doctor_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv) {
      const isPatient = (conv as any).patient_id === user.id;
      await supabase
        .from("conversations")
        .update(isPatient ? { patient_unread: 0 } : { doctor_unread: 0 })
        .eq("id", conversationId);
    }
  }, [conversationId, user]);

  const sendTypingSignal = useCallback(async () => {
    if (!presenceRef.current || !user) return;
    await presenceRef.current.track({ name: user.email, typing: true, at: Date.now() });
    if (typingTimers.current[user.id]) window.clearTimeout(typingTimers.current[user.id]);
    typingTimers.current[user.id] = window.setTimeout(async () => {
      await presenceRef.current?.track({ name: user.email, typing: false, at: Date.now() });
    }, 3000);
  }, [user]);

  return { messages, loading, sending, typingUsers, otherOnline, sendMessage, markAsRead, sendTypingSignal };
};
