-- Email verification (double opt-in) for CapCut Studio
alter table public.capcut_users
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_token text,
  add column if not exists email_verification_sent_at timestamptz;

-- Grandfather all existing accounts at migration time
update public.capcut_users
set email_verified = true
where email_verified = false;

create index if not exists idx_capcut_users_verification_token
  on public.capcut_users (email_verification_token)
  where email_verification_token is not null;
