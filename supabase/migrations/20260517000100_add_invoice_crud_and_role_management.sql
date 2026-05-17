-- Allow users to maintain invoice details they own.
ALTER TABLE public.transaksi
ADD COLUMN IF NOT EXISTS nama_pelanggan text;

ALTER TABLE public.detail_transaksi
ADD COLUMN IF NOT EXISTS ukuran text;

DROP POLICY IF EXISTS "Users can update detail transaksi" ON public.detail_transaksi;
CREATE POLICY "Users can update detail transaksi"
ON public.detail_transaksi
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transaksi
    WHERE transaksi.id = detail_transaksi.transaksi_id
      AND transaksi.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transaksi
    WHERE transaksi.id = detail_transaksi.transaksi_id
      AND transaksi.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete detail transaksi" ON public.detail_transaksi;
CREATE POLICY "Users can delete detail transaksi"
ON public.detail_transaksi
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transaksi
    WHERE transaksi.id = detail_transaksi.transaksi_id
      AND transaksi.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own transaksi" ON public.transaksi;
CREATE POLICY "Users can delete their own transaksi"
ON public.transaksi
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can inspect and manage roles from the app.
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  roles public.app_role[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    u.created_at,
    COALESCE(
      array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::public.app_role[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY u.id, u.email, u.created_at
  ORDER BY u.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id uuid,
  target_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage user roles';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
