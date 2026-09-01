import { config } from "../config.js";

const brand = {
  accent: "#aa9158",
  bg: "#0a0a0a",
  surface: "#171d17",
  text: "#f4f2e8",
  muted: "#9ca493",
};

const BRAND_NAME = "GUELICHWEB";
const SUPPORT_EMAIL = "christ@guelichweb.online";

function supportContactHtml(): string {
  return `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${brand.muted};">
    Une question ? Écrivez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color:${brand.accent};text-decoration:none;">${SUPPORT_EMAIL}</a>.
  </p>`;
}

function supportContactText(): string {
  return `Une question ? Écrivez-nous à ${SUPPORT_EMAIL}.`;
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${brand.bg};font-family:Inter,Segoe UI,Arial,sans-serif;color:${brand.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${brand.surface};border:1px solid #30382f;border-radius:16px;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:11px;color:${brand.accent};font-weight:600;">
                <span style="text-transform:uppercase;letter-spacing:0.08em;">CapCut Studio</span>
                <span> · </span>
                <span style="white-space:nowrap;letter-spacing:0.1em;">${BRAND_NAME}</span>
              </p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${brand.text};">${title}</h1>
              ${bodyHtml}
              ${supportContactHtml()}
              <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${brand.muted};">
                Cet email a été envoyé par CapCut Studio (${config.appUrl}). Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,${brand.accent},#8a7344);color:#0a0a0a;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">${label}</a>
  </p>`;
}

export function welcomeEmail(fullName: string): { subject: string; html: string; text: string } {
  const editorUrl = `${config.appUrl}/`;
  const subject = "Bienvenue sur CapCut Studio";
  const html = layout(
    "Bienvenue !",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${brand.muted};">
      Bonjour ${escapeHtml(fullName)},<br /><br />
      Votre compte CapCut Studio est prêt. Vous pouvez dès maintenant accéder à l'éditeur vidéo professionnel dans votre navigateur.
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;color:${brand.muted};font-size:14px;line-height:1.7;">
      <li>Montage multi-pistes et export MP4/WebM</li>
      <li>Effets, transitions et sous-titres</li>
      <li>100 % navigateur — vos vidéos restent sur votre appareil</li>
    </ul>
    ${button(editorUrl, "Ouvrir l'éditeur")}`,
  );
  const text = `Bonjour ${fullName},\n\nBienvenue sur CapCut Studio (${BRAND_NAME}). Votre compte est actif.\nOuvrir l'éditeur : ${editorUrl}\n\n${supportContactText()}`;
  return { subject, html, text };
}

export function emailVerificationEmail(
  fullName: string,
  verifyUrl: string,
): { subject: string; html: string; text: string } {
  const subject = "Confirmez votre adresse e-mail — CapCut Studio";
  const html = layout(
    "Confirmez votre e-mail",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${brand.muted};">
      Bonjour ${escapeHtml(fullName)},<br /><br />
      Merci pour votre inscription sur CapCut Studio. Pour activer votre compte et accéder à l'éditeur vidéo,
      veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
    </p>
    ${button(verifyUrl, "Confirmer mon e-mail")}
    <p style="margin:0;font-size:13px;color:${brand.muted};">
      Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
    </p>`,
  );
  const text = `Bonjour ${fullName},\n\nCapCut Studio (${BRAND_NAME}) — confirmez votre e-mail : ${verifyUrl}\n\nCe lien est valable 24 heures.\n\n${supportContactText()}`;
  return { subject, html, text };
}

export function passwordResetEmail(
  fullName: string,
  resetUrl: string,
): { subject: string; html: string; text: string } {
  const subject = "Réinitialisation de votre mot de passe";
  const html = layout(
    "Réinitialiser votre mot de passe",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${brand.muted};">
      Bonjour ${escapeHtml(fullName)},<br /><br />
      Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte CapCut Studio.
      Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>
    ${button(resetUrl, "Réinitialiser mon mot de passe")}
    <p style="margin:0;font-size:13px;color:${brand.muted};">
      Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe actuel reste inchangé.
    </p>`,
  );
  const text = `Bonjour ${fullName},\n\nCapCut Studio (${BRAND_NAME}) — réinitialisez votre mot de passe : ${resetUrl}\n\nCe lien expire dans 1 heure.\n\n${supportContactText()}`;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
