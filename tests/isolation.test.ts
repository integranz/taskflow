import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { auth, createList, createTask, patchJson, postJson, registerUser } from "./helpers.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

describe("per-user isolation", () => {
  const server = createApp(createPgStore(pool));
  let base = "";

  beforeEach(async () => {
    base = await listen(server);
  });

  afterEach(() => {
    server.close();
  });

  it("hides one user's lists and tasks from another user", async () => {
    const a = await registerUser(base, "a@example.com");
    const b = await registerUser(base, "b@example.com");
    const list = await createList(base, a.token, "A's list");
    const task = await createTask(base, a.token, list.id, "A's task");

    const bLists = await fetch(`${base}/lists`, { headers: auth(b.token) });
    expect(bLists.status).toBe(200);
    await expect(bLists.json()).resolves.toEqual({ lists: [] });

    expect((await fetch(`${base}/lists/${list.id}`, { headers: auth(b.token) })).status).toBe(404);
    expect((await patchJson(base, `/lists/${list.id}`, { name: "Mine now" }, b.token)).status).toBe(404);
    expect((await fetch(`${base}/lists/${list.id}`, { method: "DELETE", headers: auth(b.token) })).status).toBe(404);
    expect((await postJson(base, `/lists/${list.id}/tasks`, { title: "Intruder" }, b.token)).status).toBe(404);
    expect((await patchJson(base, `/tasks/${task.id}`, { done: true }, b.token)).status).toBe(404);
    expect((await fetch(`${base}/tasks/${task.id}`, { method: "DELETE", headers: auth(b.token) })).status).toBe(404);

    const aDetail = await fetch(`${base}/lists/${list.id}`, { headers: auth(a.token) });
    expect(aDetail.status).toBe(200);
    await expect(aDetail.json()).resolves.toEqual({ list, tasks: [task] });
  });
});
