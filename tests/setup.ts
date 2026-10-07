import { afterAll, beforeAll, beforeEach } from "vitest";
import { migrate } from "../src/db/migrate.js";
import { createPool } from "../src/db/pool.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for tests (e.g. postgres://taskflow:taskflow@localhost:5432/taskflow_test)",
  );
}

export const pool = createPool(databaseUrl);

beforeAll(async () => {
  await migrate(pool);
});

beforeEach(async () => {
  // sessions cascade from users; tasks cascade from lists.
  await pool.query("TRUNCATE users, lists CASCADE");
});

afterAll(async () => {
  await pool.end();
});
