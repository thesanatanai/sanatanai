"use server";

import { Content } from "@google/genai";
import chatModel from "@/app/api/models/chat";
import userModel from "@/app/api/models/user";
import { generateUniqueId, genResErr } from "@/app/api/utils/respondErr";
import { AnyKeys } from "mongoose";

export async function getChat(id: string, chatId: string) {
    try {
    const chat = await chatModel.findOne({ id, chatId });
    if(!chat) return genResErr("Chat does not exist");
    return chat.toJSON();
    } catch (e) {
        console.error(e);
        return genResErr("Internal Server Error", 500);
    }
}

type gotChat = Awaited<ReturnType<typeof getChat>>;
export type chatJSON = Extract<gotChat, { id: string }>;

export async function updateChat(userId: string, chatId: string, updatedField: AnyKeys<chatJSON>) {
    try {
        if(!await chatModel.findOne({ id: userId, chatId })) return genResErr("Chat does not exist..");
        await chatModel.updateOne({
            id: userId, chatId
        }, {
            $set: updatedField
        });
    }
    catch (e) {
        console.error(e);
        return genResErr("Sorry, Internal server error!", 500);
    }
}

export async function getChats(userId: string) {
    try {
    const userExists = await userModel.findOne({ id: userId });
    if(!userExists) return genResErr("User does not exist..");
    const chat = await chatModel.find({ id: userId });
    const chats: Chats = [];
    if(!chat.length) {
      chat.push(await createNewChat(userId));
    }
    chat.forEach((c) => {
      chats.push({
        title: c.title,
        id: c.chatId,
        timestamp: c.timestamp,
        index: chats.length + 1
      });
    });
    return chats;
} catch (e) {
    console.error(e);
    return genResErr("Sorry! Internal Server Error", 500)
}
}

export async function createNewChat(id: string, title?: string) {
  const chatId = await generateUniqueId(chatModel, "chatId");
  return await chatModel.create({
    id,
    timestamp: Date.now(),
    title: title || "New Chat",
    chatId: chatId,
    messages: [],
  });
}

export async function setMessages(userId: string, chatId: string, updatedMessages: Content[]) {
    const notExist = await updateChat(userId, chatId, {
        messages: updatedMessages
    });
    if(notExist) return notExist;
}