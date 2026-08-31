import { Router } from "express";
import { getSession } from "../auth/session.js";
import { hashPassword } from "../auth/password.js";
import {
  createSubscription,
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  getActiveSubscription,
  listAllSubscriptions,
  listPublicPlans,
  listUsers,
  setUserActive,
} from "../db/users.js";

export const adminRouter = Router();

function requireAdmin(req: Parameters<typeof getSession>[0], res: import("express").Response, next: import("express").NextFunction) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    res.status(401).json({ error: "Accès administrateur requis." });
    return;
  }
  next();
}

adminRouter.use(requireAdmin);

adminRouter.get("/overview", async (_req, res) => {
  const [users, subscriptions, plans] = await Promise.all([
    listUsers(),
    listAllSubscriptions(),
    listPublicPlans(),
  ]);
  res.json({ users, subscriptions, plans });
});

adminRouter.post("/users", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const fullName = String(req.body?.fullName ?? "").trim();
    const password = String(req.body?.password ?? "");
    const planSlug = String(req.body?.planSlug ?? "free");

    if (!email || !fullName || !password) {
      res.status(400).json({ error: "Email, nom et mot de passe requis." });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Cet email est déjà utilisé." });
      return;
    }

    const session = getSession(req)!;
    const user = await createUser({
      email,
      fullName,
      passwordHash: await hashPassword(password),
    });

    const subscription = await createSubscription({
      userId: user.id,
      planSlug,
      activatedBy: session.userId,
      notes: "Créé par admin",
    });

    res.status(201).json({ user: { id: user.id, email, fullName }, subscription });
  } catch (error) {
    console.error("admin create user", error);
    res.status(500).json({ error: "Impossible de créer l'utilisateur." });
  }
});

adminRouter.post("/subscriptions", async (req, res) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const planSlug = String(req.body?.planSlug ?? "free");
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    const session = getSession(req)!;
    let targetUserId = userId;

    if (!targetUserId && email) {
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable." });
        return;
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      res.status(400).json({ error: "userId ou email requis." });
      return;
    }

    const subscription = await createSubscription({
      userId: targetUserId,
      planSlug,
      activatedBy: session.userId,
      notes: String(req.body?.notes ?? "Activation manuelle admin"),
    });

    res.status(201).json({ subscription });
  } catch (error) {
    console.error("admin subscription", error);
    res.status(500).json({ error: "Impossible d'activer l'abonnement." });
  }
});

adminRouter.patch("/users/:id/active", async (req, res) => {
  try {
    const isActive = Boolean(req.body?.isActive);
    await setUserActive(req.params.id, isActive);
    res.json({ ok: true, isActive });
  } catch (error) {
    console.error("admin toggle user", error);
    res.status(500).json({ error: "Impossible de modifier l'utilisateur." });
  }
});

adminRouter.get("/users/:id/subscription", async (req, res) => {
  const subscription = await getActiveSubscription(req.params.id);
  res.json({ subscription });
});

adminRouter.delete("/users/:id", async (req, res) => {
  try {
    const session = getSession(req)!;
    const targetId = req.params.id;

    if (targetId === session.userId) {
      res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte admin ici." });
      return;
    }

    const user = await findUserById(targetId);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return;
    }

    if (user.role === "admin") {
      res.status(403).json({ error: "Impossible de supprimer un compte administrateur." });
      return;
    }

    await deleteUserById(targetId);
    res.json({ ok: true, message: `Compte ${user.email} supprimé.` });
  } catch (error) {
    console.error("admin delete user", error);
    res.status(500).json({ error: "Impossible de supprimer l'utilisateur." });
  }
});
