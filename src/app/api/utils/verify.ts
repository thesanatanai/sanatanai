import "server-only";
import { cookies } from "next/headers";
import userModel from "../models/user";
import jwt from "jsonwebtoken";
import { genResErr, isValidEmail } from "./respondErr";
import { _sendOTP } from "./sendMail";
import crypto from "node:crypto";
import dbConnect from "./db";
import z from "zod";
import { io } from "next/cache";

z.object({
  NEXT_PUBLIC_OAUTH_CLIENT_ID: z.string(),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  GENAI: z.string(),
  TAVILY_API: z.string(),
  RESEND_API: z.string(),
  GA_ID: z.string().optional(),
  MONGO_DEV: z.string().optional()
}).parse(process.env);
 
void dbConnect();

const findUser = (id: string) => userModel.findOne({ id }).catch(err => {
    console.error("Error occurred while finding user:", err);
    return null;
});

type user = ReturnType<typeof findUser | typeof genResErr>;

export default async function verifyUser(deleteCookies = true, find = true): Promise<user | undefined> {
  await io();
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    if (deleteCookies) {
      cookieStore.delete({ name: "token" });
      cookieStore.delete({ name: "setupComplete" });
    }
    return genResErr("Token not found", 401);
  }
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    if (find) {
      const user = await findUser(id);
      if (!user) {
        if (deleteCookies) {
          cookieStore.delete({ name: "token" });
          cookieStore.delete({ name: "setupComplete" });
        }
        return genResErr("User not found", 401);
      }
      return user;
    }
  } catch (err) {
    console.error("Error occurred while verifying user:", err);
    if (deleteCookies) {
      cookieStore.delete({ name: "token" });
      cookieStore.delete({ name: "setupComplete" });
    }
    return genResErr("Invalid token", 401);
  }
}

export type User = NonNullable<Awaited<ReturnType<typeof verifyUser>>>;

export async function sendOtp(email: string) {
  if (!isValidEmail(email)) return genResErr("Email is invalid");
  const OTP = crypto.randomInt(100000, 999999);
  await _sendOTP(OTP, email);
  return OTP;
}
