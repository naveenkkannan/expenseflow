import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db.js";

let userId: string;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [`spends-test-${Date.now()}@example.com`]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("get_daily_month", () => {
  it("computes totals, average, untagged grouping, and a tag-filtered calendar", async () => {
    const tagResult = await pool.query(
      "SELECT create_spend_tag($1, 'Food', '#ff0000') AS result",
      [userId]
    );
    const tagId = tagResult.rows[0].result.id;

    await pool.query(
      "SELECT add_spend($1, '2026-11-01', 100, $2, 'upi', NULL)",
      [userId, tagId]
    );
    await pool.query(
      "SELECT add_spend($1, '2026-11-01', 50, NULL, 'cash', 'Snacks')",
      [userId]
    );
    await pool.query(
      "SELECT add_spend($1, '2026-11-05', 200, $2, 'card', NULL)",
      [userId, tagId]
    );

    const result = await pool.query(
      "SELECT get_daily_month($1, 2026, 11) AS data",
      [userId]
    );
    const data = result.rows[0].data;

    expect(Number(data.total)).toBe(350);
    expect(data.daysLogged).toBe(2);
    expect(Number(data.avgPerDay)).toBeCloseTo(350 / 11, 1);

    const byTag: Record<string, number> = {};
    for (const t of data.byTag) byTag[t.name] = Number(t.amount);
    expect(byTag["Food"]).toBe(300);
    expect(byTag["Untagged"]).toBe(50);

    const day1 = data.calendar.find((d: any) => d.date.startsWith("2026-11-01"));
    expect(Number(day1.total)).toBe(150);

    const filtered = await pool.query(
      "SELECT get_daily_month($1, 2026, 11, $2) AS data",
      [userId, tagId]
    );
    const filteredData = filtered.rows[0].data;
    const filteredDay1 = filteredData.calendar.find((d: any) =>
      d.date.startsWith("2026-11-01")
    );
    expect(Number(filteredDay1.total)).toBe(100);
    expect(filteredData.days).toHaveLength(2);
    for (const day of filteredData.days) {
      for (const entry of day.entries) {
        expect(entry.tagId).toBe(tagId);
      }
    }

    await pool.query("DELETE FROM spends WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM spend_tags WHERE id = $1", [tagId]);
  });
});

describe("delete_spend_tag", () => {
  it("leaves spends untagged instead of deleting them", async () => {
    const tagResult = await pool.query(
      "SELECT create_spend_tag($1, 'Temp', '#00ff00') AS result",
      [userId]
    );
    const tagId = tagResult.rows[0].result.id;

    const spendResult = await pool.query(
      "SELECT add_spend($1, '2026-11-02', 75, $2, 'upi', NULL) AS result",
      [userId, tagId]
    );
    const spendId = spendResult.rows[0].result.id;

    await pool.query("SELECT delete_spend_tag($1, $2)", [userId, tagId]);

    const spend = await pool.query("SELECT tag_id FROM spends WHERE id = $1", [
      spendId,
    ]);
    expect(spend.rows[0].tag_id).toBeNull();

    await pool.query("DELETE FROM spends WHERE id = $1", [spendId]);
  });
});

describe("get_expense_grid plannedYear/monthsLeft/ended", () => {
  it("sums planned amounts per active month across an amount change", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Grid Planned Year', NULL, '#000000', 1000, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query("SELECT set_expense_amount($1, $2, '2026-07-01', 1500)", [
      userId,
      expenseId,
    ]);

    const grid = (
      await pool.query("SELECT get_expense_grid($1, 2026) AS grid", [userId])
    ).rows[0].grid;
    const expense = grid.expenses.find((e: any) => e.id === expenseId);

    expect(Number(expense.plannedYear)).toBe(6 * 1000 + 6 * 1500);
    expect(expense.ended).toBe(false);
    expect(expense.monthsLeft).toBeNull();

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("marks an expense ended when active_to is before the current month", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Grid Ended', NULL, '#000000', 500, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query(
      "SELECT update_expense($1, $2, NULL, NULL, NULL, '2026-06-30', false)",
      [userId, expenseId]
    );

    const grid = (
      await pool.query("SELECT get_expense_grid($1, 2026) AS grid", [userId])
    ).rows[0].grid;
    const expense = grid.expenses.find((e: any) => e.id === expenseId);

    expect(expense.ended).toBe(true);
    expect(expense.monthsLeft).toBeNull();
    expect(Number(expense.plannedYear)).toBe(6 * 500);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("computes monthsLeft counting the current month through active_to", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Grid Months Left', NULL, '#000000', 300, '2026-09-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query(
      "SELECT update_expense($1, $2, NULL, NULL, NULL, '2027-02-28', false)",
      [userId, expenseId]
    );

    const grid = (
      await pool.query("SELECT get_expense_grid($1, 2026) AS grid", [userId])
    ).rows[0].grid;
    const expense = grid.expenses.find((e: any) => e.id === expenseId);

    expect(expense.ended).toBe(false);
    expect(expense.monthsLeft).toBe(4);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });
});
