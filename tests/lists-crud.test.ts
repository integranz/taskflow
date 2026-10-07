import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { auth, createList, createTask, patchJson, postJson, registerUser, type TestTask } from "./helpers.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

describe("list and task CRUD", () => {
  const server = createApp(createPgStore(pool));
  let base = "";
  let token = "";

  beforeEach(async () => {
    base = await listen(server);
    ({ token } = await registerUser(base));
  });

  afterEach(() => {
    server.close();
  });

  it("renames a list", async () => {
    const list = await createList(base, token, "Old");

    const renamed = await patchJson(base, `/lists/${list.id}`, { name: "  New  " }, token);
    expect(renamed.status).toBe(200);
    await expect(renamed.json()).resolves.toEqual({ list: { id: list.id, name: "New" } });

    const all = await fetch(`${base}/lists`, { headers: auth(token) });
    await expect(all.json()).resolves.toEqual({ lists: [{ id: list.id, name: "New" }] });

    const empty = await patchJson(base, `/lists/${list.id}`, { name: "   " }, token);
    expect(empty.status).toBe(400);
    await expect(empty.json()).resolves.toEqual({ error: "name is required" });

    const unknown = await patchJson(base, `/lists/${UNKNOWN_ID}`, { name: "X" }, token);
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toEqual({ error: "list not found" });
  });

  it("deletes a list together with its tasks", async () => {
    const list = await createList(base, token, "Trash");
    const task = await createTask(base, token, list.id, "Gone");

    const deleted = await fetch(`${base}/lists/${list.id}`, { method: "DELETE", headers: auth(token) });
    expect(deleted.status).toBe(204);

    const detail = await fetch(`${base}/lists/${list.id}`, { headers: auth(token) });
    expect(detail.status).toBe(404);

    const remaining = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM tasks WHERE id = $1", [
      task.id,
    ]);
    expect(remaining.rows[0]?.count).toBe("0");

    const again = await fetch(`${base}/lists/${list.id}`, { method: "DELETE", headers: auth(token) });
    expect(again.status).toBe(404);
  });

  it("deletes a task", async () => {
    const list = await createList(base, token, "Work");
    const task = await createTask(base, token, list.id, "Ship");

    const deleted = await fetch(`${base}/tasks/${task.id}`, { method: "DELETE", headers: auth(token) });
    expect(deleted.status).toBe(204);

    const patched = await patchJson(base, `/tasks/${task.id}`, { done: true }, token);
    expect(patched.status).toBe(404);
    await expect(patched.json()).resolves.toEqual({ error: "task not found" });

    const detail = await fetch(`${base}/lists/${list.id}`, { headers: auth(token) });
    await expect(detail.json()).resolves.toEqual({ list, tasks: [] });

    const again = await fetch(`${base}/tasks/${task.id}`, { method: "DELETE", headers: auth(token) });
    expect(again.status).toBe(404);
  });

  it("validates task patches", async () => {
    const list = await createList(base, token, "Checks");
    const task = await createTask(base, token, list.id, "Validate", "2026-10-10");

    const badDone = await patchJson(base, `/tasks/${task.id}`, { done: "yes" }, token);
    expect(badDone.status).toBe(400);
    await expect(badDone.json()).resolves.toEqual({ error: "done must be a boolean" });

    const badDate = await patchJson(base, `/tasks/${task.id}`, { dueDate: "tomorrow" }, token);
    expect(badDate.status).toBe(400);
    await expect(badDate.json()).resolves.toEqual({ error: "dueDate must be YYYY-MM-DD" });

    const cleared = await patchJson(base, `/tasks/${task.id}`, { dueDate: null, title: "  Renamed " }, token);
    expect(cleared.status).toBe(200);
    const { task: updated } = (await cleared.json()) as { task: TestTask };
    expect(updated.title).toBe("Renamed");
    expect(updated.dueDate).toBeNull();
    expect(updated.done).toBe(false);
  });

  it("treats malformed ids as not found instead of failing", async () => {
    const list = await fetch(`${base}/lists/abc`, { headers: auth(token) });
    expect(list.status).toBe(404);
    await expect(list.json()).resolves.toEqual({ error: "list not found" });

    const rename = await patchJson(base, "/lists/abc", { name: "X" }, token);
    expect(rename.status).toBe(404);

    const deleteList = await fetch(`${base}/lists/abc`, { method: "DELETE", headers: auth(token) });
    expect(deleteList.status).toBe(404);

    const addTask = await postJson(base, "/lists/abc/tasks", { title: "X" }, token);
    expect(addTask.status).toBe(404);
    await expect(addTask.json()).resolves.toEqual({ error: "list not found" });

    const patchTask = await patchJson(base, "/tasks/abc", { done: true }, token);
    expect(patchTask.status).toBe(404);
    await expect(patchTask.json()).resolves.toEqual({ error: "task not found" });

    const deleteTask = await fetch(`${base}/tasks/abc`, { method: "DELETE", headers: auth(token) });
    expect(deleteTask.status).toBe(404);
  });
});
