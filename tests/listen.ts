import type { Server } from "node:http";

export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected tcp address");
  }
  return `http://127.0.0.1:${address.port}`;
}
