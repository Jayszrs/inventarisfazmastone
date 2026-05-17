
CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, roles app_role[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengakses daftar user';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email, u.created_at
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id uuid, target_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah role';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, target_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users_with_roles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role) TO authenticated;
