import type { IncomingMessage, ServerResponse } from "node:http";
import type { Store } from "./db/store.js";

/** An error that maps directly to an HTTP status and `{ "error": message }` body. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export type RouteContext = {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  pathname: string;
  store: Store;
};

/** Reads a JSON object body. Malformed JSON is a 400; non-object bodies normalize to `{}`. */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid json");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

export function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function sendEmpty(res: ServerResponse, status = 204): void {
  res.writeHead(status);
  res.end();
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function invalidDueDate(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || !DATE.test(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Trimmed non-empty string, or undefined for anything else (so bad input is a 400, not a 500). */
export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
