import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { pool } from "../db.js";
import {
  signSession,
  verifySession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_MS,
} from "../auth/jwt.js";
import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  loginRateLimiter,
} from "../auth/rateLimit.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_COOKIE_MAX_AGE_MS,
};

router.post("/login", loginRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_input", message: "Invalid email or password" } });
    return;
  }

  if (isLockedOut(req)) {
    res.status(429).json({
      error: { code: "locked_out", message: "Too many failed attempts. Try again later." },
    });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );

  if (result.rowCount === 0) {
    recordFailedAttempt(req);
    res.status(401).json({ error: { code: "invalid_credentials", message: "Invalid email or password" } });
    return;
  }

  const user = result.rows[0];
  const valid = await argon2.verify(user.password_hash, password);

  if (!valid) {
    recordFailedAttempt(req);
    res.status(401).json({ error: { code: "invalid_credentials", message: "Invalid email or password" } });
    return;
  }

  clearFailedAttempts(req);
  const token = signSession({ userId: user.id, email: user.email });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({ id: user.id, email: user.email });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Not logged in" } });
    return;
  }

  try {
    const payload = verifySession(token);
    const freshToken = signSession({ userId: payload.userId, email: payload.email });
    res.cookie(SESSION_COOKIE_NAME, freshToken, cookieOptions);
    res.json({ id: payload.userId, email: payload.email });
  } catch {
    res.status(401).json({ error: { code: "unauthenticated", message: "Invalid or expired session" } });
  }
});

export default router;
