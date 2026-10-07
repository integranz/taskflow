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

/** Largest JSON body accepted. Every request body in this API is a few short fields. */
export const MAX_BODY_BYTES = 64 * 1024;

/** True when any string anywhere in the value contains U+0000, which Postgres `text` rejects. */
function containsNul(value: unknown): boolean {
  if (typeof value === "string") return value.includes("\u0000");
  if (Array.isArray(value)) return value.some(containsNul);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(([key, v]) => key.includes("\u0000") || containsNul(v));
  }
  return false;
}

/**
 * Reads a JSON object body.
 * - Over MAX_BODY_BYTES is a 413. A declared Content-Length is rejected before reading; a chunked body
 *   is drained without buffering so memory stays bounded.
 * - Malformed JSON is a 400. Any NUL character is a 400 (Postgres would otherwise fail with a 500).
 * - Non-object bodies normalize to `{}`.
 */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new HttpError(413, "request body too large");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      // Keep draining so the response can still be written on this socket, but stop buffering.
      tooLarge = true;
      chunks.length = 0;
      continue;
    }
    chunks.push(buffer);
  }
  if (tooLarge) throw new HttpError(413, "request body too large");
  if (chunks.length === 0) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid json");
  }
  if (containsNul(parsed)) throw new HttpError(400, "text must not contain NUL characters");
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

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True unless the value is null, undefined, or a real calendar date as YYYY-MM-DD (year 0001 or later). */
export function invalidDueDate(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "string") return true;
  const match = DATE.exec(value);
  if (!match) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Postgres has no year 0, and rejects month/day values that do not exist (e.g. 2026-02-30).
  if (year < 1 || month < 1 || month > 12 || day < 1) return true;
  const daysInMonth = month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);
  return day > daysInMonth;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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
