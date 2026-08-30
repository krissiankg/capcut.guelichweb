import { hashPassword } from "../src/auth/password.js";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- \"mot-de-passe\"");
  process.exit(1);
}

hashPassword(password).then((hash) => {
  console.log(hash);
});
