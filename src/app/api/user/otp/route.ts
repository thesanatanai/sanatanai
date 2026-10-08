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
import { timingSafeEqual } from "node:crypto";
import { sendOtp } from "../../utils/verify";
import dbConnect from "../../utils/db";
import z, { ZodError } from "zod";

void dbConnect();

// Wrong guesses allowed per OTP before it is burned and the email is locked.
const MAX_TRIES = 5;
// How long the email is locked (no verifying, no new OTP) after too many tries.
const LOCK_MS = 15 * 60 * 1000;
const LOCKED_MSG = "Too many attempts. Please try again later.";

const PostIncoming = z.object({
  otp: z.string().trim().regex(/^\d{6}$/),
  email: z.email(),
  locale: z.enum(["en", "hi"]).optional(),
});

// Verify OTP
export async function POST(request: NextRequest) {
  try {
    const { otp, email, locale } = PostIncoming.parse(await request.json());

    // 1. Locked out? Reject before even looking at the code.
    if (await isLocked(email)) return respondErr(LOCKED_MSG, 429);

    // 2. Is there a live OTP for this email?
    const registration = await getOtp(email);
    if (typeof registration == "function") return registration();

    // 3. Count this attempt atomically BEFORE comparing. $inc is a single
    //    database operation, so parallel requests each get a unique count and
    //    at most MAX_TRIES of them can ever reach the comparison below.
    const attempt = await blackListedModel.findOneAndUpdate(
      { email },
      { $inc: { tries: 1 }, $setOnInsert: { endTime: 0 } },
      { upsert: true, new: true },
    );
    const tries = attempt?.tries ?? MAX_TRIES + 1; // fail closed

    if (tries > MAX_TRIES) {
      await lockOut(email);
      return respondErr(LOCKED_MSG, 429);
    }

    // 4. Compare (constant time)
    const otpHash = await generateHash(otp);

    if (!safeEqual(registration.otpHash, otpHash)) {
      // Last allowed guess was wrong: burn the OTP and lock the email.
      if (tries >= MAX_TRIES) {
        await lockOut(email);
        return respondErr(LOCKED_MSG, 429);
      }
      return respondErr("OTP Invalid");
    }

    // Correct OTP: clear the attempt counter and the OTP itself
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
    if (e instanceof ZodError) return respondErr(e.message);
    console.error(e);
    return respondErr("Sorry Something Went Wrong");
  }
}

// Request an OTP
export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!isValidEmail(email)) return respondErr("Invalid Email");

    // A locked email cannot request a fresh code (otherwise the lock would
    // be pointless: the attacker would just ask for a new code and keep going)
    if (await isLocked(email)) return respondErr(LOCKED_MSG, 429);

    // A live OTP already exists: don't send another one
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

    // New code => fresh attempt budget, no lock
    await blackListedModel.updateOne(
      { email },
      { $set: { tries: 0, endTime: 0 } },
      { upsert: true },
    );

    setDelTimer(email, 600000);
    return NextResponse.json({ message: "Done" });
  } catch (e) {
    console.error(e);
    return respondErr("Something Went Wrong in Server", 500);
  }
}

// Is this email currently locked out?
async function isLocked(email: string) {
  const lock = await blackListedModel.findOne({ email });
  return !!lock && lock.endTime > Date.now();
}

// Burn the current OTP and lock the email for LOCK_MS
async function lockOut(email: string) {
  await otpModel.deleteOne({ email });
  await blackListedModel.updateOne(
    { email },
    { $set: { endTime: Date.now() + LOCK_MS } },
    { upsert: true },
  );
}

// Constant-time string comparison
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
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