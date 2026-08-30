-- Tokens de réinitialisation de mot de passe (CapCut Studio portal)
create table if not exists public.capcut_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.capcut_users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_capcut_password_reset_user
  on public.capcut_password_reset_tokens (user_id);

create index if not exists idx_capcut_password_reset_hash
  on public.capcut_password_reset_tokens (token_hash);

create index if not exists idx_capcut_password_reset_expires
  on public.capcut_password_reset_tokens (expires_at)
  where used_at is null;

alter table public.capcut_password_reset_tokens enable row level security;

create policy capcut_password_reset_deny on public.capcut_password_reset_tokens
  for all using (false);
