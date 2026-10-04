import { createHash, randomBytes } from "node:crypto";

const DAY_MS = 86_400_000;
const DEFAULT_TTL_DAYS = 30;

/** Opaque session token handed to the client once. Only its hash is stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionTtlMs(): number {
  const days = Number(process.env.SESSION_TTL_DAYS ?? DEFAULT_TTL_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS) * DAY_MS;
}

export function sessionExpiry(now = Date.now()): Date {
  return new Date(now + sessionTtlMs());
}
