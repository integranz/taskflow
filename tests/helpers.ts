export type TestUser = { id: string; email: string; createdAt: string };
export type TestList = { id: string; name: string };
export type TestTask = { id: string; listId: string; title: string; dueDate: string | null; done: boolean };

export function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export function sendJson(
  base: string,
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
  token?: string,
): Promise<Response> {
  return fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? auth(token) : {}) },
    body: JSON.stringify(body),
  });
}

export function postJson(base: string, path: string, body: unknown, token?: string): Promise<Response> {
  return sendJson(base, "POST", path, body, token);
}

export function patchJson(base: string, path: string, body: unknown, token?: string): Promise<Response> {
  return sendJson(base, "PATCH", path, body, token);
}

export async function registerUser(
  base: string,
  email = "a@example.com",
  password = "password123",
): Promise<{ token: string; user: TestUser }> {
  const res = await postJson(base, "/auth/register", { email, password });
  if (res.status !== 201) {
    throw new Error(`register ${email} failed with ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { token: string; user: TestUser };
  return { token: body.token, user: body.user };
}

export async function createList(base: string, token: string, name: string): Promise<TestList> {
  const res = await postJson(base, "/lists", { name }, token);
  if (res.status !== 201) throw new Error(`create list failed with ${res.status}`);
  return ((await res.json()) as { list: TestList }).list;
}

export async function createTask(
  base: string,
  token: string,
  listId: string,
  title: string,
  dueDate?: string,
): Promise<TestTask> {
  const res = await postJson(base, `/lists/${listId}/tasks`, { title, dueDate }, token);
  if (res.status !== 201) throw new Error(`create task failed with ${res.status}`);
  return ((await res.json()) as { task: TestTask }).task;
}
