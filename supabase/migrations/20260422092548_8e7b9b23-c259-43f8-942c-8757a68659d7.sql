-- Global app role (separate from per-org role)
DO $$ BEGIN
  CREATE TYPE public.app_role_global AS ENUM ('super_admin', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role_global NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_app_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_app_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

CREATE POLICY "super admins manage app roles"
ON public.user_app_roles FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "users view own app roles"
ON public.user_app_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Dashboard events
CREATE TABLE IF NOT EXISTS public.dashboard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'daily_active')),
  path text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date
);

CREATE INDEX IF NOT EXISTS idx_dash_events_org ON public.dashboard_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_dash_events_org_day ON public.dashboard_events(organization_id, day);
CREATE INDEX IF NOT EXISTS idx_dash_events_type ON public.dashboard_events(event_type);
-- One daily_active row per (user, org, day)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily_active
  ON public.dashboard_events(user_id, organization_id, day)
  WHERE event_type = 'daily_active';

ALTER TABLE public.dashboard_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members insert own events"
ON public.dashboard_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "super admins view events"
ON public.dashboard_events FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Aggregation function (super-admin only)
CREATE OR REPLACE FUNCTION public.org_dashboard_analytics()
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  is_demo boolean,
  total_views bigint,
  unique_users bigint,
  active_30d bigint,
  active_7d bigint,
  last_activity timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.is_demo,
    COALESCE(SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END), 0)::bigint,
    COUNT(DISTINCT e.user_id)::bigint,
    COUNT(DISTINCT CASE WHEN e.event_type = 'daily_active' AND e.day >= (now() AT TIME ZONE 'utc')::date - INTERVAL '30 days' THEN e.user_id END)::bigint,
    COUNT(DISTINCT CASE WHEN e.event_type = 'daily_active' AND e.day >= (now() AT TIME ZONE 'utc')::date - INTERVAL '7 days' THEN e.user_id END)::bigint,
    MAX(e.occurred_at)
  FROM public.organizations o
  LEFT JOIN public.dashboard_events e ON e.organization_id = o.id
  GROUP BY o.id, o.name, o.is_demo
  ORDER BY MAX(e.occurred_at) DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.org_dashboard_analytics() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.org_dashboard_analytics() TO authenticated;