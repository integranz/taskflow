export type List = { id: string; name: string };

export type Task = {
  id: string;
  listId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
};

export type TaskPatch = {
  title?: string;
  dueDate?: string | null;
  done?: boolean;
};

export type User = { id: string; email: string; createdAt: string };

/** A user plus the password hash. Never serialize this; send `User` instead. */
export type UserRecord = User & { passwordHash: string };

export type Store = {
  ping(): Promise<void>;

  createUser(email: string, passwordHash: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;

  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getSessionUser(tokenHash: string): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void>;

  listLists(ownerId: string): Promise<List[]>;
  createList(ownerId: string, name: string): Promise<List>;
  getList(ownerId: string, id: string): Promise<List | null>;
  renameList(ownerId: string, id: string, name: string): Promise<List | null>;
  deleteList(ownerId: string, id: string): Promise<boolean>;

  listTasks(listId: string): Promise<Task[]>;
  createTask(ownerId: string, listId: string, title: string, dueDate: string | null): Promise<Task | null>;
  updateTask(ownerId: string, id: string, patch: TaskPatch): Promise<Task | null>;
  deleteTask(ownerId: string, id: string): Promise<boolean>;
};
