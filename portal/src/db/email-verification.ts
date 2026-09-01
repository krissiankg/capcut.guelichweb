import crypto from "node:crypto";

import { supabase } from "./supabase.js";
import type { CapcutUser } from "./users.js";

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function setEmailVerificationToken(
  userId: string,
  token: string,
): Promise<void> {
  const { error } = await supabase
    .from("capcut_users")
    .update({
      email_verification_token: token,
      email_verification_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function findUserByVerificationToken(
  token: string,
): Promise<CapcutUser | null> {
  const { data, error } = await supabase
    .from("capcut_users")
    .select("*")
    .eq("email_verification_token", token)
    .maybeSingle();

  if (error) throw error;
  return data as CapcutUser | null;
}

export async function markEmailVerified(userId: string): Promise<void> {
  const { error } = await supabase
    .from("capcut_users")
    .update({
      email_verified: true,
      email_verification_token: null,
      email_verification_sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}
