CREATE POLICY "profiles_select_via_conversation"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.patient_id = profiles.user_id AND c.doctor_id = auth.uid())
       OR (c.doctor_id  = profiles.user_id AND c.patient_id = auth.uid())
  )
);