import argon2 from "argon2";
import { pool } from "./pool.js";

async function main() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_EMAIL and SEED_PASSWORD must be set in server/.env");
  }

  const hash = await argon2.hash(password);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [email, hash]
  );

  console.log(`Seeded user: ${result.rows[0].email} (${result.rows[0].id})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
