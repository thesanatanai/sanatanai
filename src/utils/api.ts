import { API_URL } from "./apiUrl";
import { getAccessToken, useAuthStore } from "@/stores/authStore";
import { readEvents } from "./sse";

export { API_URL };

/**
 * Client for the Sanatan AI API (the separate `sanatanai-api` service).
 *
 * - The **access token** is kept in memory only (see {@link useAuthStore}). The site's server
 *   reads it from its cookie when it renders the page and passes it down. Calls send it as
 *   `Authorization: Bearer`, without cookies, so they cannot be forged from another site.
 * - The **refresh token** is in an HttpOnly cookie that scripts cannot read. Only sign-in,
 *   renewal and sign-out send cookies (`credentials: "include"`); renewal has no body.
 * - When the API answers 401 the access token has ended: the session is renewed once for all
 *   callers (across tabs too), the new token goes into memory, and the call is repeated.
 *
 * The API must allow this site's origin in its CORS_ORIGINS, and the site and the API must be
 * same-site (for example example.com and api.example.com, with COOKIE_DOMAIN=example.com on the
 * API), or localhost on any ports.
 */

/** How long to wait for a renewal that another tab or the server won, before trying again. */
const RACE_WAIT_MS = 400;

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  preferredLocale: "en" | "hi";
  memories: string[];
}

/** What sign-in and renewal answer. The refresh token is never in it: that stays in its cookie. */
interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
}

/** A failed API call. `code` is the API's machine-readable reason, when it gave one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Forgets the session in this page and shows the sign-in page. The API has already cleared its cookies. */
export function endSession() {
  useAuthStore.getState().setAccessToken(null);
  if (globalThis.window) globalThis.location.replace("/welcome?logout=true");
}

/** Ends the session on the server, which clears the cookies. Works offline too: the session then expires by itself. */
export async function signOut() {
  useAuthStore.getState().setAccessToken(null);
  try {
    await rawRequest("/v1/auth/logout", { method: "POST" }, true);
  } catch {}
}

// ---------------------------------------------------------------- requests

interface RequestOptions extends Omit<RequestInit, "body" | "credentials"> {
  /** A JSON body. Sets the content type. */
  json?: unknown;
}

/**
 * @param withCookies Send and accept cookies. Only the calls that make or end a session do.
 *   Everything else carries the in-memory access token instead.
 */
function rawRequest(path: string, { json, headers, ...init }: RequestOptions = {}, withCookies = false) {
  const merged = new Headers(headers);
  if (json !== undefined) merged.set("Content-Type", "application/json");
  const token = withCookies ? null : getAccessToken();
  if (token) merged.set("Authorization", `Bearer ${token}`);
  return fetch(API_URL + path, {
    ...init,
    headers: merged,
    credentials: withCookies ? "include" : "omit",
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });
}

async function toError(response: Response) {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {}
  const message = typeof body.error === "string" ? body.error : `Request failed (${response.status})`;
  return new ApiError(response.status, message, typeof body.code === "string" ? body.code : undefined, body);
}

let refreshing: Promise<void> | null = null;

/** Renews the session. Every caller that asks while a renewal runs waits for that one. */
function refresh(): Promise<void> {
  refreshing ??= renew().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function renew(): Promise<void> {
  // The refresh cookie is shared by every tab, and a refresh token works once, so one tab at a
  // time. A tab that waits sends the cookie as it is by then, which is the newest one.
  const locks = globalThis.navigator?.locks;
  if (!locks) return spendRefreshToken();
  return locks.request("sanatan-refresh", spendRefreshToken);
}

async function spendRefreshToken(): Promise<void> {
  // No body: the API reads the refresh token from its cookie, and sets the next one.
  let response = await rawRequest("/v1/auth/refresh", { method: "POST" }, true);
  if (!response.ok) {
    let error = await toError(response);
    if (error.code === "refresh_race") {
      // The site's server or another tab renewed at the same moment, so the cookie in the
      // browser is already a newer one. Not a sign-out: give it a moment to land and use it.
      await new Promise((resolve) => setTimeout(resolve, RACE_WAIT_MS));
      response = await rawRequest("/v1/auth/refresh", { method: "POST" }, true);
      if (response.ok) return keep(await response.json());
      error = await toError(response);
    }
    // Server trouble (5xx) and rate limits keep the session; only a definite refusal ends it.
    if ((response.status === 401 || response.status === 400) && error.code !== "refresh_race") endSession();
    throw error;
  }
  keep(await response.json());
}

function keep(result: AuthResult) {
  useAuthStore.getState().setAccessToken(result.accessToken);
}

/**
 * Calls the API as the signed-in user. Renews the session and repeats the call
 * once if the API answers 401.
 *
 * @returns The response, which may be an error status
 * @throws {ApiError} When the session could not be renewed (the user is sent to sign-in)
 */
export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const response = await rawRequest(path, options);
  if (response.status !== 401) return response;

  await refresh();
  return rawRequest(path, options);
}

