DROP POLICY IF EXISTS "members insert own events" ON public.dashboard_events;

CREATE POLICY "members insert own events"
ON public.dashboard_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    public.is_org_member(auth.uid(), organization_id)
    OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true)
  )
);