import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

describe("lists and tasks", () => {
  const server = createApp(createPgStore(pool));

  afterEach(() => {
    server.close();
  });

  it("persists a list and task in postgres", async () => {
    const base = await listen(server);

    const createdList = await fetch(`${base}/lists`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Inbox" }),
    });
    expect(createdList.status).toBe(201);
    const { list } = (await createdList.json()) as { list: { id: string; name: string } };
    expect(list.name).toBe("Inbox");

    const createdTask = await fetch(`${base}/lists/${list.id}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Write ADR", dueDate: "2026-09-18" }),
    });
    expect(createdTask.status).toBe(201);
    const { task } = (await createdTask.json()) as {
      task: { id: string; title: string; listId: string; dueDate: string | null; done: boolean };
    };
    expect(task.title).toBe("Write ADR");
    expect(task.listId).toBe(list.id);
    expect(task.dueDate).toBe("2026-09-18");
    expect(task.done).toBe(false);

    const listed = await fetch(`${base}/lists`);
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toEqual({ lists: [list] });

    const detail = await fetch(`${base}/lists/${list.id}`);
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual({ list, tasks: [task] });

    const patched = await fetch(`${base}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    expect(patched.status).toBe(200);
    const { task: updated } = (await patched.json()) as { task: { done: boolean } };
    expect(updated.done).toBe(true);

    const missing = await fetch(`${base}/lists/00000000-0000-0000-0000-000000000000`);
    expect(missing.status).toBe(404);
  });
});
