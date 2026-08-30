-- OpenReel CapCut — utilisateurs et abonnements (Supabase self-hosted)
create extension if not exists "pgcrypto";

create table if not exists public.capcut_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fr text not null,
  description_fr text,
  price_cents integer not null default 0,
  duration_days integer not null default 30,
  trial_days integer not null default 0,
  max_exports_per_month integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.capcut_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capcut_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.capcut_users (id) on delete cascade,
  plan_id uuid not null references public.capcut_plans (id),
  status text not null default 'active' check (status in ('trial', 'active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  notes text,
  activated_by uuid references public.capcut_users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_capcut_users_email on public.capcut_users (email);
create index if not exists idx_capcut_subscriptions_user on public.capcut_subscriptions (user_id);
create index if not exists idx_capcut_subscriptions_status on public.capcut_subscriptions (status, ends_at);

alter table public.capcut_plans enable row level security;
alter table public.capcut_users enable row level security;
alter table public.capcut_subscriptions enable row level security;

-- Plans publics en lecture (anon) — détails marketing
create policy capcut_plans_read on public.capcut_plans
  for select using (is_active = true);

-- Pas d'accès direct client aux users/subscriptions (portal via service role)
create policy capcut_users_deny on public.capcut_users for all using (false);
create policy capcut_subscriptions_deny on public.capcut_subscriptions for all using (false);

insert into public.capcut_plans (slug, name_fr, description_fr, price_cents, duration_days, trial_days, max_exports_per_month, sort_order)
values
  ('trial', 'Essai gratuit', '7 jours pour découvrir l''éditeur vidéo professionnel.', 0, 7, 7, 5, 1),
  ('starter', 'Starter', 'Accès mensuel — exports illimités, toutes les fonctions de base.', 4900, 30, 0, null, 2),
  ('pro', 'Pro', 'Accès mensuel complet — priorité export 4K et outils avancés.', 9900, 30, 0, null, 3)
on conflict (slug) do nothing;
