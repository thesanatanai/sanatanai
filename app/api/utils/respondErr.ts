import { Model } from "mongoose";
import { NextResponse } from "next/server";

export default function respondErr(msg: string, code = 400) {
  console.log(`Responding error: ${msg} with status code: ${code}`);
    return NextResponse.json({
        error: msg
    }, {
        status: code
    });
}

export function genResErr(msg: string, code = 400): () => ReturnType<typeof respondErr> {
    return () => respondErr(msg, code);
}

export async function generateUniqueId(model?: Model<unknown>) {
  const uuid = crypto.randomUUID() + Date.now();
  const hashHex = await generateHash(uuid);
  if (await model?.findOne({ id: hashHex })) {
    return generateUniqueId(model);
  }
  return hashHex;
}

export async function generateHash(data: string | number) {
    const encoded = (new TextEncoder()).encode(data.toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}