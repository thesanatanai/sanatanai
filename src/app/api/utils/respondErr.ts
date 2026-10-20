import { NextResponse } from "next/server";
import userModel from "../models/user";
import chatModel from "../models/chat";

export default function respondErr(msg: string, code = 400) {
  console.log(`Responding error: ${msg} with status code: ${code}`);
  return NextResponse.json({ error: msg }, { status: code });
}

export function genResErr(
  msg: string,
  code = 400,
): () => ReturnType<typeof respondErr> {
  return () => respondErr(msg, code);
}

export async function generateUniqueId(
  model: typeof userModel,
  field?: "id",
): Promise<string>;
export async function generateUniqueId(
  model: typeof chatModel,
  field: "chatId",
): Promise<string>;
export async function generateUniqueId(
  model: typeof userModel | typeof chatModel,
  field = "id",
) {
  const uuid = crypto.randomUUID() + Date.now();
  const hashHex = await generateHash(uuid);
  if (
    await (
      model.findOne as (query: Record<string, string>) => Promise<boolean>
    )({ [field]: hashHex })
  ) {
    return generateUniqueId(model as typeof userModel, field as "id");
  }
  return hashHex;
}

export async function generateHash(data: string | number) {
  const encoded = new TextEncoder().encode(data.toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email);
}
