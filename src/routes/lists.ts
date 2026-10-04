import { requireUser } from "../auth/session.js";
import { invalidDueDate, isUuid, optionalString, readJson, send, sendEmpty, type RouteContext } from "../http.js";

const LIST_NOT_FOUND = { error: "list not found" };
const TASK_NOT_FOUND = { error: "task not found" };

/** Handles `/lists*` and `/tasks/*`. Every route needs a session. Returns false when no route matched. */
export async function handleLists(ctx: RouteContext): Promise<boolean> {
  const { method, pathname, req, res, store } = ctx;
  const { user } = await requireUser(store, req);

  if (method === "GET" && pathname === "/lists") {
    send(res, 200, { lists: await store.listLists(user.id) });
    return true;
  }

  if (method === "POST" && pathname === "/lists") {
    const body = await readJson(req);
    const name = optionalString(body.name);
    if (!name) {
      send(res, 400, { error: "name is required" });
      return true;
    }
    const list = await store.createList(user.id, name);
    send(res, 201, { list });
    return true;
  }

  const listMatch = pathname.match(/^\/lists\/([^/]+)$/);
  if (listMatch) {
    const listId = listMatch[1] ?? "";

    if (method === "GET") {
      const list = isUuid(listId) ? await store.getList(user.id, listId) : null;
      if (!list) {
        send(res, 404, LIST_NOT_FOUND);
        return true;
      }
      const tasks = await store.listTasks(list.id);
      send(res, 200, { list, tasks });
      return true;
    }

    if (method === "PATCH") {
      const body = await readJson(req);
      const name = optionalString(body.name);
      if (!name) {
        send(res, 400, { error: "name is required" });
        return true;
      }
      const list = isUuid(listId) ? await store.renameList(user.id, listId, name) : null;
      if (!list) {
        send(res, 404, LIST_NOT_FOUND);
        return true;
      }
      send(res, 200, { list });
      return true;
    }

    if (method === "DELETE") {
      const deleted = isUuid(listId) ? await store.deleteList(user.id, listId) : false;
      if (!deleted) {
        send(res, 404, LIST_NOT_FOUND);
        return true;
      }
      sendEmpty(res);
      return true;
    }
  }

  const tasksMatch = pathname.match(/^\/lists\/([^/]+)\/tasks$/);
  if (method === "POST" && tasksMatch) {
    const listId = tasksMatch[1] ?? "";
    const body = await readJson(req);
    const title = optionalString(body.title);
    if (!title) {
      send(res, 400, { error: "title is required" });
      return true;
    }
    if (invalidDueDate(body.dueDate)) {
      send(res, 400, { error: "dueDate must be YYYY-MM-DD" });
      return true;
    }
    const dueDate = (body.dueDate as string | null | undefined) ?? null;
    const task = isUuid(listId) ? await store.createTask(user.id, listId, title, dueDate) : null;
    if (!task) {
      send(res, 404, LIST_NOT_FOUND);
      return true;
    }
    send(res, 201, { task });
    return true;
  }

  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const taskId = taskMatch[1] ?? "";

    if (method === "PATCH") {
      const body = await readJson(req);
      if (invalidDueDate(body.dueDate)) {
        send(res, 400, { error: "dueDate must be YYYY-MM-DD" });
        return true;
      }
      if (body.done !== undefined && typeof body.done !== "boolean") {
        send(res, 400, { error: "done must be a boolean" });
        return true;
      }
      const patch = {
        title: optionalString(body.title),
        dueDate: body.dueDate as string | null | undefined,
        done: body.done,
      };
      const task = isUuid(taskId) ? await store.updateTask(user.id, taskId, patch) : null;
      if (!task) {
        send(res, 404, TASK_NOT_FOUND);
        return true;
      }
      send(res, 200, { task });
      return true;
    }

    if (method === "DELETE") {
      const deleted = isUuid(taskId) ? await store.deleteTask(user.id, taskId) : false;
      if (!deleted) {
        send(res, 404, TASK_NOT_FOUND);
        return true;
      }
      sendEmpty(res);
      return true;
    }
  }

  return false;
}
