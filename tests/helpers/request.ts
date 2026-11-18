import { NextRequest, NextResponse } from "next/server";

/** Builds a NextRequest for a route handler. A string body is sent as-is. */
export function jsonRequest(path: string, method: string, body?: unknown, headers: HeadersInit = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** What verifyUser() resolves to when the session is not valid. */
export const unauthorized = (message = "Token not found", status = 401) => () =>
  NextResponse.json({ error: message }, { status });

/** A fake `cookies()` store that records what a route sets. */
export function fakeCookieStore() {
  const jar = new Map<string, Record<string, unknown>>();
  return {
    jar,
    set: (options: Record<string, unknown>) => void jar.set(String(options.name), options),
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    delete: (options: { name: string } | string) =>
      void jar.delete(typeof options === "string" ? options : options.name),
  };
}
