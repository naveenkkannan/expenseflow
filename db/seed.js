import { pool } from "./pool.js";

function currentMonthStart() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function main() {
  const email = process.env.SEED_EMAIL;
  if (!email) {
    throw new Error("SEED_EMAIL must be set in server/.env");
  }

  const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (userResult.rowCount === 0) {
    throw new Error(
      `No user found for ${email}. Run "npm run seed:user" first.`
    );
  }
  const userId = userResult.rows[0].id;
  const activeFrom = currentMonthStart();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subsGroup = await client.query(
      `INSERT INTO expense_groups (user_id, name, sort_order)
       VALUES ($1, 'Subscriptions', 1)
       RETURNING id`,
      [userId]
    );
    const emiGroup = await client.query(
      `INSERT INTO expense_groups (user_id, name, sort_order)
       VALUES ($1, 'Monthly EMIs', 2)
       RETURNING id`,
      [userId]
    );

    const expenses = [
      { name: "Mutual Fund", amount: 2000, groupId: null, color: "#3b82f6" },
      { name: "Donation", amount: 1000, groupId: null, color: "#16a34a" },
      {
        name: "Claude",
        amount: 2400,
        groupId: subsGroup.rows[0].id,
        color: "#ea580c",
      },
      {
        name: "Personal Loan EMI",
        amount: 4600,
        groupId: emiGroup.rows[0].id,
        color: "#7c3aed",
      },
    ];

    for (const e of expenses) {
      const expenseResult = await client.query(
        `INSERT INTO expenses (user_id, group_id, name, color, active_from)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, e.groupId, e.name, e.color, activeFrom]
      );
      await client.query(
        `INSERT INTO expense_amounts (expense_id, effective_from, amount)
         VALUES ($1, $2, $3)`,
        [expenseResult.rows[0].id, activeFrom, e.amount]
      );
    }

    await client.query("COMMIT");
    console.log("Seed data inserted.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
