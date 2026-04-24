
-- Staff details (for members added manually by admins)
CREATE TABLE public.staff_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,                       -- nullable: filled when person eventually has an account
  full_name text NOT NULL,
  email text,
  phone text,
  id_number text,                     -- passport / national ID
  position text,
  notes text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view staff details"
  ON public.staff_details FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins manage staff details"
  ON public.staff_details FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE TRIGGER staff_details_updated
  BEFORE UPDATE ON public.staff_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shift schedules (admin-planned)
CREATE TABLE public.shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,              -- assigned staff member
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  role_label text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view org shifts"
  ON public.shift_schedules FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "admins manage shifts"
  ON public.shift_schedules FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE TRIGGER shift_schedules_updated
  BEFORE UPDATE ON public.shift_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clock-ins
CREATE TABLE public.shift_clockins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  shift_id uuid REFERENCES public.shift_schedules(id) ON DELETE SET NULL,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_clockins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view org clockins"
  ON public.shift_clockins FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Staff can insert their OWN clock-in row (cannot edit/delete after)
CREATE POLICY "staff insert own clockin"
  ON public.shift_clockins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

-- Staff can clock OUT (update only clock_out_at on their own open row); enforced by app + policy
CREATE POLICY "staff close own clockin"
  ON public.shift_clockins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND clock_out_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Admins full control
CREATE POLICY "admins manage clockins"
  ON public.shift_clockins FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE TRIGGER shift_clockins_updated
  BEFORE UPDATE ON public.shift_clockins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team chat (single channel per org)
CREATE TABLE public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view team chat"
  ON public.team_chat_messages FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "members post team chat"
  ON public.team_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "authors delete own message"
  ON public.team_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins manage team chat"
  ON public.team_chat_messages FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

ALTER TABLE public.team_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;

CREATE INDEX team_chat_messages_org_created_idx
  ON public.team_chat_messages (organization_id, created_at DESC);

CREATE INDEX shift_schedules_org_user_idx
  ON public.shift_schedules (organization_id, user_id, starts_at);

CREATE INDEX shift_clockins_org_user_idx
  ON public.shift_clockins (organization_id, user_id, clock_in_at DESC);
