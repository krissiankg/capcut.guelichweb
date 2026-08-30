import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3011),
  appUrl: process.env.APP_URL ?? "http://localhost:3011",
  sessionSecret: required("SESSION_SECRET"),
  sessionDays: 30,
  cookieName: "capcut_session",
  supabaseUrl:
    process.env.SUPABASE_INTERNAL_URL ??
    process.env.SUPABASE_URL ??
    required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom:
    process.env.EMAIL_FROM ??
    "CapCut Studio · GUELICHWEB <noreply@guelichweb.store>",
};
