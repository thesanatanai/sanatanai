import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/user";
import respondErr, { generateUniqueId } from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import dbConnect from "../utils/db";
import z, { ZodError } from "zod";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID);
const Update = z.object({
  memories: z.array(z.string()).optional(),
  name: z.string().optional(),
  preferredLocale: z.enum(["en", "hi"]).optional(),
  picture: z.string().optional()
});

void dbConnect();

export async function GET() {
  const user = await verifyUser(true) as User;
  if (typeof user == "function") return user();
  return NextResponse.json({
    message: "User found",
    userData: user.toJSON(),
  });
}

export async function PUT(request: NextRequest) {
  try {
  const updates = Update.parse(await request.json());
  if (!Object.keys(updates).length) return respondErr("No valid changes", 304);

  const user = await verifyUser(true) as User;
  if (typeof user == "function") return user();

  await userModel.updateOne({ id: user.id }, { $set: updates});
  return NextResponse.json({
    message: "Done",
  });
} catch (e) {
  if(e instanceof ZodError) return respondErr(e.message);
  respondErr("Sorry Something Went Wrong..");
}
}

const PostIncoming = z.object({
  credential: z.string(),
  locale: z.enum(["en", "hi"]).optional()
});

export async function POST(request: NextRequest) {
  try {
    const { credential, locale } = PostIncoming.parse(await request.json());

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return respondErr("Invalid token payload");
    }
    const email = payload.email;
    const name = payload.name || "";
    const picture = payload.picture || "";

    const cookieStore = await cookies();

    let user = await userModel.findOne({ email });
    let isNewUser = false;

    if (!user) {
      const id = await generateUniqueId(userModel);
      user = await userModel.create({
        name,
        email,
        picture,
        id,
        preferredLocale: locale || "hi"
      });
      isNewUser = true;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
        expiresIn: "1year",
      });

    cookieStore.set({
      name: "token",
      value: token,
      expires: Date.now() + 365 * 24 * 3600 * 1000,
      path: "/",
      httpOnly: true,
    });

    return NextResponse.json({
      message: isNewUser ? "User registered" : "User logged in",
      userData: user.toJSON(),
    });
  } catch (e) {
    if(e instanceof ZodError) {
      return respondErr(e.message);
    }
    return respondErr("Invalid Google Token", 401);
  }
}