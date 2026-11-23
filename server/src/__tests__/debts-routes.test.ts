import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "../app.js";
import { pool } from "../db.js";

const email = `debts-routes-test-${Date.now()}@example.com`;
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

describe("debts + debt-repayments routes", () => {
  let debtId: string;
  let repaymentId: string;

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/debts");
    expect(res.status).toBe(401);
  });

  it("creates a debt", async () => {
    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", cookie)
      .send({ personName: "Rahul", direction: "owed_to_me", principal: 5000, note: "Trip split" });
    expect(res.status).toBe(201);
    debtId = res.body.id;
  });

  it("rejects invalid debt input", async () => {
    const res = await request(app)
      .post("/api/debts")
      .set("Cookie", cookie)
      .send({ personName: "", direction: "bogus", principal: -1 });
    expect(res.status).toBe(400);
  });

  it("lists debts with computed remaining and status", async () => {
    const res = await request(app).get("/api/debts").set("Cookie", cookie);
    expect(res.status).toBe(200);
    const debt = res.body.find((d: any) => d.id === debtId);
    expect(debt.remaining).toBe(5000);
    expect(debt.status).toBe("open");
  });

  it("updates a debt", async () => {
    const res = await request(app)
      .patch(`/api/debts/${debtId}`)
      .set("Cookie", cookie)
      .send({ principal: 6000 });
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/debts").set("Cookie", cookie);
    expect(list.body.find((d: any) => d.id === debtId).remaining).toBe(6000);
  });

  it("adds a repayment and reflects it in the debt list", async () => {
    const res = await request(app)
      .post("/api/debt-repayments")
      .set("Cookie", cookie)
      .send({ debtId, paidOn: "2026-11-01", amount: 2000, note: "First installment" });
    expect(res.status).toBe(201);
    repaymentId = res.body.id;

    const list = await request(app).get("/api/debts").set("Cookie", cookie);
    const debt = list.body.find((d: any) => d.id === debtId);
    expect(debt.repaid).toBe(2000);
    expect(debt.remaining).toBe(4000);
  });

  it("lists repayments for a debt", async () => {
    const res = await request(app).get(`/api/debt-repayments?debt_id=${debtId}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("updates a repayment", async () => {
    const res = await request(app)
      .patch(`/api/debt-repayments/${repaymentId}`)
      .set("Cookie", cookie)
      .send({ amount: 2500 });
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/debts").set("Cookie", cookie);
    expect(list.body.find((d: any) => d.id === debtId).repaid).toBe(2500);
  });

  it("deletes a repayment", async () => {
    const res = await request(app).delete(`/api/debt-repayments/${repaymentId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("404s deleting an already-deleted repayment", async () => {
    const res = await request(app).delete(`/api/debt-repayments/${repaymentId}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("deletes the debt", async () => {
    const res = await request(app).delete(`/api/debts/${debtId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("404s deleting an already-deleted debt", async () => {
    const res = await request(app).delete(`/api/debts/${debtId}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});
