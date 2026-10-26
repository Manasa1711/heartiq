import { supabase } from "@/integrations/supabase/client";

export const logAudit = async (
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from("audit_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.warn("audit failed", e);
  }
};
