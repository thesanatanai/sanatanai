import { GoogleGenAI } from "@google/genai";
import verifyUser, { User } from "@/app/api/utils/verify";
import { NextRequest } from "next/server";
import respondErr from "@/app/api/utils/respondErr";

const ai = new GoogleGenAI({
  apiKey: process.env.GENAI,
});

export async function POST(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const name = user.name;
  const locale = user.prefferedLocale;

  try {
    const { newMessage } = (await request.json()) as {
      newMessage: string;
    };

    if (!newMessage) {
      return respondErr("Required: New message.");
    }

    const systemPrompt = prompt(name as string, locale);
    const requestOptions = {
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        text: newMessage,
      },
      config: {
        systemInstruction: systemPrompt,
      },
    };

    return await ai.models.generateContent(requestOptions).then(response => response.text);
  } catch (e) {
    console.log("Response Gen Err: ", e);
    return respondErr(
      "Sorry, something went wrong while generating a response.",
      500,
    );
  }
}

function prompt(name: string, locale: "en" | "hi") {
  return `You are a proffessional **Prompt Enhancement** worker
    You focus on enhancing and correctly elaborating the user's message for a conversational AI, Sanatan AI,
    which integrates spiritual concepts with user's query.
    User has chosen ${locale == "hi" ? "hindi" : "english"} as their preffered language,
    message language might differ, so go with the language written in user's message.
    Each and every message you receive is soley the prompt from user which needs to be enahnced by you.
    ${name ?? `Name of user is ${name}`}`;
}
