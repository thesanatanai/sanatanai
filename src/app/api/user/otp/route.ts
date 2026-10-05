import { NextRequest, NextResponse } from "next/server";
import respondErr, {
  generateHash,
  generateUniqueId,
  genResErr,
  isValidEmail,
} from "../../utils/respondErr";
import otpModel, { blackListedModel } from "../../models/verify";
import userModel from "../../models/user";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sendOtp } from "../../utils/verify";
import dbConnect from "../../utils/db";
import z, { ZodError } from "zod";

void dbConnect();

const PostIncoming = z.object({
  otp: z.string(),
  email: z.email(),
  locale: z.enum(["en", "hi"]).optional()
});

// Verify OTP
export async function POST(request: NextRequest) {
  try {
  const { otp, email, locale } = PostIncoming.parse(await request.json());

  const otpHash = await generateHash(otp);
  const registration = await getOtp(email);

  if (typeof registration == "function") return registration();

  const { otpHash: OTPHash } = registration;

  // Invalid OTP
  if (OTPHash !== otpHash) {
    const blacklisted = await blackListedModel.findOne({ email });
    if (blacklisted) {
      if (blacklisted.endTime > Date.now()) {
        return respondErr("User Blacklisted");
      }
      const tries = (blacklisted.tries || 0) + 1;

      // User exceeded tries
      if (tries >= 3) {
        await blackListedModel.updateOne({ email },
          {
            endTime: Date.now() + 300000,
          },
        );
        return respondErr("User Blacklisted");
      }

      // Update new tries
      await blackListedModel.updateOne({ email },
        {
          tries: tries,
        },
      );
      return respondErr("OTP Invalid");
    }

    // Blacklist user
    await blackListedModel.create({
      email,
      endTime: Date.now(),
      tries: 1,
    });
    return respondErr("OTP Invalid");
  }

  // Delete OTP and blacklisted user
  await blackListedModel.deleteOne({ email });
  await otpModel.deleteOne({ email });

  const alreadyExists = await userModel.findOne({ email });
  const cookieStore = await cookies();

  // User already exists
  if (alreadyExists) {
    const token = jwt.sign(
      { id: alreadyExists.id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1year",
      },
    );

    cookieStore.set({
      name: "token",
      value: token,
      expires: Date.now() + 365 * 24 * 3600 * 1000,
      path: "/",
      httpOnly: true,
    });
    return NextResponse.json(alreadyExists.toJSON());
  }

  // Create new user
  const id = await generateUniqueId(userModel);
  const newUser = await userModel.create({
    name: "Guest",
    email,
    id,
    picture: "user.png",
    preferredLocale: locale || "hi",
  });

  const token = jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "1year",
  });

  cookieStore.set({
    name: "token",
    value: token,
    expires: Date.now() + 365 * 24 * 3600 * 1000,
    path: "/",
    httpOnly: true,
  });
  return NextResponse.json(newUser.toJSON());
} catch (e) {
  if(e instanceof ZodError) return respondErr(e.message);
  return respondErr("Sorry Something Went Wrong")
}
}

// Request an OTP
export async function PUT(request: NextRequest) {
  const { email } = await request.json();
  if (!isValidEmail(email)) return respondErr("Invalid Email");

  try {
    const alreadyExists = await getOtp(email);
    if (typeof alreadyExists !== "function") return NextResponse.json({ message: "Done" });

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
  } catch (e) {
    console.error(e);
    return respondErr("Something Went Wrong in Server", 500);
  }
}

// Get OTP for a specific email
async function getOtp(email: string) {
  const registration = await otpModel.findOne({ email });

  if (!registration) return genResErr("OTP expired", 401);

  const now = Date.now();
  const { startTime } = registration;

  if (startTime + 600000 < now) {
    await otpModel.deleteOne({ email });
    return genResErr("OTP Expired", 401);
  } else {
    const leftTime = now - 600000 - startTime;
    if (leftTime > 100) {
      setDelTimer(email, leftTime);
    }
  }
  return registration;
}

// OTP delete timer
function setDelTimer(email: string, timeLeft: number) {
  return setTimeout(async () => await otpModel.deleteOne({ email }), timeLeft);
}
