import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db.js";

let userId: string;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [`type-summary-test-${Date.now()}@example.com`]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("expense and tag type", () => {
  it("defaults to need and can be set on create", async () => {
    const result = await pool.query(
      "SELECT create_expense($1, 'Type Default Expense', NULL, '#000000', 100, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = result.rows[0].result.id;
    const row = await pool.query("SELECT type FROM expenses WHERE id = $1", [expenseId]);
    expect(row.rows[0].type).toBe("need");

    const investResult = await pool.query(
      "SELECT create_expense($1, 'Type Investment Expense', NULL, '#000000', 100, '2026-01-01', 'investment') AS result",
      [userId]
    );
    const investRow = await pool.query("SELECT type FROM expenses WHERE id = $1", [
      investResult.rows[0].result.id,
    ]);
    expect(investRow.rows[0].type).toBe("investment");

    await pool.query("SELECT update_expense($1, $2, NULL, NULL, NULL, NULL, false, 'want')", [
      userId,
      expenseId,
    ]);
    const updated = await pool.query("SELECT type FROM expenses WHERE id = $1", [expenseId]);
    expect(updated.rows[0].type).toBe("want");

    await pool.query("DELETE FROM expenses WHERE id IN ($1, $2)", [
      expenseId,
      investResult.rows[0].result.id,
    ]);
  });

  it("rejects an invalid type via the check constraint", async () => {
    await expect(
      pool.query(
        "SELECT create_expense($1, 'Bad Type', NULL, '#000000', 100, '2026-01-01', 'bogus') AS result",
        [userId]
      )
    ).rejects.toThrow();
  });

  it("defaults tags to need and supports updates", async () => {
    const tagResult = await pool.query(
      "SELECT create_spend_tag($1, 'Type Tag', '#ff0000') AS result",
      [userId]
    );
    const tagId = tagResult.rows[0].result.id;
    const row = await pool.query("SELECT type FROM spend_tags WHERE id = $1", [tagId]);
    expect(row.rows[0].type).toBe("need");

    await pool.query("SELECT update_spend_tag($1, $2, NULL, NULL, 'investment')", [userId, tagId]);
    const updated = await pool.query("SELECT type FROM spend_tags WHERE id = $1", [tagId]);
    expect(updated.rows[0].type).toBe("investment");

    await pool.query("DELETE FROM spend_tags WHERE id = $1", [tagId]);
  });
});

describe("fn_type_summary", () => {
  it("sums to the same total out as fixed paid + daily total, and follows the tag's current type", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Type Summary Expense', NULL, '#000000', 1000, '2026-01-01', 'need') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;
    await pool.query("SELECT create_payment($1, $2, '2026-05-10', 1000, NULL)", [userId, expenseId]);

    const tagResult = await pool.query(
      "SELECT create_spend_tag($1, 'Type Summary Tag', '#00ff00', 'want') AS result",
      [userId]
    );
    const tagId = tagResult.rows[0].result.id;
    await pool.query("SELECT add_spend($1, '2026-05-15', 200, $2, 'upi', NULL)", [userId, tagId]);

    const monthRows = (
      await pool.query("SELECT * FROM fn_type_summary($1, 2026, 5)", [userId])
    ).rows;
    const totalByQuery = monthRows.reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const monthSummary = (
      await pool.query("SELECT fn_month_summary($1, 2026, 5) AS data", [userId])
    ).rows[0].data;
    expect(totalByQuery).toBeCloseTo(Number(monthSummary.totals.totalOut), 2);

    const tagRow = monthRows.find((r: any) => r.item_id === tagId);
    expect(tagRow.type).toBe("want");

    // Retag the spend's tag as 'investment' — the spend should follow it
    // without touching the spend itself.
    await pool.query("SELECT update_spend_tag($1, $2, NULL, NULL, 'investment')", [userId, tagId]);
    const afterRetag = (
      await pool.query("SELECT * FROM fn_type_summary($1, 2026, 5)", [userId])
    ).rows.find((r: any) => r.item_id === tagId);
    expect(afterRetag.type).toBe("investment");

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
    await pool.query("DELETE FROM spends WHERE user_id = $1 AND spent_on = '2026-05-15'", [userId]);
    await pool.query("DELETE FROM spend_tags WHERE id = $1", [tagId]);
  });

  it("omits zero amounts and covers year-to-date when month is null", async () => {
    const rows = (await pool.query("SELECT * FROM fn_type_summary($1, 2026, NULL)", [userId])).rows;
    expect(rows.every((r: any) => Number(r.amount) > 0)).toBe(true);
  });
});
