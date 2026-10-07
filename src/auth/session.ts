import type { IncomingMessage } from "node:http";
import type { Store, User } from "../db/store.js";
import { HttpError } from "../http.js";
import { generateToken, hashToken, sessionExpiry } from "./token.js";

export type IssuedSession = { token: string; expiresAt: string };
export type AuthenticatedRequest = { user: User; tokenHash: string };

export function readBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export async function issueSession(store: Store, userId: string): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = sessionExpiry();
  await store.createSession(userId, hashToken(token), expiresAt);
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Resolves the caller from the Bearer token or throws 401. */
export async function requireUser(store: Store, req: IncomingMessage): Promise<AuthenticatedRequest> {
  const token = readBearer(req);
  if (!token) throw new HttpError(401, "unauthorized");
  const tokenHash = hashToken(token);
  const user = await store.getSessionUser(tokenHash);
  if (!user) throw new HttpError(401, "unauthorized");
  return { user, tokenHash };
}
