import { config } from "../config.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(config.resendApiKey && config.emailFrom);
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY ou EMAIL_FROM manquant — email non envoyé");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[email] Resend error", response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
