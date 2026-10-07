import { request } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { MAX_BODY_BYTES } from "../src/http.js";
import { auth, createList, createTask, patchJson, postJson, registerUser, type TestTask } from "./helpers.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

const NUL_ERROR = { error: "text must not contain NUL characters" };
const DATE_ERROR = { error: "dueDate must be YYYY-MM-DD" };
const TOO_LARGE = { error: "request body too large" };

/** Sends a body with chunked transfer encoding (no Content-Length), so the server cannot reject it up front. */
function postChunked(base: string, path: string, totalBytes: number): Promise<{ status: number; body: string }> {
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: "POST", headers: { "content-type": "application/json" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    const piece = Buffer.alloc(16 * 1024, "a");
    for (let sent = 0; sent < totalBytes; sent += piece.length) req.write(piece);
    req.end();
  });
}

describe("input hardening", () => {
  const server = createApp(createPgStore(pool));
  let base = "";

  beforeEach(async () => {
    base = await listen(server);
  });

  afterEach(() => {
    server.close();
  });

  it("rejects NUL characters with 400 instead of failing in Postgres", async () => {
    const register = await postJson(base, "/auth/register", { email: "a\u0000b@example.com", password: "password123" });
    expect(register.status).toBe(400);
    await expect(register.json()).resolves.toEqual(NUL_ERROR);

    const login = await postJson(base, "/auth/login", { email: "a\u0000b@example.com", password: "password123" });
    expect(login.status).toBe(400);
    await expect(login.json()).resolves.toEqual(NUL_ERROR);

    const { token } = await registerUser(base);
    const list = await createList(base, token, "Inbox");
    const task = await createTask(base, token, list.id, "Task");

    const cases: Array<[string, Promise<Response>]> = [
      ["POST /lists", postJson(base, "/lists", { name: "a\u0000b" }, token)],
      ["PATCH /lists/:id", patchJson(base, `/lists/${list.id}`, { name: "a\u0000b" }, token)],
      ["POST /lists/:id/tasks", postJson(base, `/lists/${list.id}/tasks`, { title: "a\u0000b" }, token)],
      ["PATCH /tasks/:id", patchJson(base, `/tasks/${task.id}`, { title: "a\u0000b" }, token)],
    ];
    for (const [label, pending] of cases) {
      const res = await pending;
      expect(res.status, label).toBe(400);
      await expect(res.json()).resolves.toEqual(NUL_ERROR);
    }
  });

  it("rejects calendar dates that do not exist", async () => {
    const { token } = await registerUser(base);
    const list = await createList(base, token, "Dates");
    const task = await createTask(base, token, list.id, "Task");

    for (const dueDate of ["2026-02-30", "2026-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "0000-01-01"]) {
      const created = await postJson(base, `/lists/${list.id}/tasks`, { title: "x", dueDate }, token);
      expect(created.status, `POST ${dueDate}`).toBe(400);
      await expect(created.json()).resolves.toEqual(DATE_ERROR);

      const patched = await patchJson(base, `/tasks/${task.id}`, { dueDate }, token);
      expect(patched.status, `PATCH ${dueDate}`).toBe(400);
      await expect(patched.json()).resolves.toEqual(DATE_ERROR);
    }

    for (const dueDate of ["2028-02-29", "2000-02-29", "2026-12-31", "0001-01-01"]) {
      const created = await postJson(base, `/lists/${list.id}/tasks`, { title: dueDate, dueDate }, token);
      expect(created.status, `POST ${dueDate}`).toBe(201);
      const { task: saved } = (await created.json()) as { task: TestTask };
      expect(saved.dueDate).toBe(dueDate);
    }
  });

  it("rejects oversized bodies with 413, with or without Content-Length", async () => {
    const declared = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "x".repeat(MAX_BODY_BYTES) }),
    });
    expect(declared.status).toBe(413);
    await expect(declared.json()).resolves.toEqual(TOO_LARGE);

    const chunked = await postChunked(base, "/auth/login", MAX_BODY_BYTES * 4);
    expect(chunked.status).toBe(413);
    expect(JSON.parse(chunked.body)).toEqual(TOO_LARGE);

    const normal = await postJson(base, "/auth/register", { email: "ok@example.com", password: "password123" });
    expect(normal.status).toBe(201);
  });

  it("keeps both changes when two patches to the same task race", async () => {
    const { token } = await registerUser(base);
    const list = await createList(base, token, "Race");

    for (let round = 0; round < 15; round++) {
      const task = await createTask(base, token, list.id, `T${round}`);
      const [done, renamed] = await Promise.all([
        patchJson(base, `/tasks/${task.id}`, { done: true }, token),
        patchJson(base, `/tasks/${task.id}`, { title: `Renamed ${round}` }, token),
      ]);
      expect(done.status).toBe(200);
      expect(renamed.status).toBe(200);

      const detail = await fetch(`${base}/lists/${list.id}`, { headers: auth(token) });
      const { tasks } = (await detail.json()) as { tasks: TestTask[] };
      const saved = tasks.find((t) => t.id === task.id);
      expect(saved, `round ${round}`).toMatchObject({ done: true, title: `Renamed ${round}` });
    }
  });

  it("leaves fields that a patch does not mention unchanged", async () => {
    const { token } = await registerUser(base);
    const list = await createList(base, token, "Partial");
    const task = await createTask(base, token, list.id, "Keep me", "2026-10-10");

    const done = await patchJson(base, `/tasks/${task.id}`, { done: true }, token);
    await expect(done.json()).resolves.toEqual({ task: { ...task, done: true } });

    const cleared = await patchJson(base, `/tasks/${task.id}`, { dueDate: null }, token);
    await expect(cleared.json()).resolves.toEqual({ task: { ...task, done: true, dueDate: null } });
  });
});
