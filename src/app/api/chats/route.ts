import { NextRequest, NextResponse } from "next/server";
import chatModel from "../models/chat";
import respondErr from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import {
  chatJSON,
  createNewChat,
  getChat,
  updateChat,
} from "@/actions/chatActions";
import dbConnect from "../utils/db";
import z, { ZodError } from "zod";
import { messageModel } from "../models/chatModel";

void dbConnect();

// Get all chat sessions
export async function GET() {
  try {
    const user = (await verifyUser(true)) as User;
    if (typeof user == "function") return user();
    const chat = await chatModel.find({ id: user.id });
    const chats: unknown[] = [];
    if (!chat.length) {
      chat.push(await createNewChat(user.id));
    }
    chat.forEach((c) => {
      chats.push({
        title: c.title,
        id: c.chatId,
      });
    });
    return NextResponse.json(chats);
  } catch {
    return respondErr("Invalid token");
  }
}

// Get a specific chat
export async function OPTIONS(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const { id } = user;
  const { id: chatId } = await request.json();
  if (!chatId || typeof chatId !== "string") return respondErr("Invalid chat id provided");

  const chat = await getChat(id, chatId);
  if (typeof chat == "function") return chat();
  return NextResponse.json(await validateChat(chat));
}

// Add a new chat
export async function PATCH(request: NextRequest) {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const { id } = user;

  // A new chat already exists
  const alreadyExists = await chatModel.findOne({ messages: [], id });
  if (alreadyExists) return NextResponse.json({ id: alreadyExists.chatId });

  // Create a new chat
  let title = "New Chat";

  try {
    const { title: t } = await request.json();
    if (t) title = t;
  } catch {}

  const { chatId } = await createNewChat(id, title);
  return NextResponse.json({ id: chatId });
}

// Delete a chat
export async function DELETE(request: NextRequest) {
  const { id: chatId } = await request.json();
  if (!chatId) return respondErr("Chat Id not provided");
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();
  const { id } = user;
  const chat = await chatModel.findOne({ id, chatId });
  if (!chat) return respondErr("Chat not found");
  await chatModel.deleteOne({
    id,
    chatId,
  });
  return NextResponse.json({
    message: "Done",
  });
}

const Modifications = z.object({
  id: z.string(),
  title: z.string().optional(),
  timestamp: z.number().optional(),
  messages: z.array(messageModel),
});

// Update an existing chat
export async function PUT(request: NextRequest) {
  try {
    const user = (await verifyUser(true)) as User;
    if (typeof user == "function") return user();

    const { id } = user;
    const { id: chatId, ...changes } = await request.json();

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
      respondErr(e.message);
    }
    respondErr("Sorry Something Went Wrong");
  }
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
