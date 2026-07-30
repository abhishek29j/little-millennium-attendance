CREATE POLICY "authenticated can view student photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "admins can upload student photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update student photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete student photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'));