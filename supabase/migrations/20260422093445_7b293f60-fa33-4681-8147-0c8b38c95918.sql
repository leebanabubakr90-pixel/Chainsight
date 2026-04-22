DROP POLICY IF EXISTS "insert orgs" ON public.organizations;

CREATE POLICY "authenticated users insert orgs"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);