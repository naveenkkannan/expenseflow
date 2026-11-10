import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool } from "../db.js";

let userId: string;

beforeAll(async () => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
    [`test-${Date.now()}@example.com`]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("expense_status", () => {
  const call = async (
    activeFrom: string,
    activeTo: string | null,
    month: string,
    currentMonth: string,
    planned: number,
    paid: number
  ) => {
    const result = await pool.query(
      "SELECT expense_status($1, $2, $3, $4, $5, $6) AS status",
      [activeFrom, activeTo, month, currentMonth, planned, paid]
    );
    return result.rows[0].status as string;
  };

  it("is not_active before the expense starts", async () => {
    expect(
      await call("2026-03-01", null, "2026-01-01", "2026-02-01", 100, 0)
    ).toBe("not_active");
  });

  it("is not_active after the expense ends", async () => {
    expect(
      await call("2026-01-01", "2026-03-01", "2026-04-01", "2026-05-01", 100, 0)
    ).toBe("not_active");
  });

  it("is upcoming for an active future month", async () => {
    expect(
      await call("2026-01-01", null, "2026-05-01", "2026-02-01", 100, 0)
    ).toBe("upcoming");
  });

  it("is paid when paid covers planned", async () => {
    expect(
      await call("2026-01-01", null, "2026-02-01", "2026-02-01", 100, 100)
    ).toBe("paid");
    expect(
      await call("2026-01-01", null, "2026-02-01", "2026-02-01", 100, 150)
    ).toBe("paid");
  });

  it("is partial when 0 < paid < planned", async () => {
    expect(
      await call("2026-01-01", null, "2026-02-01", "2026-02-01", 100, 40)
    ).toBe("partial");
  });

  it("is missed for a past month with nothing paid", async () => {
    expect(
      await call("2026-01-01", null, "2026-01-01", "2026-03-01", 100, 0)
    ).toBe("missed");
  });

  it("is to_pay for the current month with nothing paid", async () => {
    expect(
      await call("2026-01-01", null, "2026-03-01", "2026-03-01", 100, 0)
    ).toBe("to_pay");
  });

  it("partial takes precedence over missed in a past month", async () => {
    expect(
      await call("2026-01-01", null, "2026-01-01", "2026-03-01", 100, 50)
    ).toBe("partial");
  });
});

describe("set_expense_amount", () => {
  it("applies a new amount only from the chosen month, keeping earlier months", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Test Expense', NULL, '#000000', 1000, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;

    await pool.query("SELECT set_expense_amount($1, $2, '2026-04-01', 1500)", [
      userId,
      expenseId,
    ]);

    const jan = await pool.query(
      "SELECT expense_amount_at($1, '2026-01-01') AS amount",
      [expenseId]
    );
    const mar = await pool.query(
      "SELECT expense_amount_at($1, '2026-03-01') AS amount",
      [expenseId]
    );
    const apr = await pool.query(
      "SELECT expense_amount_at($1, '2026-04-01') AS amount",
      [expenseId]
    );
    const jun = await pool.query(
      "SELECT expense_amount_at($1, '2026-06-01') AS amount",
      [expenseId]
    );

    expect(Number(jan.rows[0].amount)).toBe(1000);
    expect(Number(mar.rows[0].amount)).toBe(1000);
    expect(Number(apr.rows[0].amount)).toBe(1500);
    expect(Number(jun.rows[0].amount)).toBe(1500);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("supports multiple amount changes applied in any order", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Multi Amount', NULL, '#000000', 500, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;

    await pool.query("SELECT set_expense_amount($1, $2, '2026-07-01', 800)", [
      userId,
      expenseId,
    ]);
    await pool.query("SELECT set_expense_amount($1, $2, '2026-04-01', 650)", [
      userId,
      expenseId,
    ]);

    const feb = await pool.query(
      "SELECT expense_amount_at($1, '2026-02-01') AS amount",
      [expenseId]
    );
    const may = await pool.query(
      "SELECT expense_amount_at($1, '2026-05-01') AS amount",
      [expenseId]
    );
    const aug = await pool.query(
      "SELECT expense_amount_at($1, '2026-08-01') AS amount",
      [expenseId]
    );

    expect(Number(feb.rows[0].amount)).toBe(500);
    expect(Number(may.rows[0].amount)).toBe(650);
    expect(Number(aug.rows[0].amount)).toBe(800);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });

  it("overwrites the amount if set twice for the same month", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Overwrite', NULL, '#000000', 200, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;

    await pool.query("SELECT set_expense_amount($1, $2, '2026-01-01', 250)", [
      userId,
      expenseId,
    ]);

    const jan = await pool.query(
      "SELECT expense_amount_at($1, '2026-01-01') AS amount",
      [expenseId]
    );
    expect(Number(jan.rows[0].amount)).toBe(250);

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });
});

describe("get_expense_grid status integration", () => {
  it("reflects paid/partial/missed/upcoming status per month", async () => {
    const expenseResult = await pool.query(
      "SELECT create_expense($1, 'Grid Test', NULL, '#000000', 1000, '2026-01-01') AS result",
      [userId]
    );
    const expenseId = expenseResult.rows[0].result.id;

    await pool.query(
      "SELECT create_payment($1, $2, '2026-01-15', 1000, NULL)",
      [userId, expenseId]
    );
    await pool.query(
      "SELECT create_payment($1, $2, '2026-02-10', 400, NULL)",
      [userId, expenseId]
    );

    const gridResult = await pool.query(
      "SELECT get_expense_grid($1, 2026) AS grid",
      [userId]
    );
    const grid = gridResult.rows[0].grid;
    const expense = grid.expenses.find((e: any) => e.id === expenseId);
    const months: Record<string, any> = {};
    for (const m of expense.months) {
      months[m.month] = m;
    }

    expect(months["2026-01-01"].status).toBe("paid");
    expect(months["2026-02-01"].status).toBe("partial");

    await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  });
});
