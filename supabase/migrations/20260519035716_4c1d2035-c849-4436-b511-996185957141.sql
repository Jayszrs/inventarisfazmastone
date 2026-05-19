-- BARANG: tighten write policies to admin/staff
DROP POLICY IF EXISTS "Authenticated users can insert barang" ON public.barang;
DROP POLICY IF EXISTS "Authenticated users can update barang" ON public.barang;
DROP POLICY IF EXISTS "Authenticated users can delete barang" ON public.barang;

CREATE POLICY "Staff or admin can insert barang" ON public.barang
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff or admin can update barang" ON public.barang
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin can delete barang" ON public.barang
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DOKUMENTASI: tighten write to admin only, add UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can insert dokumentasi" ON public.dokumentasi;
DROP POLICY IF EXISTS "Authenticated users can delete dokumentasi" ON public.dokumentasi;

CREATE POLICY "Admins can insert dokumentasi" ON public.dokumentasi
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dokumentasi" ON public.dokumentasi
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dokumentasi" ON public.dokumentasi
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- TRANSAKSI: allow admin SELECT
CREATE POLICY "Admins can view all transaksi" ON public.transaksi
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DETAIL_TRANSAKSI: allow admin SELECT
CREATE POLICY "Admins can view all detail transaksi" ON public.detail_transaksi
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DOKUMENTASI STORAGE BUCKET: make private
UPDATE storage.buckets SET public = false WHERE id = 'dokumentasi';

DROP POLICY IF EXISTS "Anyone can view dokumentasi files" ON storage.objects;

CREATE POLICY "Authenticated users can view dokumentasi files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dokumentasi');

-- Lock down SECURITY DEFINER admin functions: revoke from anon, only authenticated may invoke
REVOKE EXECUTE ON FUNCTION public.admin_list_users_with_roles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_password(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_allowed_admin_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_allowed_admin_email(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_allowed_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- confirm_allowed_admin_email is invoked from login flow before session exists; keep callable from anon role
GRANT EXECUTE ON FUNCTION public.confirm_allowed_admin_email(text) TO anon, authenticated;