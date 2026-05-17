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
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = _user_id
        AND lower(email) IN (
          'saputrajaelani423@gmail.com',
          'jaelanisurya8@gmail.com'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.claim_allowed_admin_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_email text;
BEGIN
  SELECT lower(email)
  INTO current_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_email IN ('saputrajaelani423@gmail.com', 'jaelanisurya8@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN 'admin';
  END IF;

  RETURN COALESCE(
    (
      SELECT role
      FROM public.user_roles
      WHERE user_id = auth.uid()
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END
      LIMIT 1
    ),
    'user'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_allowed_admin_email(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email text := lower(trim(target_email));
  updated_count integer;
BEGIN
  IF normalized_email NOT IN ('saputrajaelani423@gmail.com', 'jaelanisurya8@gmail.com') THEN
    RETURN false;
  END IF;

  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = '',
    updated_at = now()
  WHERE lower(email) = normalized_email;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin_user(auth.uid()));

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
  WHERE public.is_admin_user(auth.uid())
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
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengakses daftar user';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_allowed_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_allowed_admin_email(text) TO anon, authenticated;
