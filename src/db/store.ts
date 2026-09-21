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

export type Store = {
  ping(): Promise<void>;
  listLists(): Promise<List[]>;
  createList(name: string): Promise<List>;
  getList(id: string): Promise<List | null>;
  listTasks(listId: string): Promise<Task[]>;
  createTask(listId: string, title: string, dueDate: string | null): Promise<Task | null>;
  updateTask(id: string, patch: TaskPatch): Promise<Task | null>;
};
