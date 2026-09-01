import "dotenv/config";
import crypto from "node:crypto";

import { hashPassword } from "../src/auth/password.js";
import { findUserByEmail, updateUserPassword } from "../src/db/users.js";

function generateStrongPassword(length = 20): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@capcut.guelichweb.store";
  const password = process.env.ADMIN_PASSWORD ?? generateStrongPassword();

  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`Aucun compte admin trouvé pour ${email}`);
    process.exit(1);
  }

  await updateUserPassword(user.id, await hashPassword(password));
  console.log(`Mot de passe admin mis à jour pour ${email}`);
  console.log(`NOUVEAU_MOT_DE_PASSE=${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
