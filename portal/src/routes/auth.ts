import { Router } from "express";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "../auth/session.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { config } from "../config.js";
import {
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
} from "../db/password-reset.js";
import {
  findUserByVerificationToken,
  generateVerificationToken,
  markEmailVerified,
  setEmailVerificationToken,
} from "../db/email-verification.js";
import {
  createFreeAccess,
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  getActiveSubscription,
  updateUserPassword,
} from "../db/users.js";
import { sendEmail } from "../email/resend.js";
import {
  emailVerificationEmail,
  passwordResetEmail,
  welcomeEmail,
} from "../email/templates.js";
import {
  deleteAccountLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
} from "../middleware/rate-limit.js";

export const authRouter = Router();

const VERIFICATION_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function sendVerificationEmail(
  user: { id: string; email: string; full_name: string },
): Promise<void> {
  const token = generateVerificationToken();
  await setEmailVerificationToken(user.id, token);
  const verifyUrl = `${config.appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const mail = emailVerificationEmail(user.full_name, verifyUrl);
  void sendEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  }).catch((err) => console.error("verification email error", err));
}

async function userHasAccess(userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const subscription = await getActiveSubscription(userId);
  return Boolean(subscription);
}

authRouter.get("/verify", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).end();
    return;
  }

  const user = await findUserById(session.userId);
  if (!user || !user.is_active) {
    res.status(401).end();
    return;
  }

  if (session.role !== "admin" && !user.email_verified) {
    res.status(401).end();
    return;
  }

  const hasAccess = await userHasAccess(session.userId, session.role);
  if (!hasAccess) {
    res.status(401).end();
    return;
  }

  res.status(200).end();
});

authRouter.get("/session", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const subscription = await getActiveSubscription(session.userId);
  res.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
    subscription: subscription
      ? {
          status: subscription.status,
          endsAt: subscription.ends_at,
          plan: subscription.plan
            ? {
                slug: subscription.plan.slug,
                name: subscription.plan.name_fr,
              }
            : null,
        }
      : null,
    hasAccess: session.role === "admin" || Boolean(subscription),
  });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user || !user.is_active) {
      res.status(401).json({ error: "Identifiants incorrects." });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Identifiants incorrects." });
      return;
    }

    if (user.role !== "admin" && !user.email_verified) {
      res.status(403).json({
        error:
          "Veuillez confirmer votre adresse e-mail avant de vous connecter. Consultez votre boîte de réception ou renvoyez l'e-mail de confirmation.",
        code: "EMAIL_NOT_VERIFIED",
        resendUrl: `/verification-en-attente?email=${encodeURIComponent(user.email)}`,
      });
      return;
    }

    const subscription = await getActiveSubscription(user.id);
    const hasAccess = user.role === "admin" || Boolean(subscription);

    if (!hasAccess) {
      res.status(403).json({
        error:
          "Accès non disponible. Inscrivez-vous gratuitement ou contactez l'administrateur.",
        code: "NO_SUBSCRIPTION",
      });
      return;
    }

    setSessionCookie(res, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      ok: true,
      redirectTo: user.role === "admin" ? "/admin" : "/index.html",
      user: { email: user.email, fullName: user.full_name, role: user.role },
      subscription: subscription
        ? { status: subscription.status, endsAt: subscription.ends_at }
        : null,
    });
  } catch (error) {
    console.error("login error", error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

authRouter.post("/register", registerLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    const fullName = String(req.body?.fullName ?? "").trim();
    const marketingOptIn = Boolean(req.body?.marketingOptIn);

    if (!email || !password) {
      res.status(400).json({ error: "Email et mot de passe requis." });
      return;
    }

    if (!marketingOptIn) {
      res.status(400).json({
        error: "Vous devez accepter de recevoir nos actualités pour vous inscrire.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Cet email est déjà utilisé." });
      return;
    }

    const displayName = fullName || email.split("@")[0] || "Utilisateur";
    const verificationToken = generateVerificationToken();

    const user = await createUser({
      email,
      fullName: displayName,
      passwordHash: await hashPassword(password),
      marketingOptIn,
      emailVerified: false,
      emailVerificationToken: verificationToken,
    });

    await createFreeAccess(user.id);

    const verifyUrl = `${config.appUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;
    const verificationMail = emailVerificationEmail(displayName, verifyUrl);
    void sendEmail({
      to: user.email,
      subject: verificationMail.subject,
      html: verificationMail.html,
      text: verificationMail.text,
    }).catch((err) => console.error("verification email error", err));

    res.status(201).json({
      ok: true,
      redirectTo: `/verification-en-attente?email=${encodeURIComponent(user.email)}`,
      message: "Un e-mail de confirmation vous a été envoyé.",
      user: { email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (error) {
    console.error("register error", error);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
});

authRouter.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token ?? "").trim();
    if (!token) {
      res.redirect("/connexion?error=verification");
      return;
    }

    const user = await findUserByVerificationToken(token);
    if (!user) {
      res.redirect("/connexion?error=verification");
      return;
    }

    if (user.email_verification_sent_at) {
      const sentAt = new Date(user.email_verification_sent_at).getTime();
      if (Date.now() - sentAt > VERIFICATION_TOKEN_MAX_AGE_MS) {
        res.redirect("/verification-en-attente?error=expired");
        return;
      }
    }

    await markEmailVerified(user.id);

    const welcome = welcomeEmail(user.full_name);
    void sendEmail({
      to: user.email,
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
    }).catch((err) => console.error("welcome email error", err));

    res.redirect("/connexion?verified=1");
  } catch (error) {
    console.error("verify-email error", error);
    res.redirect("/connexion?error=verification");
  }
});

