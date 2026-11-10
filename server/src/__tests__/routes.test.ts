import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "../app.js";
import { pool } from "../db.js";

const email = `routes-test-${Date.now()}@example.com`;
const password = "correct-horse-battery-staple";
let userId: string;
let cookie: string;

beforeAll(async () => {
  const hash = await argon2.hash(password);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, hash]
  );
  userId = result.rows[0].id;

  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  cookie = loginRes.headers["set-cookie"];
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("groups + expenses + payments routes", () => {
  let groupId: string;
  let expenseId: string;
  let paymentId: string;

  it("creates a group", async () => {
    const res = await request(app)
      .post("/api/groups")
      .set("Cookie", cookie)
      .send({ name: "Test Group" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Group");
    groupId = res.body.id;
  });

  it("lists groups", async () => {
    const res = await request(app).get("/api/groups").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((g: any) => g.id === groupId)).toBe(true);
  });

  it("creates an expense in that group", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Cookie", cookie)
      .send({
        name: "Test Expense",
        groupId,
        color: "#ff0000",
        amount: 500,
        activeFrom: "2026-01-01",
      });
    expect(res.status).toBe(201);
    expenseId = res.body.id;
  });

  it("rejects invalid expense input", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Cookie", cookie)
      .send({ name: "", color: "notacolor", amount: -1 });
    expect(res.status).toBe(400);
  });

  it("gets the expense grid for the year", async () => {
    const res = await request(app).get("/api/expenses?year=2026").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.expenses.some((e: any) => e.id === expenseId)).toBe(true);
  });

  it("updates the expense amount from a chosen month", async () => {
    const res = await request(app)
      .patch(`/api/expenses/${expenseId}`)
      .set("Cookie", cookie)
      .send({ amount: 700, amountFrom: "2026-03-01" });
    expect(res.status).toBe(200);
  });

  it("creates a payment for the expense", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Cookie", cookie)
      .send({ expenseId, paidOn: "2026-01-15", amount: 500, note: "First payment" });
    expect(res.status).toBe(201);
    paymentId = res.body.id;
  });

  it("lists payments for the expense", async () => {
    const res = await request(app)
      .get(`/api/payments?expense_id=${expenseId}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("updates a payment", async () => {
    const res = await request(app)
      .patch(`/api/payments/${paymentId}`)
      .set("Cookie", cookie)
      .send({ amount: 550 });
    expect(res.status).toBe(200);
  });

  it("deletes a payment", async () => {
    const res = await request(app).delete(`/api/payments/${paymentId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("404s deleting an already-deleted payment", async () => {
    const res = await request(app).delete(`/api/payments/${paymentId}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("deletes the expense", async () => {
    const res = await request(app).delete(`/api/expenses/${expenseId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("un-groups expenses and deletes the group", async () => {
    const res = await request(app).delete(`/api/groups/${groupId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });
});
