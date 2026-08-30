import { createHash, randomBytes } from "node:crypto";
import { supabase } from "./supabase.js";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export async function invalidateUserResetTokens(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("capcut_password_reset_tokens")
    .update({ used_at: now })
    .eq("user_id", userId)
    .is("used_at", null);

  if (error) throw error;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  await invalidateUserResetTokens(userId);

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from("capcut_password_reset_tokens").insert({
    user_id: userId,
    token_hash: hashResetToken(token),
    expires_at: expiresAt,
  });

  if (error) throw error;
  return token;
}

export async function findValidResetToken(
  token: string,
): Promise<{ id: string; user_id: string } | null> {
  const tokenHash = hashResetToken(token);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("capcut_password_reset_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gte("expires_at", now)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function markResetTokenUsed(tokenId: string): Promise<void> {
  const { error } = await supabase
    .from("capcut_password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) throw error;
}
