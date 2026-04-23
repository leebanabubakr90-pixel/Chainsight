
-- =========================================================
-- 1. Allow org members to view each other's profiles
-- =========================================================
CREATE OR REPLACE FUNCTION public.shares_org_with(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m1
    JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  );
$$;

DROP POLICY IF EXISTS "view profiles of org mates" ON public.profiles;
CREATE POLICY "view profiles of org mates"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.shares_org_with(auth.uid(), user_id));

-- =========================================================
-- 2. organization_settings (currency, etc.)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view org settings"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins update org settings"
ON public.organization_settings
FOR UPDATE
TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role))
WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE POLICY "admins insert org settings"
ON public.organization_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

CREATE TRIGGER org_settings_updated
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create settings row when an org is created
CREATE OR REPLACE FUNCTION public.create_default_org_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER org_default_settings
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.create_default_org_settings();

-- Backfill for existing orgs
INSERT INTO public.organization_settings (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- =========================================================
-- 3. organization_invitations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invitations (lower(email));

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can see invites for their org
CREATE POLICY "admins view org invites"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

-- Invitee can see their own invites by email
CREATE POLICY "invitees view own invites"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- Admins can cancel/delete invites
CREATE POLICY "admins delete org invites"
ON public.organization_invitations
FOR DELETE
TO authenticated
USING (public.has_org_role(auth.uid(), organization_id, 'admin'::app_role));

-- =========================================================
-- 4. RPC: invite a member (admin only)
-- Returns 'added' if the user existed and is now a member,
-- or 'invited' if a pending invite was created.
-- =========================================================
CREATE OR REPLACE FUNCTION public.invite_org_member(_org_id uuid, _email text, _role public.app_role DEFAULT 'member')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_user uuid;
  _normalized text := lower(trim(_email));
BEGIN
  IF NOT public.has_org_role(auth.uid(), _org_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _normalized IS NULL OR _normalized = '' THEN
    RAISE EXCEPTION 'email required';
  END IF;

  SELECT id INTO _existing_user FROM auth.users WHERE lower(email) = _normalized LIMIT 1;

  IF _existing_user IS NOT NULL THEN
    -- Already a member?
    IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = _existing_user) THEN
      RETURN 'already_member';
    END IF;
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, _existing_user, _role);
    -- Mark any existing invite as accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE organization_id = _org_id AND lower(email) = _normalized;
    RETURN 'added';
  END IF;

  -- No user yet — create a pending invite (or refresh existing)
  INSERT INTO public.organization_invitations (organization_id, email, role, invited_by, status)
  VALUES (_org_id, _normalized, _role, auth.uid(), 'pending')
  ON CONFLICT (organization_id, email)
  DO UPDATE SET role = EXCLUDED.role, status = 'pending', invited_by = EXCLUDED.invited_by, created_at = now();
  RETURN 'invited';
END;
$$;

-- =========================================================
-- 5. RPC: change member role (admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_member_role(_org_id uuid, _user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_org_role(auth.uid(), _org_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- Prevent removing the last admin
  IF _role <> 'admin' THEN
    IF (SELECT COUNT(*) FROM public.organization_members WHERE organization_id = _org_id AND role = 'admin') <= 1
       AND EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org_id AND user_id = _user_id AND role = 'admin') THEN
      RAISE EXCEPTION 'cannot demote the last admin';
    END IF;
  END IF;
  UPDATE public.organization_members SET role = _role
  WHERE organization_id = _org_id AND user_id = _user_id;
END;
$$;

-- =========================================================
-- 6. RPC: remove a member (admin only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.remove_org_member(_org_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_org_role(auth.uid(), _org_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF (SELECT role FROM public.organization_members WHERE organization_id = _org_id AND user_id = _user_id) = 'admin'
     AND (SELECT COUNT(*) FROM public.organization_members WHERE organization_id = _org_id AND role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'cannot remove the last admin';
  END IF;
  DELETE FROM public.organization_members WHERE organization_id = _org_id AND user_id = _user_id;
END;
$$;

-- =========================================================
-- 7. Auto-accept pending invites on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_pending_invites_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT i.organization_id, NEW.id, i.role
  FROM public.organization_invitations i
  WHERE lower(i.email) = lower(NEW.email) AND i.status = 'pending'
  ON CONFLICT DO NOTHING;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE lower(email) = lower(NEW.email) AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_accept_invites ON auth.users;
CREATE TRIGGER on_auth_user_accept_invites
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.accept_pending_invites_for_user();

-- =========================================================
-- 8. RPC: accept invites for the currently signed-in user
-- (lets existing users pick up invites without re-signup)
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_my_pending_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text := lower(auth.jwt() ->> 'email');
  _count integer := 0;
BEGIN
  IF _email IS NULL THEN RETURN 0; END IF;

  WITH ins AS (
    INSERT INTO public.organization_members (organization_id, user_id, role)
    SELECT i.organization_id, auth.uid(), i.role
    FROM public.organization_invitations i
    WHERE lower(i.email) = _email AND i.status = 'pending'
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM ins;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE lower(email) = _email AND status = 'pending';

  RETURN _count;
END;
$$;
