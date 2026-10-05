import { NextRequest, NextResponse } from "next/server";
import verifyUser from "./app/api/utils/verify";

export default async function proxy(req: NextRequest) {
  const setupComplete = req.cookies.get("setupComplete")?.value;
  const user = await verifyUser(true, false);
  if (
    (setupComplete !== "true" || typeof user == "function") && req.nextUrl.pathname == "app"
  ) {
    req.cookies.clear();
    const response = NextResponse.redirect(new URL("/welcome?logout=true", req.url));
    response.cookies.delete("token");
    response.cookies.delete("setupComplete");
    return response;
  }
  else if (setupComplete == "true" && typeof user !== "function" && !req.url.includes("app")) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(app|hi|)"],
};
