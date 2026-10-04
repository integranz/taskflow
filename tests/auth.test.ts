import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { auth, patchJson, postJson, registerUser, type TestUser } from "./helpers.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

type AuthBody = { user: TestUser; token: string; expiresAt: string };

describe("auth", () => {
  const server = createApp(createPgStore(pool));
  let base = "";

  beforeEach(async () => {
    base = await listen(server);
  });

  afterEach(() => {
    server.close();
  });

  it("registers a user and returns a session", async () => {
    const res = await postJson(base, "/auth/register", { email: "  New@Example.COM ", password: "password123" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as AuthBody;
    expect(body.user.email).toBe("new@example.com");
    expect(body.user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(body.token.length).toBeGreaterThan(20);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a duplicate email regardless of case", async () => {
    await registerUser(base, "dup@example.com");
    const res = await postJson(base, "/auth/register", { email: "DUP@example.com", password: "password123" });
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "email already registered" });
  });

  it("validates registration input", async () => {
    const badEmail = await postJson(base, "/auth/register", { email: "not-an-email", password: "password123" });
    expect(badEmail.status).toBe(400);
    await expect(badEmail.json()).resolves.toEqual({ error: "email is invalid" });

    const shortPassword = await postJson(base, "/auth/register", { email: "ok@example.com", password: "short" });
    expect(shortPassword.status).toBe(400);
    await expect(shortPassword.json()).resolves.toEqual({ error: "password must be at least 8 characters" });

    const malformed = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad",
    });
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "invalid json" });
  });

  it("logs in with the right password only", async () => {
    await registerUser(base, "login@example.com", "password123");

    const ok = await postJson(base, "/auth/login", { email: "Login@Example.com", password: "password123" });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as AuthBody;
    expect(body.user.email).toBe("login@example.com");
    expect(typeof body.token).toBe("string");

    const wrong = await postJson(base, "/auth/login", { email: "login@example.com", password: "password124" });
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "invalid credentials" });

    const unknown = await postJson(base, "/auth/login", { email: "nobody@example.com", password: "password123" });
    expect(unknown.status).toBe(401);

    const missing = await postJson(base, "/auth/login", { email: "login@example.com" });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "email and password are required" });
  });

  it("returns the current user for a valid token only", async () => {
    const { token, user } = await registerUser(base, "me@example.com");

    const me = await fetch(`${base}/auth/me`, { headers: auth(token) });
    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toEqual({ user });

    const noHeader = await fetch(`${base}/auth/me`);
    expect(noHeader.status).toBe(401);
    await expect(noHeader.json()).resolves.toEqual({ error: "unauthorized" });

    const garbage = await fetch(`${base}/auth/me`, { headers: auth("garbage") });
    expect(garbage.status).toBe(401);
  });

  it("revokes the session on logout", async () => {
    const { token } = await registerUser(base, "bye@example.com");

    const out = await fetch(`${base}/auth/logout`, { method: "POST", headers: auth(token) });
    expect(out.status).toBe(204);

    const me = await fetch(`${base}/auth/me`, { headers: auth(token) });
    expect(me.status).toBe(401);

    const again = await fetch(`${base}/auth/logout`, { method: "POST", headers: auth(token) });
    expect(again.status).toBe(401);
  });

  it("keeps the current session and revokes the others when the password changes", async () => {
    const { token: current } = await registerUser(base, "pw@example.com", "password123");
    const login = await postJson(base, "/auth/login", { email: "pw@example.com", password: "password123" });
    const { token: other } = (await login.json()) as AuthBody;

    const wrongCurrent = await patchJson(
      base,
      "/auth/password",
      { currentPassword: "nope-nope-nope", newPassword: "password456" },
      current,
    );
    expect(wrongCurrent.status).toBe(400);
    await expect(wrongCurrent.json()).resolves.toEqual({ error: "current password is incorrect" });

    const tooShort = await patchJson(
      base,
      "/auth/password",
      { currentPassword: "password123", newPassword: "short" },
      current,
    );
    expect(tooShort.status).toBe(400);

    const changed = await patchJson(
      base,
      "/auth/password",
      { currentPassword: "password123", newPassword: "password456" },
      current,
    );
    expect(changed.status).toBe(204);

    expect((await fetch(`${base}/auth/me`, { headers: auth(current) })).status).toBe(200);
    expect((await fetch(`${base}/auth/me`, { headers: auth(other) })).status).toBe(401);

    const oldPassword = await postJson(base, "/auth/login", { email: "pw@example.com", password: "password123" });
    expect(oldPassword.status).toBe(401);
    const newPassword = await postJson(base, "/auth/login", { email: "pw@example.com", password: "password456" });
    expect(newPassword.status).toBe(200);

    const unauthenticated = await patchJson(base, "/auth/password", {
      currentPassword: "x",
      newPassword: "password789",
    });
    expect(unauthenticated.status).toBe(401);
  });
});
