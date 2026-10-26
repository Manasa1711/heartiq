
-- =======================================================================
-- 1. PROFILES
-- =======================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','doctor')),
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consultation_fee numeric,
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS years_experience int;

DROP POLICY IF EXISTS "verified_doctors_public" ON public.profiles;
CREATE POLICY "verified_doctors_public" ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'doctor' AND is_verified = true);

-- =======================================================================
-- 2. ECG UPLOADS
-- =======================================================================
ALTER TABLE public.ecg_uploads
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS doctor_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doctor_notes text,
  ADD COLUMN IF NOT EXISTS doctor_diagnosis_override text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS "doctors_read_all_ecg" ON public.ecg_uploads;
CREATE POLICY "doctors_read_all_ecg" ON public.ecg_uploads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'doctor'));

DROP POLICY IF EXISTS "doctors_update_ecg" ON public.ecg_uploads;
CREATE POLICY "doctors_update_ecg" ON public.ecg_uploads
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'doctor'));

-- =======================================================================
-- 3. CONVERSATIONS
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_select_participant" ON public.conversations;
CREATE POLICY "conv_select_participant" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
DROP POLICY IF EXISTS "conv_insert_participant" ON public.conversations;
CREATE POLICY "conv_insert_participant" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);
DROP POLICY IF EXISTS "conv_update_participant" ON public.conversations;
CREATE POLICY "conv_update_participant" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- =======================================================================
-- 4. MESSAGES
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','file','ecg_report')),
  file_url text,
  file_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_select_participant" ON public.messages;
CREATE POLICY "msg_select_participant" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.patient_id OR auth.uid() = c.doctor_id))
);
DROP POLICY IF EXISTS "msg_insert_participant" ON public.messages;
CREATE POLICY "msg_insert_participant" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.patient_id OR auth.uid() = c.doctor_id))
);
DROP POLICY IF EXISTS "msg_update_participant" ON public.messages;
CREATE POLICY "msg_update_participant" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.patient_id OR auth.uid() = c.doctor_id))
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.bump_conversation_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bump_conv ON public.messages;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_timestamp();

-- =======================================================================
-- 5. CALL SESSIONS
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  initiator_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','missed','declined')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "call_select_participant" ON public.call_sessions;
CREATE POLICY "call_select_participant" ON public.call_sessions FOR SELECT TO authenticated USING (auth.uid() = initiator_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "call_insert_participant" ON public.call_sessions;
CREATE POLICY "call_insert_participant" ON public.call_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = initiator_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "call_update_participant" ON public.call_sessions;
CREATE POLICY "call_update_participant" ON public.call_sessions FOR UPDATE TO authenticated USING (auth.uid() = initiator_id OR auth.uid() = receiver_id);

-- =======================================================================
-- 6. NOTIFICATIONS
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_any" ON public.notifications;
CREATE POLICY "notif_insert_any" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, created_at DESC);

-- =======================================================================
-- 7. PRESCRIPTIONS & PATIENT NOTES
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rx_select_party" ON public.prescriptions;
CREATE POLICY "rx_select_party" ON public.prescriptions FOR SELECT TO authenticated USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
DROP POLICY IF EXISTS "rx_insert_doctor" ON public.prescriptions;
CREATE POLICY "rx_insert_doctor" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

CREATE TABLE IF NOT EXISTS public.patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pn_select_doctor" ON public.patient_notes;
CREATE POLICY "pn_select_doctor" ON public.patient_notes FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
DROP POLICY IF EXISTS "pn_insert_doctor" ON public.patient_notes;
CREATE POLICY "pn_insert_doctor" ON public.patient_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

-- =======================================================================
-- 8. AVAILABILITY SLOTS
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avail_select_all_authed" ON public.availability_slots;
CREATE POLICY "avail_select_all_authed" ON public.availability_slots FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "avail_modify_own" ON public.availability_slots;
CREATE POLICY "avail_modify_own" ON public.availability_slots FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

-- =======================================================================
-- 9. MOCK DOCTORS (display-only, no auth required)
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.mock_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  specialty text NOT NULL,
  license_number text,
  consultation_fee numeric,
  available boolean NOT NULL DEFAULT true,
  bio text,
  years_experience int,
  avatar_url text,
  rating numeric DEFAULT 4.8,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mock_docs_read" ON public.mock_doctors;
CREATE POLICY "mock_docs_read" ON public.mock_doctors FOR SELECT TO authenticated USING (true);

-- =======================================================================
-- 10. UPDATED handle_new_user trigger
-- =======================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role, specialty, license_number, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'specialty',
    NEW.raw_user_meta_data->>'license_number',
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'doctor' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================================================================
-- 11. STORAGE BUCKETS
-- =======================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('ecg_uploads', 'ecg_uploads', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_files', 'chat_files', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ecg_public_read" ON storage.objects;
CREATE POLICY "ecg_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'ecg_uploads');
DROP POLICY IF EXISTS "ecg_user_upload" ON storage.objects;
CREATE POLICY "ecg_user_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ecg_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "chat_files_read_authed" ON storage.objects;
CREATE POLICY "chat_files_read_authed" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat_files');
DROP POLICY IF EXISTS "chat_files_user_upload" ON storage.objects;
CREATE POLICY "chat_files_user_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =======================================================================
-- 12. REALTIME
-- =======================================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- =======================================================================
-- 13. SEED MOCK DOCTORS
-- =======================================================================
INSERT INTO public.mock_doctors (display_name, specialty, license_number, consultation_fee, available, bio, years_experience)
VALUES
  ('Dr. Anika Sharma',     'Cardiologist',                 'IND-CARD-7821', 85,  true,  'Interventional cardiologist with 12+ years of experience in arrhythmia management.', 12),
  ('Dr. Rohan Mehta',      'General Physician',            'IND-GP-3409',   40,  true,  'Family medicine doctor focused on preventive cardiac care and lifestyle medicine.', 8),
  ('Dr. Priya Iyer',       'Emergency',                    'IND-EM-9112',   120, true,  'Emergency physician — rapid triage of acute chest pain and arrhythmias.', 10),
  ('Dr. Vikram Nair',      'Electrophysiologist',          'IND-EP-5530',   150, false, 'Cardiac electrophysiology, ablation procedures, and complex arrhythmia care.', 15),
  ('Dr. Sara Khan',        'Interventional Cardiologist',  'IND-IC-2204',   130, true,  'Stenting, angioplasty, and acute MI intervention specialist.', 11)
ON CONFLICT DO NOTHING;
