import { config } from "../src/config.js";
import "dotenv/config";
import { hashPassword } from "../src/auth/password.js";
import {
  createSubscription,
  createUser,
  findUserByEmail,
} from "../src/db/users.js";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@capcut.guelichweb.store";
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME ?? "Administrateur";

  if (!password) {
    console.error("ADMIN_PASSWORD requis pour seed-admin");
    process.exit(1);
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`Admin déjà présent : ${email}`);
    return;
  }

  const user = await createUser({
    email,
    fullName,
    passwordHash: await hashPassword(password),
    role: "admin",
  });

  await createSubscription({
    userId: user.id,
    planSlug: "pro",
    notes: "Admin — accès illimité",
  });

  console.log(`Admin créé : ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
