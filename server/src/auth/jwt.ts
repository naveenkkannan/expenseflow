import jwt from "jsonwebtoken";

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
})();

export interface SessionPayload {
  userId: string;
  email: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, JWT_SECRET) as SessionPayload;
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;
