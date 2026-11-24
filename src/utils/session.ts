/**
 * Picks the most recently used chat.
 *
 * Kept free of client state so that server components can import it.
 * @param chats The user's chats
 * @param setCurrentSession Called with the chosen chat's id, when given
 * @returns The chosen chat's id
 */
export function setSession(chats: Chats, setCurrentSession?: (value: string) => void) {
  let latestChat = chats[0];
  chats.forEach(
    (chat) =>
      (latestChat =
        latestChat.timestamp < chat.timestamp ? chat : latestChat),
  );
  if (setCurrentSession) setCurrentSession(latestChat.id);
  return latestChat.id;
}
