import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Notification = {
  id: string;
  user_id: string;
  type: "new_message" | "incoming_call" | "ecg_reviewed" | "appointment_confirmed" | "appointment_reminder" | string;
  title: string;
  body: string | null;
  is_read: boolean;
  related_id: string | null;
  created_at: string;
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notification[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAll]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const unreadCount = items.filter((n) => !n.is_read).length;
  return { items, unreadCount, markAllRead, markRead, refresh: fetchAll };
};
