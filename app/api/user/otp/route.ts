import { NextRequest, NextResponse } from "next/server";
import respondErr, {
  generateHash,
  generateUniqueId,
  genResErr,
} from "../../utils/respondErr";
import otpModel from "../../models/verify";
import userModel from "../../models/user";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sendOtp } from "../../utils/verify";
import dbConnect from "../../utils/db";

dbConnect();

export async function POST(request: NextRequest) {
  const { otp, email, locale } = await request.json();

  if (!otp) return respondErr("Missing OTP");

  const otpHash = await generateHash(otp);
  const registration = await getOtp(email);

  if (typeof registration == "function") return registration();

  const { otpHash: OTPHash } = registration;

  if (OTPHash !== otpHash) {
    return respondErr("OTP Invalid");
  }

  await otpModel.deleteOne({ email });

  const alreadyExists = await userModel.findOne({ email });
  const cookieStore = await cookies();

  if (alreadyExists) {
    const token = jwt.sign(
      { id: alreadyExists.id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1year"
      }
    );

    cookieStore.set({
      name: "token",
      value: token,
      expires: Date.now() + 365 * 24 * 3600 * 900,
      path: "/",
      httpOnly: true,
    });
    return NextResponse.json(alreadyExists.toJSON());
  }

  const id = await generateUniqueId(userModel);
  const newUser = await userModel.create({
    name: "Guest",
    email,
    id,
    picture: "user.png",
    prefferedLocale: locale || "hi",
  });

  const token = jwt.sign({ id }, process.env.JWT_SECRET as string);

  cookieStore.set({
    name: "token",
    value: token,
    expires: Date.now() + 365 * 24 * 3600 * 1000,
    path: "/",
    httpOnly: true,
  });
  return NextResponse.json(newUser.toJSON());
}

export async function PUT(request: NextRequest) {
  const { email } = await request.json();
  const alreadyExists = await getOtp(email);
  if (typeof alreadyExists !== "function")
    return NextResponse.json({ message: "Done" });
  
  const otp = await sendOtp(email);

  if (typeof otp == "function") return otp();

  const otpHash = await generateHash(otp);

  await otpModel.create({
    otpHash,
    email,
    startTime: Date.now(),
  });
  setDelTimer(email, 600000);
  return NextResponse.json({ message: "Done" });
}

async function getOtp(email: string) {
  const registration = await otpModel.findOne({ email });

  if (!registration) return genResErr("OTP expired", 401);

  const now = Date.now();
  const { startTime } = registration;

  if (startTime + 600000 < now) {
    await otpModel.deleteOne({ email });
    return genResErr("OTP Expired", 401);
  }
  else {
    const leftTime = now - 600000 - startTime;
    if(leftTime > 100) {
      setDelTimer(email, leftTime);
    }
  }
  return registration
}

function setDelTimer(email: string, timeLeft: number) {
  return setTimeout(async () => await otpModel.deleteOne({ email }), timeLeft);
}