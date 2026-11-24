import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db.js";

let userId: string;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [`summary-test-${Date.now()}@example.com`]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("fn_year_summary", () => {
  it("excludes months after an expense's active_to", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Ended Mid Year', NULL, '#000000', 400, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query(
      "SELECT update_expense($1, $2, NULL, NULL, NULL, '2026-06-30', false)",
      [userId, expenseId]
    );

    const rows = (
      await pool.query("SELECT * FROM fn_year_summary($1, 2026)", [userId])
    ).rows.filter((r: any) => r.item_id === expenseId);
    const months = rows.map((r: any) => r.month).sort((a: number, b: number) => a - b);

    expect(months).toEqual([1, 2, 3, 4, 5, 6]);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("uses the amount in effect for each month after a mid-year change", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Mid Year Change', NULL, '#000000', 1000, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query("SELECT set_expense_amount($1, $2, '2026-07-01', 1500)", [
      userId,
      expenseId,
    ]);

    const rows = (
      await pool.query("SELECT * FROM fn_year_summary($1, 2026)", [userId])
    ).rows.filter((r: any) => r.item_id === expenseId);
    const byMonth: Record<number, number> = {};
    for (const r of rows) byMonth[r.month] = Number(r.planned);

    expect(byMonth[6]).toBe(1000);
    expect(byMonth[7]).toBe(1500);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });
});

describe("fn_month_summary", () => {
  it("computes fixed totals, status, and the previous month's total out", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Month Summary Expense', NULL, '#000000', 1000, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query("SELECT create_payment($1, $2, '2026-09-15', 1000, NULL)", [
      userId,
      expenseId,
    ]);
    await pool.query("SELECT create_payment($1, $2, '2026-10-10', 400, NULL)", [
      userId,
      expenseId,
    ]);

    const result = await pool.query("SELECT fn_month_summary($1, 2026, 10) AS data", [userId]);
    const data = result.rows[0].data;

    const expenseRow = data.fixed.find((f: any) => f.expenseId === expenseId);
    expect(expenseRow.status).toBe("partial");
    expect(Number(data.totals.fixedPaid)).toBeGreaterThanOrEqual(400);
    expect(Number(data.totals.totalOut)).toBe(Number(data.totals.fixedPaid));
    expect(Number(data.totals.prevMonthTotalOut)).toBeGreaterThanOrEqual(1000);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("returns null prevMonthTotalOut for January", async () => {
    const result = await pool.query("SELECT fn_month_summary($1, 2026, 1) AS data", [userId]);
    expect(result.rows[0].data.totals.prevMonthTotalOut).toBeNull();
  });
});
