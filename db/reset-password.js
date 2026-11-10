import argon2 from "argon2";
import { pool } from "./pool.js";

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.error("Usage: npm run reset-password -- <email> <new-password>");
    process.exit(1);
  }

  const hash = await argon2.hash(newPassword);

  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email",
    [hash, email]
  );

  if (result.rowCount === 0) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`Password reset for ${result.rows[0].email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
