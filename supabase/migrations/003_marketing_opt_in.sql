-- Marketing email opt-in for CapCut Studio users (GDPR-friendly, unchecked by default)
alter table public.capcut_users
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;
