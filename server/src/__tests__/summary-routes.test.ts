import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "../app.js";
import { pool } from "../db.js";

const email = `summary-routes-test-${Date.now()}@example.com`;
const password = "correct-horse-battery-staple";
let userId: string;
let cookie: string;
let expenseId: string;

beforeAll(async () => {
  const hash = await argon2.hash(password);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, hash]
  );
  userId = result.rows[0].id;

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  cookie = loginRes.headers["set-cookie"];

  const expenseResult = await pool.query(
    "SELECT create_expense($1, 'Summary Route Expense', NULL, '#000000', 500, '2026-01-01') AS result",
    [userId]
  );
  expenseId = expenseResult.rows[0].result.id;
  await pool.query("SELECT create_payment($1, $2, '2026-03-15', 500, NULL)", [userId, expenseId]);
  await pool.query("SELECT add_spend($1, '2026-03-20', 75, NULL, 'upi', NULL)", [userId]);
});

afterAll(async () => {
  await pool.query("DELETE FROM expenses WHERE id = $1", [expenseId]);
  await pool.query("DELETE FROM spends WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("summary routes", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/summary/year?year=2026");
    expect(res.status).toBe(401);
  });

  it("gets the year summary", async () => {
    const res = await request(app).get("/api/summary/year?year=2026").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2026);
    expect(res.body.months).toHaveLength(12);
    const expenseRow = res.body.fixed.find((f: any) => f.id === expenseId);
    expect(expenseRow.values[2]).toBe(500);
  });

  it("rejects an invalid year", async () => {
    const res = await request(app).get("/api/summary/year?year=abc").set("Cookie", cookie);
    expect(res.status).toBe(400);
  });

  it("gets the month summary", async () => {
    const res = await request(app).get("/api/summary/month?year=2026&month=3").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.fixed.some((f: any) => f.expenseId === expenseId)).toBe(true);
    expect(Number(res.body.totals.totalOut)).toBe(575);
  });

  it("downloads the year CSV with a BOM and no currency symbols", async () => {
    const res = await request(app).get("/api/summary/year.csv?year=2026").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("expense-flow-2026.csv");
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(res.text).not.toContain("₹");
  });

  it("downloads the month CSV", async () => {
    const res = await request(app).get("/api/summary/month.csv?year=2026&month=3").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("expense-flow-2026-03.csv");
    expect(res.text).toContain("Summary Route Expense");
  });
});
