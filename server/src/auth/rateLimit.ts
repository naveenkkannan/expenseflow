import rateLimit from "express-rate-limit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const failedAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

function keyFor(req: { ip?: string; body?: { email?: string } }): string {
  return `${req.ip ?? "unknown"}:${req.body?.email ?? "unknown"}`;
}

export function isLockedOut(req: { ip?: string; body?: { email?: string } }): boolean {
  const entry = failedAttempts.get(keyFor(req));
  if (!entry?.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    failedAttempts.delete(keyFor(req));
    return false;
  }
  return true;
}

export function recordFailedAttempt(req: { ip?: string; body?: { email?: string } }): void {
  const key = keyFor(req);
  const entry = failedAttempts.get(key) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  failedAttempts.set(key, entry);
}

export function clearFailedAttempts(req: { ip?: string; body?: { email?: string } }): void {
  failedAttempts.delete(keyFor(req));
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many requests, try again later" } },
});
