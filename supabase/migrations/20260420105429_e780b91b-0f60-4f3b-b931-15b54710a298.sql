-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id;
$$;

-- Shipments
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL,
  product TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  carrier TEXT,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  units INT NOT NULL DEFAULT 1,
  cost NUMERIC(12,2) DEFAULT 0,
  departed_at TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  risk_score NUMERIC(5,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_shipments_org ON public.shipments(organization_id);

-- Routes
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  recommended_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_days NUMERIC(6,2),
  estimated_cost NUMERIC(12,2),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Forecasts
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  region TEXT NOT NULL,
  horizon_weeks INT NOT NULL DEFAULT 12,
  predictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5,2),
  insights TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

-- Bottlenecks
CREATE TABLE public.bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  suggested_action TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bottlenecks ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  summary TEXT,
  data JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Chat
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- organizations
CREATE POLICY "view orgs i belong to" ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id) OR is_demo = true);
CREATE POLICY "insert orgs" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "admins update org" ON public.organizations FOR UPDATE
  USING (public.has_org_role(auth.uid(), id, 'admin'));

-- organization_members
CREATE POLICY "view members of my orgs" ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "self insert membership" ON public.organization_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage members" ON public.organization_members FOR ALL
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- shipments
CREATE POLICY "view org shipments" ON public.shipments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true));
CREATE POLICY "members create shipments" ON public.shipments FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members update shipments" ON public.shipments FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members delete shipments" ON public.shipments FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

-- routes
CREATE POLICY "view org routes" ON public.routes FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true));
CREATE POLICY "members manage routes" ON public.routes FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- forecasts
CREATE POLICY "view org forecasts" ON public.forecasts FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true));
CREATE POLICY "members manage forecasts" ON public.forecasts FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- bottlenecks
CREATE POLICY "view org bottlenecks" ON public.bottlenecks FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true));
CREATE POLICY "members manage bottlenecks" ON public.bottlenecks FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- reports
CREATE POLICY "view org reports" ON public.reports FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR organization_id IN (SELECT id FROM public.organizations WHERE is_demo = true));
CREATE POLICY "members create reports" ON public.reports FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "members delete reports" ON public.reports FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

-- chat
CREATE POLICY "view own conversations" ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "create own conversations" ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "delete own conversations" ON public.chat_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "view own messages" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "create own messages" ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();