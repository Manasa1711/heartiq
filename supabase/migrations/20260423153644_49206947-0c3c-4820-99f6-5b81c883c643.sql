
DROP POLICY IF EXISTS "notif_insert_any" ON public.notifications;
CREATE POLICY "notif_insert_self_or_party" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
        AND (c.patient_id = notifications.user_id OR c.doctor_id = notifications.user_id)
    )
  );
