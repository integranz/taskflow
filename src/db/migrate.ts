import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "./pool.js";

export async function migrate(pool: Pool): Promise<void> {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await pool.query(sql);
}
