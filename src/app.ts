import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Store } from "./db/store.js";

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function invalidDueDate(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || !DATE.test(value);
}

export function createApp(store: Store) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const method = req.method ?? "GET";
      const pathname = url.pathname;

      if (method === "GET" && pathname === "/health") {
        await store.ping();
        send(res, 200, { status: "ok" });
        return;
      }

      if (method === "GET" && pathname === "/lists") {
        send(res, 200, { lists: await store.listLists() });
        return;
      }

      if (method === "POST" && pathname === "/lists") {
        const body = (await readJson(req)) as { name?: string };
        if (!body.name?.trim()) {
          send(res, 400, { error: "name is required" });
          return;
        }
        const list = await store.createList(body.name.trim());
        send(res, 201, { list });
        return;
      }

      const listMatch = pathname.match(/^\/lists\/([^/]+)$/);
      if (method === "GET" && listMatch) {
        const list = await store.getList(listMatch[1] ?? "");
        if (!list) {
          send(res, 404, { error: "list not found" });
          return;
        }
        const tasks = await store.listTasks(list.id);
        send(res, 200, { list, tasks });
        return;
      }

      const tasksMatch = pathname.match(/^\/lists\/([^/]+)\/tasks$/);
      if (method === "POST" && tasksMatch) {
        const listId = tasksMatch[1] ?? "";
        const body = (await readJson(req)) as { title?: string; dueDate?: string | null };
        if (!body.title?.trim()) {
          send(res, 400, { error: "title is required" });
          return;
        }
        if (invalidDueDate(body.dueDate)) {
          send(res, 400, { error: "dueDate must be YYYY-MM-DD" });
          return;
        }
        const task = await store.createTask(listId, body.title.trim(), body.dueDate ?? null);
        if (!task) {
          send(res, 404, { error: "list not found" });
          return;
        }
        send(res, 201, { task });
        return;
      }

      const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (method === "PATCH" && taskMatch) {
        const body = (await readJson(req)) as {
          title?: string;
          dueDate?: string | null;
          done?: boolean;
        };
        if (invalidDueDate(body.dueDate)) {
          send(res, 400, { error: "dueDate must be YYYY-MM-DD" });
          return;
        }
        const task = await store.updateTask(taskMatch[1] ?? "", {
          title: body.title?.trim() ? body.title.trim() : undefined,
          dueDate: body.dueDate,
          done: body.done,
        });
        if (!task) {
          send(res, 404, { error: "task not found" });
          return;
        }
        send(res, 200, { task });
        return;
      }

      send(res, 404, { error: "not found" });
    } catch {
      send(res, 500, { error: "internal error" });
    }
  });
}

export type { List, Task } from "./db/store.js";
