import { NextResponse } from "next/server";
import chatModel from "../models/chat";
import respondErr from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import { createNewChat } from "@/actions/chatActions";
import dbConnect from "../utils/db";

void dbConnect();

// Get all chat sessions
export async function GET() {
  try {
    const user = (await verifyUser(true)) as User;
    if (typeof user == "function") return user();
    
    // Only fetch what the sidebar needs; never load the messages array here
    const rows = await chatModel
      .find({ id: user.id })
      .select("title chatId timestamp")
      .lean();
    const chats = rows.map((c) => ({
      title: c.title,
      id: c.chatId,
    }));
    if(!chats.length) {
      const c = await createNewChat(user.id);
      chats.push({ title: c.title, id: c.chatId });
    }
    return NextResponse.json(chats);
  } catch {
    return respondErr("Invalid token");
  }
}

// Add a new chat
export async function POST() {
  const user = (await verifyUser(true)) as User;
  if (typeof user == "function") return user();

  const { id } = user;

  // A new chat already exists
  const alreadyExists = await chatModel
    .findOne({messages: [], id})
    .select("chatId")
    .lean();
  if (alreadyExists) return NextResponse.json({ id: alreadyExists.chatId });

  const { chatId } = await createNewChat(id);
  return NextResponse.json({ id: chatId });
}