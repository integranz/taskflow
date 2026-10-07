import { hashPassword, verifyPassword } from "../auth/password.js";
import { issueSession, requireUser } from "../auth/session.js";
import type { User } from "../db/store.js";
import { readJson, send, sendEmpty, type RouteContext } from "../http.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email)) return null;
  return email;
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH;
}

function publicUser(record: User): User {
  return { id: record.id, email: record.email, createdAt: record.createdAt };
}

/** Handles `/auth/*`. Returns false when no route matched. */
export async function handleAuth(ctx: RouteContext): Promise<boolean> {
  const { method, pathname, req, res, store } = ctx;

  if (method === "POST" && pathname === "/auth/register") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    if (!email) {
      send(res, 400, { error: "email is invalid" });
      return true;
    }
    const password = body.password;
    if (!validPassword(password)) {
      send(res, 400, { error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return true;
    }
    const user = await store.createUser(email, await hashPassword(password));
    if (!user) {
      send(res, 409, { error: "email already registered" });
      return true;
    }
    const session = await issueSession(store, user.id);
    send(res, 201, { user, ...session });
    return true;
  }

  if (method === "POST" && pathname === "/auth/login") {
    const body = await readJson(req);
    const password = body.password;
    if (typeof body.email !== "string" || typeof password !== "string") {
      send(res, 400, { error: "email and password are required" });
      return true;
    }
    const record = await store.getUserByEmail(body.email.trim().toLowerCase());
    const ok = record ? await verifyPassword(password, record.passwordHash) : false;
    if (!record || !ok) {
      send(res, 401, { error: "invalid credentials" });
      return true;
    }
    const session = await issueSession(store, record.id);
    send(res, 200, { user: publicUser(record), ...session });
    return true;
  }

  if (method === "POST" && pathname === "/auth/logout") {
    const { tokenHash } = await requireUser(store, req);
    await store.deleteSession(tokenHash);
    sendEmpty(res);
    return true;
  }

  if (method === "GET" && pathname === "/auth/me") {
    const { user } = await requireUser(store, req);
    send(res, 200, { user });
    return true;
  }

  if (method === "PATCH" && pathname === "/auth/password") {
    const { user, tokenHash } = await requireUser(store, req);
    const body = await readJson(req);
    const currentPassword = body.currentPassword;
    if (typeof currentPassword !== "string") {
      send(res, 400, { error: "currentPassword is required" });
      return true;
    }
    const newPassword = body.newPassword;
    if (!validPassword(newPassword)) {
      send(res, 400, { error: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return true;
    }
    const record = await store.getUserById(user.id);
    if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) {
      send(res, 400, { error: "current password is incorrect" });
      return true;
    }
    await store.updateUserPassword(user.id, await hashPassword(newPassword));
    // Keep the session that made the change; sign out everything else.
    await store.deleteUserSessions(user.id, tokenHash);
    sendEmpty(res);
    return true;
  }

  return false;
}
