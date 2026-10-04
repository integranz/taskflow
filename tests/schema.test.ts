import { describe, expect, it } from "vitest";
import { pool } from "./setup.js";

describe("schema", () => {
  it("has the accounts tables and the list owner column", async () => {
    const result = await pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (table_name, column_name) IN (
           ('lists', 'owner_id'),
           ('users', 'email'),
           ('users', 'password_hash'),
           ('sessions', 'token_hash'),
           ('sessions', 'expires_at')
         )`,
    );
    const found = result.rows.map((row) => `${row.table_name}.${row.column_name}`).sort();
    expect(found).toEqual([
      "lists.owner_id",
      "sessions.expires_at",
      "sessions.token_hash",
      "users.email",
      "users.password_hash",
    ]);
  });
});
