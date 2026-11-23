import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db.js";

let userId: string;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [`debts-test-${Date.now()}@example.com`]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("debts", () => {
  it("creates a debt, tracks partial repayments, and computes status", async () => {
    const result = await pool.query(
      "SELECT create_debt($1, 'Rahul', 'owed_to_me', 5000, NULL, NULL) AS result",
      [userId]
    );
    const debtId = result.rows[0].result.id;

    let list = (await pool.query("SELECT list_debts($1) AS data", [userId])).rows[0].data;
    let debt = list.find((d: any) => d.id === debtId);
    expect(debt.status).toBe("open");
    expect(Number(debt.remaining)).toBe(5000);

    await pool.query("SELECT add_debt_repayment($1, $2, '2026-11-01', 2000, NULL)", [userId, debtId]);

    list = (await pool.query("SELECT list_debts($1) AS data", [userId])).rows[0].data;
    debt = list.find((d: any) => d.id === debtId);
    expect(Number(debt.repaid)).toBe(2000);
    expect(Number(debt.remaining)).toBe(3000);
    expect(debt.repaymentCount).toBe(1);
    expect(debt.status).toBe("open");

    await pool.query("SELECT add_debt_repayment($1, $2, '2026-11-15', 3000, NULL)", [userId, debtId]);

    list = (await pool.query("SELECT list_debts($1) AS data", [userId])).rows[0].data;
    debt = list.find((d: any) => d.id === debtId);
    expect(Number(debt.remaining)).toBe(0);
    expect(debt.status).toBe("settled");

    await pool.query("DELETE FROM debts WHERE id = $1", [debtId]);
  });

  it("rejects a repayment on another user's debt", async () => {
    const otherUser = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
      [`debts-test-other-${Date.now()}@example.com`]
    );
    const otherUserId = otherUser.rows[0].id;
    const debtResult = await pool.query(
      "SELECT create_debt($1, 'Priya', 'i_owe', 1000, NULL, NULL) AS result",
      [otherUserId]
    );
    const debtId = debtResult.rows[0].result.id;

    await expect(
      pool.query("SELECT add_debt_repayment($1, $2, '2026-11-01', 100, NULL)", [userId, debtId])
    ).rejects.toThrow();

    await pool.query("DELETE FROM users WHERE id = $1", [otherUserId]);
  });

  it("updates and deletes a repayment, keeping remaining in sync", async () => {
    const debtResult = await pool.query(
      "SELECT create_debt($1, 'Amit', 'i_owe', 2000, NULL, 'Dinner split') AS result",
      [userId]
    );
    const debtId = debtResult.rows[0].result.id;
    const repResult = await pool.query(
      "SELECT add_debt_repayment($1, $2, '2026-11-01', 500, NULL) AS result",
      [userId, debtId]
    );
    const repaymentId = repResult.rows[0].result.id;

    await pool.query("SELECT update_debt_repayment($1, $2, NULL, 800, NULL, false)", [userId, repaymentId]);
    let list = (await pool.query("SELECT list_debts($1) AS data", [userId])).rows[0].data;
    expect(Number(list.find((d: any) => d.id === debtId).repaid)).toBe(800);

    await pool.query("SELECT delete_debt_repayment($1, $2)", [userId, repaymentId]);
    list = (await pool.query("SELECT list_debts($1) AS data", [userId])).rows[0].data;
    expect(Number(list.find((d: any) => d.id === debtId).repaid)).toBe(0);

    await pool.query("DELETE FROM debts WHERE id = $1", [debtId]);
  });

  it("deletes a debt and cascades its repayments", async () => {
    const debtResult = await pool.query(
      "SELECT create_debt($1, 'Sana', 'owed_to_me', 1500, '2026-12-31', NULL) AS result",
      [userId]
    );
    const debtId = debtResult.rows[0].result.id;
    await pool.query("SELECT add_debt_repayment($1, $2, '2026-11-01', 500, NULL)", [userId, debtId]);

    await pool.query("SELECT delete_debt($1, $2)", [userId, debtId]);

    const repayments = await pool.query("SELECT * FROM debt_repayments WHERE debt_id = $1", [debtId]);
    expect(repayments.rows).toHaveLength(0);
  });

  it("404s updating an already-deleted debt", async () => {
    const debtResult = await pool.query(
      "SELECT create_debt($1, 'Temp', 'i_owe', 100, NULL, NULL) AS result",
      [userId]
    );
    const debtId = debtResult.rows[0].result.id;
    await pool.query("SELECT delete_debt($1, $2)", [userId, debtId]);

    await expect(
      pool.query("SELECT update_debt($1, $2, 'New Name', NULL, NULL, NULL, false, NULL, false)", [
        userId,
        debtId,
      ])
    ).rejects.toThrow();
  });
});
