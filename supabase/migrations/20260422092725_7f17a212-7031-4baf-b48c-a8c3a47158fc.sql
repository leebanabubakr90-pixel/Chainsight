CREATE OR REPLACE FUNCTION public.handle_super_admin_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'leebanabubakr90@gmail.com' THEN
    INSERT INTO public.user_app_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_super_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_super_admin_signup();

-- Promote if user already exists
INSERT INTO public.user_app_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role_global FROM auth.users
WHERE email = 'leebanabubakr90@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;