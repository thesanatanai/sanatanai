import { NextRequest } from "next/server";
import respondErr from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import { type Content, GoogleGenAI } from "@google/genai";
import { getRequestParams, reqConfig } from "./search";
import { getChat } from "@/actions/chatActions";
import generateStream from "./stream";
import dbConnect from "../utils/db";
import prompt from "../utils/systemPrompt";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI,
});

dbConnect();

export async function POST(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const name = user.name;
  const memories = user.memories;
  const locale = user.prefferedLocale;

  try {
    const {
      id: chatId,
      newMessage,
      config,
    } = await request.json() as {
      id: string;
      newMessage: Content;
      config?: reqConfig;
    };

    if (!chatId || !newMessage?.parts) {
      return respondErr("Required: sessionId and newMessage (with parts).");
    }

    if (newMessage.role !== "user")
      return respondErr(
        `Invalid message with role: ${newMessage.role || "No Role"}`,
      );

    const id = user.id;
    if (!chatId) return respondErr("No chat id provided");
    const chat = await getChat(id, chatId);
    if (typeof chat == "function") return chat();

    const systemPrompt = prompt(name as string, locale, memories)
    const requestOptions = getRequestParams(chat, newMessage, config, systemPrompt);
    const stream = generateStream(requestOptions, ai, id, chatId);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disables proxy buffering
      },
    });
  } catch (e) {
    console.log("Response Gen Err: ", e);
    return respondErr(
      "Sorry, something went wrong while generating a response.",
      500,
    );
  }
}
