import { NextRequest } from "next/server";
import respondErr from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import { GoogleGenAI } from "@google/genai";
import { getRequestParams } from "./search";
import { getChat } from "@/actions/chatActions";
import generateStream from "./stream";
import dbConnect from "../utils/db";
import prompt from "../utils/systemPrompt";
import z from "zod";
import Incoming from "../models/chatModel";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI,
});

void dbConnect();

export async function POST(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const name = user.name;
  const memories = user.memories;
  const locale = user.preferredLocale;

  try {
    const {
      id: chatId,
      newMessage,
      config,
    } = Incoming.parse(await request.json());

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
    if(e instanceof z.ZodError) {
      return respondErr(e.message);
    }
    console.log("Response Gen Err: ", e);
    return respondErr(
      "Sorry, something went wrong while generating a response.",
      500,
    );
  }
}