const resendVerificationMessage =
  "Si un compte non vérifié existe avec cet email, un nouveau lien de confirmation vient d'être envoyé.";

authRouter.post("/resend-verification", resendVerificationLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: "Email requis." });
      return;
    }

    const user = await findUserByEmail(email);
    if (user?.is_active && user.role !== "admin" && !user.email_verified) {
      await sendVerificationEmail(user);
    }

    res.json({ ok: true, message: resendVerificationMessage });
  } catch (error) {
    console.error("resend-verification error", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

const forgotPasswordMessage =
  "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.";

authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: "Email requis." });
      return;
    }

    const user = await findUserByEmail(email);
    if (user?.is_active) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${config.appUrl}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
      const mail = passwordResetEmail(user.full_name, resetUrl);
      void sendEmail({
        to: user.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }).catch((err) => console.error("reset email error", err));
    }

    res.json({ ok: true, message: forgotPasswordMessage });
  } catch (error) {
    console.error("forgot-password error", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");

    if (!token) {
      res.status(400).json({ error: "Lien de réinitialisation invalide." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: "Le mot de passe doit contenir au moins 8 caractères.",
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
      return;
    }

    const resetRow = await findValidResetToken(token);
    if (!resetRow) {
      res.status(400).json({
        error: "Ce lien est invalide ou a expiré. Demandez un nouveau lien.",
      });
      return;
    }

    const user = await findUserById(resetRow.user_id);
    if (!user || !user.is_active) {
      res.status(400).json({ error: "Compte introuvable ou désactivé." });
      return;
    }

    await updateUserPassword(user.id, await hashPassword(password));
    await markResetTokenUsed(resetRow.id);

    res.json({
      ok: true,
      message: "Mot de passe mis à jour. Vous pouvez vous connecter.",
      redirectTo: "/connexion?reset=1",
    });
  } catch (error) {
    console.error("reset-password error", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true, redirectTo: "/connexion" });
});

authRouter.post("/delete-account", deleteAccountLimiter, async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: "Connexion requise." });
      return;
    }

    const password = String(req.body?.password ?? "");
    const confirmDeletion = Boolean(req.body?.confirmDeletion);

    if (!password) {
      res.status(400).json({ error: "Mot de passe requis." });
      return;
    }

    if (!confirmDeletion) {
      res.status(400).json({
        error: "Vous devez confirmer la suppression définitive de votre compte.",
      });
      return;
    }

    const user = await findUserById(session.userId);
    if (!user || !user.is_active) {
      res.status(401).json({ error: "Compte introuvable ou déjà supprimé." });
      return;
    }

    if (user.role === "admin") {
      res.status(403).json({
        error:
          "Les comptes administrateur ne peuvent pas être supprimés via cette page. Contactez le support.",
      });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Mot de passe incorrect." });
      return;
    }

    await deleteUserById(user.id);
    clearSessionCookie(res);

    res.json({
      ok: true,
      message: "Votre compte a été supprimé définitivement.",
      redirectTo: "/",
    });
  } catch (error) {
    console.error("delete-account error", error);
    res.status(500).json({ error: "Erreur serveur lors de la suppression du compte." });
  }
});
