import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Conversation = {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_at: string;
  patient_unread: number;
  doctor_unread: number;
  // joined / derived
  other_user_id: string;
  other_name: string;
  other_role: "patient" | "doctor";
  other_specialty: string | null;
  other_avatar: string | null;
  unread: number;
};

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const channelInstanceId = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    const list = convs ?? [];
    if (list.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const otherIds = list.map((c: any) =>
      c.patient_id === user.id ? c.doctor_id : c.patient_id
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, role, specialty, avatar_url")
      .in("user_id", otherIds);

    const enriched: Conversation[] = list.map((c: any) => {
      const otherId = c.patient_id === user.id ? c.doctor_id : c.patient_id;
      const p = (profiles ?? []).find((x: any) => x.user_id === otherId);
      const isPatient = c.patient_id === user.id;
      return {
        ...c,
        other_user_id: otherId,
        other_name: (p as any)?.display_name ?? "Unknown",
        other_role: ((p as any)?.role ?? "patient") as "patient" | "doctor",
        other_specialty: (p as any)?.specialty ?? null,
        other_avatar: (p as any)?.avatar_url ?? null,
        unread: isPatient ? c.patient_unread : c.doctor_unread,
      };
    });
    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const channel = supabase
      .channel(`conv-list-${user.id}-${channelInstanceId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0);

  return { conversations, loading, refresh, totalUnread };
};

export const getOrCreateConversation = async (
  patientId: string,
  doctorId: string
): Promise<string | null> => {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId)
    .maybeSingle();
  if (existing) return (existing as any).id;
  const { data, error } = await supabase
    .from("conversations")
    .insert({ patient_id: patientId, doctor_id: doctorId })
    .select("id")
    .single();
  if (error) {
    console.error(error);
    return null;
  }
  return (data as any).id;
};
