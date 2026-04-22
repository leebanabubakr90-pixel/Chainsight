
-- Drop the overly permissive self-insert policy
DROP POLICY IF EXISTS "self insert membership" ON public.organization_members;

-- Replace with a restricted self-insert: only 'member' role, and only into orgs the user just created or demo orgs
CREATE POLICY "self insert membership restricted"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'::app_role
  AND (
    organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true)
    OR organization_id IN (SELECT id FROM public.organizations WHERE created_by = auth.uid())
  )
);

-- Allow org creators (admins) to insert their own admin membership when creating an org
CREATE POLICY "creator self insert admin"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND organization_id IN (SELECT id FROM public.organizations WHERE created_by = auth.uid())
);

-- Add UPDATE policy for reports: only creator or org admin can update
CREATE POLICY "members update own reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid() AND public.is_org_member(auth.uid(), organization_id))
  OR public.has_org_role(auth.uid(), organization_id, 'admin'::app_role)
)
WITH CHECK (
  (created_by = auth.uid() AND public.is_org_member(auth.uid(), organization_id))
  OR public.has_org_role(auth.uid(), organization_id, 'admin'::app_role)
);
