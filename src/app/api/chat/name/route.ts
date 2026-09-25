import { GoogleGenAI } from "@google/genai";
import verifyUser, { User } from "@/app/api/utils/verify";
import { NextRequest } from "next/server";
import respondErr from "@/app/api/utils/respondErr";
import { nameIncoming } from "../../models/chatModel";
import { ZodError } from "zod";
import { namePrompt } from "../../utils/systemPrompt";
import { updateChat } from "@/actions/chatActions";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI,
});


async function name(title: string | undefined, id: string, chatId: string) {
  if(!title || !id || !chatId) return;
  const error = await updateChat(id, chatId, { title });
  if(error) return await error().json();
}

export async function POST(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  try {
    const { newMessage, chatId } = nameIncoming.parse(await request.json());

    const systemPrompt = namePrompt();
    const requestOptions = {
      model: "gemini-3.5-flash-lite",
      contents: {
        role: "user",
        text: newMessage,
      },
      config: {
        systemInstruction: systemPrompt,
      },
    };

    const nameResponse = await ai.models.generateContent(requestOptions).then(response => response.text);
    await name(nameResponse, user.id, chatId);
    return new Response(nameResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (e) {
    if(e instanceof ZodError) {
      return respondErr(e.message);
    }
    console.log("Response Gen Err: ", e);
    return respondErr(
      "Sorry, something went wrong while generating a response.",
      500,
    );
  }
}
