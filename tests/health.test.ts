import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createPgStore } from "../src/db/pg-store.js";
import { listen } from "./listen.js";
import { pool } from "./setup.js";

describe("GET /health", () => {
  const server = createApp(createPgStore(pool));

  afterEach(() => {
    server.close();
  });

  it("returns ok when the database answers", async () => {
    const base = await listen(server);
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "ok",
      version: process.env.VERSION ?? "0.0.0-local",
    });
  });
});
