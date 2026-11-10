import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "../app.js";
import { pool } from "../db.js";

const email = `auth-test-${Date.now()}@example.com`;
const password = "correct-horse-battery-staple";
let userId: string;

beforeAll(async () => {
  const hash = await argon2.hash(password);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, hash]
  );
  userId = result.rows[0].id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe("auth flow", () => {
  it("rejects /me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthenticated");
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects login for unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password });
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials and sets a cookie", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("allows /me with a valid session cookie, and protected routes work", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"];

    const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);

    const dashboardRes = await request(app)
      .get("/api/dashboard?year=2026&month=11")
      .set("Cookie", cookie);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.summary).toBeDefined();
  });

  it("rejects protected routes without a session", async () => {
    const res = await request(app).get("/api/dashboard?year=2026&month=11");
    expect(res.status).toBe(401);
  });

  it("logs out and clears the session", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"];

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);
  });
});
