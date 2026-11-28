import "server-only";
import type { ApiUser } from "./api";
import { serverApiUrl } from "./apiUrl";
import { setSession } from "./session";

/** What the chat page needs at first paint, loaded by the server. */
export interface AppData {
  user: ApiUser;
  chats: Chats;
  /** The most recent chat, which opens first. */
  chatId: string;
  /** Its messages, as the API stores them (without positions). */
  messages: ChatHistory;
}

/** The API refused the token. The session is over. */
export class SessionExpired extends Error {}

async function get<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(serverApiUrl() + path, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) throw new SessionExpired();
  if (!response.ok) throw new Error(`The API answered ${response.status} for ${path}`);
  return (await response.json()) as T;
}

/**
 * Loads the user, their chats and the latest chat from the API with the session's access token.
 * @throws {SessionExpired} when the API says the token is no good
 * @throws {Error} for anything else (the API being down, say): the browser can load it itself
 */
export async function loadAppData(accessToken: string): Promise<AppData> {
  const [user, chats] = await Promise.all([get<ApiUser>("/v1/me", accessToken), get<Chats>("/v1/chats", accessToken)]);
  const chatId = setSession(chats);
  const chat = await get<fullChat>(`/v1/chats/${encodeURIComponent(chatId)}`, accessToken);
  return { user, chats, chatId, messages: chat.messages };
}
