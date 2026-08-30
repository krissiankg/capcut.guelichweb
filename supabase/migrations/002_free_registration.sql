-- CapCut Studio — inscription gratuite (pas d'abonnements payants pour l'instant)

-- Désactiver les forfaits payants
update public.capcut_plans
set is_active = false
where slug in ('starter', 'pro');

-- Forfait gratuit illimité (durée ~100 ans)
insert into public.capcut_plans (
  slug, name_fr, description_fr, price_cents, duration_days, trial_days,
  max_exports_per_month, is_active, sort_order
)
values (
  'free',
  'Accès gratuit',
  'Inscription gratuite — montage vidéo professionnel dans votre navigateur, sans limite de durée pour l''instant.',
  0,
  36500,
  0,
  null,
  true,
  1
)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  description_fr = excluded.description_fr,
  price_cents = 0,
  duration_days = 36500,
  trial_days = 0,
  max_exports_per_month = null,
  is_active = true,
  sort_order = 1;

-- Mettre à jour l'essai (legacy) — désactivé au profit de "free"
update public.capcut_plans
set is_active = false
where slug = 'trial';
