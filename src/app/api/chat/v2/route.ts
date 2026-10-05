import { GoogleGenAI } from "@google/genai";
import verifyUser, { User } from "@/app/api/utils/verify";
import { NextRequest } from "next/server";
import respondErr from "@/app/api/utils/respondErr";
import { v2Incoming } from "../../models/chatModel";
import { ZodError } from "zod";
import { enhancePrompt } from "../../utils/systemPrompt";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI,
});

export async function POST(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const name = user.name;
  const locale = user.preferredLocale;

  try {
    const { newMessage } = v2Incoming.parse(await request.json());

    const systemPrompt = enhancePrompt(name as string, locale);
    const requestOptions = {
      model: "gemini-3.1-flash-lite",
      contents: {
        role: "user",
        text: newMessage,
      },
      config: {
        systemInstruction: systemPrompt,
      },
    };

    return new Response(await ai.models.generateContent(requestOptions).then(response => response.text), {
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
