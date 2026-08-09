import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/user";
import respondErr, { generateUniqueId } from "../utils/respondErr";
import verifyUser, { User } from "../utils/verify";
import dbConnect from "../utils/db";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID);
dbConnect();

export async function GET() {
  const user = await verifyUser(true) as User;
  if (typeof user == "function") return user();
  return NextResponse.json({
    message: "User found",
    userData: user.toJSON(),
  });
}

export async function PUT(request: NextRequest) {
  const changed = await request.json();
  if (!Object.keys(changed).length) return respondErr("No changes", 304);

  const user = await verifyUser(true) as User;
  if (typeof user == "function") return user();
  await userModel.updateOne({ id: user.id }, { $set: changed });
  return NextResponse.json({
    message: "Done",
  });
}

export async function POST(request: NextRequest) {
  const { credential, locale } = (await request.json()) as {
    credential: string;
    locale?: "en" | "hi";
  };

  if (!credential) return respondErr("Missing credential token");

  try {
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
        prefferedLocale: locale || "hi"
      });
      isNewUser = true;
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
        expiresIn: "1year",
      });

    cookieStore.set({
      name: "token",
      value: token,
      expires: Date.now() + 365 * 24 * 3600 * 900,
      path: "/",
      httpOnly: true,
    });

    return NextResponse.json({
      message: isNewUser ? "User registered" : "User logged in",
      userData: user.toJSON(),
    });
  } catch {
    return respondErr("Invalid Google Token", 401)
  }
}

// logout from all devices
export async function DELETE(request: NextRequest) {
  const { credential } = (await request.json()) as {
    credential: string;
  };

  if (!credential) {
    return respondErr("Missing credential token");
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return respondErr("Invalid token payload");
    }

    const cookieManager = await cookies();
    const token = cookieManager.get("token")?.value;
    if (!token)
      return respondErr("Token is required", 401);
    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id: string;
      };
      userModel.updateOne({ id }, { id: await generateUniqueId(userModel) });
      cookieManager.delete("token");
    } catch {
      cookieManager.delete("token");
      return respondErr("Either token invalid or user not exists..", 406)
    }
  } catch {
    respondErr("Invalid cardential token");
  }
}
