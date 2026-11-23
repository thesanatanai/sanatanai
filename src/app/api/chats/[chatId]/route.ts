import { NextResponse } from "next/server";
import verifyUser, { User } from "../../utils/verify";
import { chatJSON, getChat, updateChat } from "@/actions/chatActions";
import chatModel from "../../models/chat";
import respondErr from "../../utils/respondErr";
import z, { ZodError } from "zod";
import { messageModel } from "../../models/chatModel";
import dbConnect from "../../utils/db";

void dbConnect();

export async function GET(_request: Request, { params: { chatId } }: { params: { chatId: string } }) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const chat = await getChat(user.id, chatId);
    if (typeof chat == "function") return chat();
  
    chat.timestamp = Date.now();
    void updateChat(user.id, chatId, { timestamp: chat.timestamp }); //  The chat is being updated in the background, no need to wait for it to finish
    return NextResponse.json(await validateChat(chat));
}



// Delete a chat
export async function DELETE(_request: Request, { params: { chatId } }: { params: { chatId: string } }) {
  const user = await verifyUser(true) as User;
  if(typeof user == "function") return user();

  const { id } = user;
  const { deletedCount } = await chatModel.deleteOne({ id, chatId });
  if(!deletedCount) return respondErr("Chat not found");

  return NextResponse.json({
    message: "Done"
  });
}


async function validateChat(chat: chatJSON) {
  const allText = chat.messages
    .map((message) => message?.parts?.map((part) => part?.text).join(""))
    .join("");
  if (!allText) {
    await updateChat(chat.id, chat.chatId, {
      messages: [],
    });
    return { ...chat, messages: [] };
  }
  return chat;
}


const Modifications = z.object({
  title: z.string().optional(),
  timestamp: z.number().optional(),
  messages: z.array(messageModel),
});

// Update an existing chat
export async function PUT(request: Request, { params: { chatId } }: { params: { chatId: string } }) {
  try {
    const user = (await verifyUser(true)) as User;
    if (typeof user == "function") return user();

    const { id } = user;
    const changes = await request.json();

    if (!Object.keys(changes).length) return respondErr("No modifications!!");

    const validated = Modifications.parse(changes);
    if (!Object.keys(validated).length)
      return respondErr("No valid modifications!!");

    const updated = await updateChat(id, chatId, validated);
    if (updated) return updated();

    return NextResponse.json({
      message: "Done",
    });
  } catch (e) {
    if (e instanceof ZodError) {
     return respondErr(e.message);
    }
   return respondErr("Sorry Something Went Wrong");
  }
}