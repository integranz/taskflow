import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { auth, patchJson, postJson, registerUser, type TestList, type TestTask } from "./helpers.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

describe("lists and tasks", () => {
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

  it("persists a list and task in postgres", async () => {
    const createdList = await postJson(base, "/lists", { name: "Inbox" }, token);
    expect(createdList.status).toBe(201);
    const { list } = (await createdList.json()) as { list: TestList };
    expect(list.name).toBe("Inbox");

    const createdTask = await postJson(
      base,
      `/lists/${list.id}/tasks`,
      { title: "Write ADR", dueDate: "2026-09-18" },
      token,
    );
    expect(createdTask.status).toBe(201);
    const { task } = (await createdTask.json()) as { task: TestTask };
    expect(task.title).toBe("Write ADR");
    expect(task.listId).toBe(list.id);
    expect(task.dueDate).toBe("2026-09-18");
    expect(task.done).toBe(false);

    const listed = await fetch(`${base}/lists`, { headers: auth(token) });
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toEqual({ lists: [list] });

    const detail = await fetch(`${base}/lists/${list.id}`, { headers: auth(token) });
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual({ list, tasks: [task] });

    const patched = await patchJson(base, `/tasks/${task.id}`, { done: true }, token);
    expect(patched.status).toBe(200);
    const { task: updated } = (await patched.json()) as { task: TestTask };
    expect(updated.done).toBe(true);

    const missing = await fetch(`${base}/lists/00000000-0000-0000-0000-000000000000`, { headers: auth(token) });
    expect(missing.status).toBe(404);
  });

  it("requires a session", async () => {
    const res = await fetch(`${base}/lists`);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("rejects a non-string name", async () => {
    const res = await postJson(base, "/lists", { name: 123 }, token);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "name is required" });
  });
});
