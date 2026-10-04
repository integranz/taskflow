import type { Pool } from "./pool.js";
import type { List, Store, Task, TaskPatch, User, UserRecord } from "./store.js";

type ListRow = { id: string; name: string };
type TaskRow = {
  id: string;
  list_id: string;
  title: string;
  due_date: string | null;
  done: boolean;
};
type UserRow = { id: string; email: string; created_at: Date };
type UserRecordRow = UserRow & { password_hash: string };

const TASK_COLUMNS = "id, list_id, title, due_date, done";
const USER_COLUMNS = "id, email, created_at";

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

function mapUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at.toISOString() };
}

function mapUserRecord(row: UserRecordRow): UserRecord {
  return { ...mapUser(row), passwordHash: row.password_hash };
}

export function createPgStore(pool: Pool): Store {
  return {
    async ping() {
      await pool.query("SELECT 1");
    },

    async createUser(email, passwordHash) {
      try {
        const result = await pool.query<UserRow>(
          `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING ${USER_COLUMNS}`,
          [email, passwordHash],
        );
        const row = result.rows[0];
        if (!row) throw new Error("insert user returned no row");
        return mapUser(row);
      } catch (error) {
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },

    async getUserByEmail(email) {
      const result = await pool.query<UserRecordRow>(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
        [email],
      );
      const row = result.rows[0];
      return row ? mapUserRecord(row) : null;
    },

    async getUserById(id) {
      const result = await pool.query<UserRecordRow>(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE id = $1`,
        [id],
      );
      const row = result.rows[0];
      return row ? mapUserRecord(row) : null;
    },

    async updateUserPassword(id, passwordHash) {
      await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
    },

    async createSession(userId, tokenHash, expiresAt) {
      await pool.query(
        "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [userId, tokenHash, expiresAt],
      );
    },

    async getSessionUser(tokenHash) {
      const result = await pool.query<UserRow>(
        `SELECT u.id, u.email, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash],
      );
      const row = result.rows[0];
      return row ? mapUser(row) : null;
    },

    async deleteSession(tokenHash) {
      await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    },

    async deleteUserSessions(userId, exceptTokenHash) {
      await pool.query(
        "DELETE FROM sessions WHERE user_id = $1 AND ($2::text IS NULL OR token_hash <> $2)",
        [userId, exceptTokenHash ?? null],
      );
    },

    async listLists(ownerId) {
      const result = await pool.query<ListRow>(
        "SELECT id, name FROM lists WHERE owner_id = $1 ORDER BY name, id",
        [ownerId],
      );
      return result.rows.map(mapList);
    },

    async createList(ownerId, name) {
      const result = await pool.query<ListRow>(
        "INSERT INTO lists (owner_id, name) VALUES ($1, $2) RETURNING id, name",
        [ownerId, name],
      );
      const row = result.rows[0];
      if (!row) throw new Error("insert list returned no row");
      return mapList(row);
    },

    async getList(ownerId, id) {
      const result = await pool.query<ListRow>(
        "SELECT id, name FROM lists WHERE id = $1 AND owner_id = $2",
        [id, ownerId],
      );
      const row = result.rows[0];
      return row ? mapList(row) : null;
    },

    async renameList(ownerId, id, name) {
      const result = await pool.query<ListRow>(
        "UPDATE lists SET name = $3 WHERE id = $1 AND owner_id = $2 RETURNING id, name",
        [id, ownerId, name],
      );
      const row = result.rows[0];
      return row ? mapList(row) : null;
    },

    async deleteList(ownerId, id) {
      const result = await pool.query("DELETE FROM lists WHERE id = $1 AND owner_id = $2", [id, ownerId]);
      return (result.rowCount ?? 0) > 0;
    },

    async listTasks(listId) {
      const result = await pool.query<TaskRow>(
        `SELECT ${TASK_COLUMNS} FROM tasks WHERE list_id = $1 ORDER BY title, id`,
        [listId],
      );
      return result.rows.map(mapTask);
    },

    async createTask(ownerId, listId, title, dueDate) {
      // The INSERT only happens when the list exists and belongs to the caller.
      const result = await pool.query<TaskRow>(
        `INSERT INTO tasks (list_id, title, due_date)
         SELECT l.id, $3::text, $4::date FROM lists l WHERE l.id = $2 AND l.owner_id = $1
         RETURNING ${TASK_COLUMNS}`,
        [ownerId, listId, title, dueDate],
      );
      const row = result.rows[0];
      return row ? mapTask(row) : null;
    },

    async updateTask(ownerId, id, patch: TaskPatch) {
      const existing = await pool.query<TaskRow>(
        `SELECT t.id, t.list_id, t.title, t.due_date, t.done
         FROM tasks t
         JOIN lists l ON l.id = t.list_id
         WHERE t.id = $1 AND l.owner_id = $2`,
        [id, ownerId],
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
         RETURNING ${TASK_COLUMNS}`,
        [id, title, dueDate, done],
      );
      const row = result.rows[0];
      if (!row) return null;
      return mapTask(row);
    },

    async deleteTask(ownerId, id) {
      const result = await pool.query(
        `DELETE FROM tasks t USING lists l
         WHERE t.id = $1 AND l.id = t.list_id AND l.owner_id = $2`,
        [id, ownerId],
      );
      return (result.rowCount ?? 0) > 0;
    },
  };
}

function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}
