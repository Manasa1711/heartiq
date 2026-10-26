
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ecg uploads
CREATE TABLE public.ecg_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'normal',
  confidence NUMERIC,
  explanation TEXT,
  findings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ecg_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecg_select_own" ON public.ecg_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ecg_insert_own" ON public.ecg_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ecg_update_own" ON public.ecg_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ecg_delete_own" ON public.ecg_uploads FOR DELETE USING (auth.uid() = user_id);

-- consultations
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialty TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consult_select_own" ON public.consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consult_insert_own" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consult_update_own" ON public.consultations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "consult_delete_own" ON public.consultations FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
