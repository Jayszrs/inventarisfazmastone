
DROP POLICY IF EXISTS "Authenticated users can upload dokumentasi files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dokumentasi files" ON storage.objects;

CREATE POLICY "Admins can upload dokumentasi files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dokumentasi' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dokumentasi files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dokumentasi' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dokumentasi files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dokumentasi' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'dokumentasi' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.confirm_allowed_admin_email(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, public;
