import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "../app.js";
import { pool } from "../db.js";

const email = `daily-routes-test-${Date.now()}@example.com`;
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

describe("spend-tags + spends + daily routes", () => {
  let tagId: string;
  let spendId: string;

  it("creates a spend tag", async () => {
    const res = await request(app)
      .post("/api/spend-tags")
      .set("Cookie", cookie)
      .send({ name: "Groceries", color: "#16a34a" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Groceries");
    tagId = res.body.id;
  });

  it("rejects a duplicate tag name", async () => {
    const res = await request(app)
      .post("/api/spend-tags")
      .set("Cookie", cookie)
      .send({ name: "groceries", color: "#000000" });
    expect(res.status).toBe(409);
  });

  it("lists spend tags", async () => {
    const res = await request(app).get("/api/spend-tags").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((t: any) => t.id === tagId)).toBe(true);
  });

  it("renames a spend tag", async () => {
    const res = await request(app)
      .patch(`/api/spend-tags/${tagId}`)
      .set("Cookie", cookie)
      .send({ name: "Food" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Food");
  });

  it("creates a spend", async () => {
    const res = await request(app)
      .post("/api/spends")
      .set("Cookie", cookie)
      .send({ spentOn: "2026-11-03", amount: 120, tagId, paymentMethod: "upi", note: "Lunch" });
    expect(res.status).toBe(201);
    spendId = res.body.id;
  });

  it("rejects invalid spend input", async () => {
    const res = await request(app)
      .post("/api/spends")
      .set("Cookie", cookie)
      .send({ spentOn: "2026-11-03", amount: -1, paymentMethod: "upi" });
    expect(res.status).toBe(400);
  });

  it("gets the daily month view", async () => {
    const res = await request(app)
      .get("/api/daily?year=2026&month=11")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Number(res.body.total)).toBeGreaterThanOrEqual(120);
  });

  it("filters the daily month view by tag", async () => {
    const res = await request(app)
      .get(`/api/daily?year=2026&month=11&tag_id=${tagId}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.days.every((d: any) => d.entries.every((e: any) => e.tagId === tagId))).toBe(true);
  });

  it("gets spend suggestions", async () => {
    const res = await request(app).get("/api/daily/suggestions").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("updates a spend", async () => {
    const res = await request(app)
      .patch(`/api/spends/${spendId}`)
      .set("Cookie", cookie)
      .send({ amount: 150, tagId: null });
    expect(res.status).toBe(200);
  });

  it("deletes a spend", async () => {
    const res = await request(app).delete(`/api/spends/${spendId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("404s deleting an already-deleted spend", async () => {
    const res = await request(app).delete(`/api/spends/${spendId}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("deletes the spend tag", async () => {
    const res = await request(app).delete(`/api/spend-tags/${tagId}`).set("Cookie", cookie);
    expect(res.status).toBe(204);
  });
});
