import { supabase } from "./supabase.js";

export interface CapcutUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: "user" | "admin";
  is_active: boolean;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_sent_at: string | null;
}

export interface CapcutPlan {
  id: string;
  slug: string;
  name_fr: string;
  description_fr: string | null;
  price_cents: number;
  duration_days: number;
  trial_days: number;
  max_exports_per_month: number | null;
}

export interface CapcutSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "trial" | "active" | "expired" | "cancelled";
  starts_at: string;
  ends_at: string;
  plan?: CapcutPlan;
}

export async function findUserByEmail(email: string): Promise<CapcutUser | null> {
  const { data, error } = await supabase
    .from("capcut_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw error;
  return data as CapcutUser | null;
}

export async function findUserById(id: string): Promise<CapcutUser | null> {
  const { data, error } = await supabase
    .from("capcut_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as CapcutUser | null;
}

export type CapcutUserSummary = Pick<
  CapcutUser,
  "id" | "email" | "full_name" | "role" | "is_active" | "marketing_opt_in" | "marketing_opt_in_at"
>;

export async function listUsers(): Promise<CapcutUserSummary[]> {
  const { data, error } = await supabase
    .from("capcut_users")
    .select("id, email, full_name, role, is_active, marketing_opt_in, marketing_opt_in_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CapcutUserSummary[];
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: "user" | "admin";
  marketingOptIn?: boolean;
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
}): Promise<CapcutUser> {
  const marketingOptIn = Boolean(input.marketingOptIn);
  const emailVerified = input.emailVerified ?? input.role === "admin";
  const { data, error } = await supabase
    .from("capcut_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      password_hash: input.passwordHash,
      full_name: input.fullName,
      role: input.role ?? "user",
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
      email_verified: emailVerified,
      email_verification_token: input.emailVerificationToken ?? null,
      email_verification_sent_at: input.emailVerificationToken
        ? new Date().toISOString()
        : null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CapcutUser;
}

export async function listPlans(): Promise<CapcutPlan[]> {
  const { data, error } = await supabase
    .from("capcut_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as CapcutPlan[];
}

/** Forfaits visibles publiquement (gratuits uniquement). */
export async function listPublicPlans(): Promise<CapcutPlan[]> {
  const { data, error } = await supabase
    .from("capcut_plans")
    .select("*")
    .eq("is_active", true)
    .eq("price_cents", 0)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as CapcutPlan[];
}

export const FREE_PLAN_SLUG = "free";

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  const { error } = await supabase
    .from("capcut_users")
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("capcut_users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function createFreeAccess(userId: string): Promise<CapcutSubscription> {
  return createSubscription({
    userId,
    planSlug: FREE_PLAN_SLUG,
    notes: "Inscription gratuite",
  });
}

export async function getPlanBySlug(slug: string): Promise<CapcutPlan | null> {
  const { data, error } = await supabase
    .from("capcut_plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as CapcutPlan | null;
}

export async function getActiveSubscription(
  userId: string,
): Promise<CapcutSubscription | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("capcut_subscriptions")
    .select("*, plan:capcut_plans(*)")
    .eq("user_id", userId)
    .in("status", ["trial", "active"])
    .gte("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CapcutSubscription & { plan: CapcutPlan };
  return { ...row, plan: row.plan };
}

export async function createSubscription(input: {
  userId: string;
  planSlug: string;
  activatedBy?: string;
  notes?: string;
}): Promise<CapcutSubscription> {
  const plan = await getPlanBySlug(input.planSlug);
  if (!plan) throw new Error(`Plan inconnu : ${input.planSlug}`);

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  const days = plan.trial_days > 0 ? plan.trial_days : plan.duration_days;
  endsAt.setDate(endsAt.getDate() + days);

  const status = plan.trial_days > 0 ? "trial" : "active";

  const { data, error } = await supabase
    .from("capcut_subscriptions")
    .insert({
      user_id: input.userId,
      plan_id: plan.id,
      status,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: input.notes ?? null,
      activated_by: input.activatedBy ?? null,
    })
    .select("*, plan:capcut_plans(*)")
    .single();

  if (error) throw error;
  const row = data as CapcutSubscription & { plan: CapcutPlan };
  return { ...row, plan: row.plan };
}

export async function listSubscriptionsForUser(
  userId: string,
): Promise<CapcutSubscription[]> {
  const { data, error } = await supabase
    .from("capcut_subscriptions")
    .select("*, plan:capcut_plans(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CapcutSubscription[];
}

export async function listAllSubscriptions(): Promise<
  (CapcutSubscription & { user?: CapcutUserSummary })[]
> {
  const { data, error } = await supabase
    .from("capcut_subscriptions")
    .select(
      "*, plan:capcut_plans(*), user:capcut_users!capcut_subscriptions_user_id_fkey(id, email, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as (CapcutSubscription & { user?: CapcutUserSummary })[];
}

export async function deleteUserById(userId: string): Promise<void> {
  const { error } = await supabase.from("capcut_users").delete().eq("id", userId);

  if (error) throw error;
}
