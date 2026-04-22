DROP POLICY IF EXISTS "view orgs i belong to" ON public.organizations;

CREATE POLICY "view orgs i belong to"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  is_org_member(auth.uid(), id)
  OR is_demo = true
  OR created_by = auth.uid()
);