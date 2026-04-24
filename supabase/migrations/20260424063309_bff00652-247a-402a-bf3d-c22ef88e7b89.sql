
DROP FUNCTION IF EXISTS public.org_dashboard_analytics();

CREATE FUNCTION public.org_dashboard_analytics()
 RETURNS TABLE(
   organization_id uuid,
   organization_name text,
   is_demo boolean,
   member_count bigint,
   total_views bigint,
   unique_users bigint,
   active_30d bigint,
   active_7d bigint,
   last_activity timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.is_demo,
    (SELECT COUNT(*) FROM public.organization_members om WHERE om.organization_id = o.id)::bigint,
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
$function$;
