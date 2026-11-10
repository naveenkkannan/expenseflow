import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE_NAME, verifySession } from "./jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Not logged in" } });
    return;
  }

  try {
    const payload = verifySession(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: { code: "unauthenticated", message: "Invalid or expired session" } });
  }
}
