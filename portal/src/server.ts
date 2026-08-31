import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { getSession } from "./auth/session.js";
import { findUserById, getActiveSubscription, listPublicPlans } from "./db/users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.get("/api/plans", async (_req, res) => {
  try {
    const plans = await listPublicPlans();
    res.json({
      plans: plans.map((p) => ({
        slug: p.slug,
        name: p.name_fr,
        description: p.description_fr,
        priceCents: p.price_cents,
        durationDays: p.duration_days,
        trialDays: p.trial_days,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Impossible de charger les forfaits." });
  }
});

async function userHasEditorAccess(userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const subscription = await getActiveSubscription(userId);
  return Boolean(subscription);
}

app.get("/", async (req, res) => {
  const session = getSession(req);
  if (session) {
    const user = await findUserById(session.userId);
    if (user?.is_active) {
      const hasAccess = await userHasEditorAccess(session.userId, session.role);
      if (hasAccess) {
        res.redirect("/index.html");
        return;
      }
    }
  }
  res.sendFile(path.join(publicDir, "accueil.html"));
});

app.get("/accueil", (_req, res) => {
  res.redirect(301, "/");
});

app.get("/connexion", (_req, res) => {
  res.sendFile(path.join(publicDir, "connexion.html"));
});

app.get("/inscription", (_req, res) => {
  res.sendFile(path.join(publicDir, "inscription.html"));
});

app.get("/mot-de-passe-oublie", (_req, res) => {
  res.sendFile(path.join(publicDir, "mot-de-passe-oublie.html"));
});

app.get("/reinitialiser-mot-de-passe", (_req, res) => {
  res.sendFile(path.join(publicDir, "reinitialiser-mot-de-passe.html"));
});

app.get("/compte", (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.redirect("/connexion?next=/compte");
    return;
  }
  res.sendFile(path.join(publicDir, "compte.html"));
});

app.get("/supprimer-mon-compte", (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.redirect("/connexion?next=/supprimer-mon-compte");
    return;
  }
  res.sendFile(path.join(publicDir, "supprimer-mon-compte.html"));
});

app.get("/admin", (req, res) => {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    res.redirect("/connexion?next=/admin");
    return;
  }
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/abonnement", (_req, res) => {
  res.sendFile(path.join(publicDir, "abonnement.html"));
});

app.get("/confidentialite", (_req, res) => {
  res.sendFile(path.join(publicDir, "confidentialite.html"));
});

app.get("/cgu", (_req, res) => {
  res.sendFile(path.join(publicDir, "cgu.html"));
});

app.get("/conditions", (_req, res) => {
  res.redirect(301, "/cgu");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "capcut-portal" });
});

app.use(express.static(publicDir));

app.listen(config.port, "127.0.0.1", () => {
  console.log(`CapCut portal listening on http://127.0.0.1:${config.port}`);
});
