import { vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";

/** Where the API client sends its requests when `NEXT_PUBLIC_API_URL` is not set. */
export const API = "http://localhost:8080";

export const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

/** Gives the page an access token in memory, as the server does when it opens the chat page. */
export function signIn(token = "access-1") {
  useAuthStore.getState().setAccessToken(token);
}

type Handler = (call: Call) => Response | Promise<Response>;

export interface Call {
  /** The path after the API's origin, such as `/v1/chats`. */
  path: string;
  method: string;
  /** The parsed JSON body, or undefined when there was none. */
  body: unknown;
  /** What the request said about cookies: the session only travels when this is "include". */
  credentials: RequestCredentials | undefined;
  /** Every header that was sent, lower-cased. */
  headers: Record<string, string>;
  signal: AbortSignal | null | undefined;
}

/**
 * Replaces fetch() with a fake API. `routes` maps `"METHOD /path"` to a handler or a
 * response body (sent as 200 JSON). A request nobody handles fails the test loudly.
 */
export function fakeApi(routes: Record<string, Handler | unknown>) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (!url.startsWith(API)) throw new Error(`Unexpected request outside the API: ${url}`);
    const headers = new Headers(init.headers);
    const call: Call = {
      path: url.slice(API.length),
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      credentials: init.credentials,
      headers: Object.fromEntries(headers),
      signal: init.signal,
    };
    calls.push(call);
    const route = routes[`${call.method} ${call.path}`];
    if (route === undefined) throw new Error(`No fake route for ${call.method} ${call.path}`);
    return typeof route === "function" ? (route as Handler)(call) : json(route);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

/** An event stream like the one the API sends for a reply. */
export function sseResponse(events: unknown[], { comments = false } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (comments) controller.enqueue(encoder.encode(": ping\n\n"));
      for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
