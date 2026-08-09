"use server";
import { cookies } from "next/headers";
import userModel from "../models/user";
import jwt from "jsonwebtoken";
import { genResErr } from "./respondErr";
import { _sendOTP } from "./sendMail";
import crypto from "node:crypto";
import dbConnect from "./db";

dbConnect();

const findUser = (id: string) => {
  try {
    return userModel.findOne({ id });
  } catch (err) {
    console.error("Error occurred while finding user:", err);
    return null;
  }
};
type user = ReturnType<typeof findUser | typeof genResErr>;

export default async function verifyUser(deleteCookies = true): Promise<user> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return genResErr("Token not found", 401);
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const user = await findUser(id);
    if (!user) {
      if (deleteCookies) {
        cookieStore.delete({ name: "token" });
        cookieStore.delete({ name: "setupComplete" });
      }
      return genResErr("User not found", 401);
    }
    return user;
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
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.exec(email))
    return genResErr("Email is invalid");
  const OTP = crypto.randomInt(100000, 999999);
  await _sendOTP(OTP, email);
  return OTP;
}
