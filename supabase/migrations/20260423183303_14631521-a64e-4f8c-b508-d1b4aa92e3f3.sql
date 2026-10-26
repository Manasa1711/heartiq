
-- =========================================================
-- 1. MESSAGING REBUILD (drops existing data)
-- =========================================================
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  patient_unread int NOT NULL DEFAULT 0,
  doctor_unread int NOT NULL DEFAULT 0,
  UNIQUE(patient_id, doctor_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select_participant" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "conv_insert_participant" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "conv_update_participant" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file','ecg_report','system')),
  file_url text,
  file_name text,
  file_size int,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_select_participant" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  ));

CREATE POLICY "msg_insert_sender" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );

CREATE POLICY "msg_update_participant" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  ));

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  preview text;
BEGIN
  preview := CASE
    WHEN NEW.type IN ('image','file','ecg_report') THEN COALESCE('📎 ' || NEW.file_name, '📎 Attachment')
    WHEN NEW.type = 'system' THEN NEW.content
    ELSE LEFT(COALESCE(NEW.content, ''), 200)
  END;

  UPDATE public.conversations
  SET last_message = preview,
      last_message_at = NEW.created_at,
      updated_at = now(),
      patient_unread = CASE WHEN NEW.sender_id <> patient_id THEN patient_unread + 1 ELSE patient_unread END,
      doctor_unread  = CASE WHEN NEW.sender_id <> doctor_id  THEN doctor_unread  + 1 ELSE doctor_unread  END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_attach_public_read' AND tablename='objects' AND schemaname='storage') THEN
    EXECUTE 'CREATE POLICY "chat_attach_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = ''chat-attachments'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_attach_auth_upload' AND tablename='objects' AND schemaname='storage') THEN
    EXECUTE 'CREATE POLICY "chat_attach_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''chat-attachments'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_attach_auth_update' AND tablename='objects' AND schemaname='storage') THEN
    EXECUTE 'CREATE POLICY "chat_attach_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''chat-attachments'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_attach_auth_delete' AND tablename='objects' AND schemaname='storage') THEN
    EXECUTE 'CREATE POLICY "chat_attach_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''chat-attachments'')';
  END IF;
END $$;

-- =========================================================
-- 2. SMARTWATCH / VITALS
-- =========================================================
CREATE TABLE public.vitals_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  heart_rate int,
  spo2 int,
  steps int,
  hrv int,
  source text NOT NULL CHECK (source IN ('bluetooth','manual','google_fit','apple_health','simulation')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  is_anomaly boolean NOT NULL DEFAULT false,
  anomaly_type text
);

CREATE INDEX idx_vitals_user_time ON public.vitals_readings(user_id, recorded_at DESC);

ALTER TABLE public.vitals_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vitals_select_own" ON public.vitals_readings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vitals_insert_own" ON public.vitals_readings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vitals_update_own" ON public.vitals_readings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vitals_delete_own" ON public.vitals_readings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_heart_rate int NOT NULL DEFAULT 120,
  min_heart_rate int NOT NULL DEFAULT 50,
  min_spo2 int NOT NULL DEFAULT 94,
  emergency_contact_name text,
  emergency_contact_phone text,
  alerts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select_own" ON public.alert_thresholds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert_own" ON public.alert_thresholds
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alert_thresholds
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 3. ONBOARDING ADDITIONS TO PROFILES
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height_cm int,
  ADD COLUMN IF NOT EXISTS weight_kg int,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- =========================================================
-- 4. AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user_time ON public.audit_log(user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_own" ON public.audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "audit_select_doctor_for_patient" ON public.audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.doctor_id = auth.uid() AND c.patient_id = audit_log.user_id
  ));

CREATE POLICY "audit_insert_own" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Realtime (skip notifications, already added)
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals_readings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
