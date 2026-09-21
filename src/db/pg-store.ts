import type { Pool } from "./pool.js";
import type { List, Store, Task, TaskPatch } from "./store.js";

type ListRow = { id: string; name: string };
type TaskRow = {
  id: string;
  list_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
};

function mapList(row: ListRow): List {
  return { id: row.id, name: row.name };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    dueDate: row.due_date,
    done: row.done,
  };
}

export function createPgStore(pool: Pool): Store {
  return {
    async ping() {
      await pool.query("SELECT 1");
    },

    async listLists() {
      const result = await pool.query<ListRow>("SELECT id, name FROM lists ORDER BY name, id");
      return result.rows.map(mapList);
    },

    async createList(name) {
      const result = await pool.query<ListRow>(
        "INSERT INTO lists (name) VALUES ($1) RETURNING id, name",
        [name],
      );
      const row = result.rows[0];
      if (!row) throw new Error("insert list returned no row");
      return mapList(row);
    },

    async getList(id) {
      const result = await pool.query<ListRow>("SELECT id, name FROM lists WHERE id = $1", [id]);
      const row = result.rows[0];
      return row ? mapList(row) : null;
    },

    async listTasks(listId) {
      const result = await pool.query<TaskRow>(
        "SELECT id, list_id, title, due_date, done FROM tasks WHERE list_id = $1 ORDER BY title, id",
        [listId],
      );
      return result.rows.map(mapTask);
    },

    async createTask(listId, title, dueDate) {
      try {
        const result = await pool.query<TaskRow>(
          `INSERT INTO tasks (list_id, title, due_date)
           VALUES ($1, $2, $3)
           RETURNING id, list_id, title, due_date, done`,
          [listId, title, dueDate],
        );
        const row = result.rows[0];
        if (!row) throw new Error("insert task returned no row");
        return mapTask(row);
      } catch (error) {
        if (isForeignKeyViolation(error)) return null;
        throw error;
      }
    },

    async updateTask(id, patch: TaskPatch) {
      const existing = await pool.query<TaskRow>(
        "SELECT id, list_id, title, due_date, done FROM tasks WHERE id = $1",
        [id],
      );
      const current = existing.rows[0];
      if (!current) return null;
      const title = patch.title ?? current.title;
      const dueDate = patch.dueDate === undefined ? current.due_date : patch.dueDate;
      const done = patch.done ?? current.done;
      const result = await pool.query<TaskRow>(
        `UPDATE tasks
         SET title = $2, due_date = $3, done = $4
         WHERE id = $1
         RETURNING id, list_id, title, due_date, done`,
        [id, title, dueDate, done],
      );
      const row = result.rows[0];
      if (!row) return null;
      return mapTask(row);
    },
  };
}

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23503";
}
