import { createServer } from "node:http";
import type { Store } from "./db/store.js";
import { HttpError, send, type RouteContext } from "./http.js";
import { handleAuth } from "./routes/auth.js";
import { handleLists } from "./routes/lists.js";

export function createApp(store: Store) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const ctx: RouteContext = {
        req,
        res,
        method: req.method ?? "GET",
        pathname: url.pathname,
        store,
      };

      if (ctx.method === "GET" && ctx.pathname === "/health") {
        await store.ping();
        send(res, 200, { status: "ok", version: process.env.VERSION ?? "0.0.0-local" });
        return;
      }

      if (ctx.pathname.startsWith("/auth/") && (await handleAuth(ctx))) return;

      const isListsOrTasks =
        ctx.pathname === "/lists" || ctx.pathname.startsWith("/lists/") || ctx.pathname.startsWith("/tasks/");
      if (isListsOrTasks && (await handleLists(ctx))) return;

      send(res, 404, { error: "not found" });
    } catch (error) {
      if (error instanceof HttpError) {
        send(res, error.status, { error: error.message });
        return;
      }
      send(res, 500, { error: "internal error" });
    }
  });
}

export type { List, Task, User } from "./db/store.js";