/** Like {@link apiFetch}, but returns the parsed JSON and throws an {@link ApiError} on any error status. */
async function call<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** A request made before sign-in: there is no session to renew, and its answer sets the cookies. */
async function open<T>(path: string, json: unknown): Promise<T> {
  const response = await rawRequest(path, { method: "POST", json }, true);
  if (!response.ok) throw await toError(response);
  return (await response.json()) as T;
}

// ---------------------------------------------------------------- sign-in

export async function signInWithGoogle(credential: string, locale: "en" | "hi") {
  return (await open<AuthResult>("/v1/auth/google", { credential, locale })).user;
}

/** Emails a code. @returns Seconds until another code may be requested */
export async function requestOtp(email: string) {
  const { newIn } = await open<{ newIn?: number }>("/v1/auth/otp/request", { email });
  return newIn;
}

export async function verifyOtp(email: string, otp: string, locale: "en" | "hi") {
  return (await open<AuthResult>("/v1/auth/otp/verify", { email, otp, locale })).user;
}

// ---------------------------------------------------------------- profile

export const getProfile = () => call<ApiUser>("/v1/me");

export const updateProfile = (changes: Partial<Pick<ApiUser, "name" | "preferredLocale">>) =>
  call<ApiUser>("/v1/me", { method: "PATCH", json: changes });

export const getMemories = () => call<string[]>("/v1/me/memories");

export const deleteMemory = (memory: string) => call<void>("/v1/me/memories", { method: "DELETE", json: { memory } });

// ---------------------------------------------------------------- chats

export const listChats = () => call<Chats>("/v1/chats");

export const createChat = () => call<{ id: string }>("/v1/chats", { method: "POST" });

export const getChat = (id: string) => call<fullChat>(`/v1/chats/${encodeURIComponent(id)}`);

/**
 * What the API stores of a message: its role and its text and attachments.
 * The view's own fields (position, "streaming", "error") and empty parts are left out.
 */
function storable(messages: ChatHistory) {
  return messages.flatMap(({ role, parts }) => {
    const kept = parts
      .filter((part) => part.text || part.inlineData)
      .map((part) => ({
        ...(part.text && { text: part.text }),
        ...(part.inlineData && { inlineData: part.inlineData }),
      }));
    return kept.length ? [{ role, parts: kept }] : [];
  });
}

export const patchChat = (id: string, changes: Partial<Pick<fullChat, "title" | "timestamp" | "messages">>) =>
  call<void>(`/v1/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: { ...changes, ...(changes.messages && { messages: storable(changes.messages) }) },
  });

export const removeChat = (id: string) => call<void>(`/v1/chats/${encodeURIComponent(id)}`, { method: "DELETE" });

export const generateTitle = (id: string, message: string) =>
  call<{ title: string }>(`/v1/chats/${encodeURIComponent(id)}/title`, { method: "POST", json: { message } });

export const enhanceMessage = (message: string) =>
  call<{ message: string }>("/v1/enhance", { method: "POST", json: { message } });

// ---------------------------------------------------------------- streaming

/** What the server sends while it answers. */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; code?: string; message?: string };

/**
 * Sends a message and yields the reply as it is written.
 * @param id The chat the message belongs to
 * @param message What the user wrote, with any attachments
 * @param thinking How hard the model should think
 * @param signal Aborting it stops the reply on the server too
 */
export async function* streamReply(
  id: string,
  message: Pick<ChatHistory[0], "parts">,
  thinking: "low" | "medium" | "high",
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const response = await apiFetch(`/v1/chats/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    json: { message: { parts: message.parts }, thinking },
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!response.ok) throw await toError(response);

  for await (const event of readEvents(response)) {
    if (event && typeof event === "object" && "type" in event) yield event as ChatEvent;
  }
}
