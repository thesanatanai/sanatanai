import { NextRequest, NextResponse } from "next/server";
import verifyUser from "./app/api/utils/verify";

export default async function proxy(req: NextRequest) {
  const setupComplete = req.cookies.get("setupComplete")?.value;
  const user = await verifyUser(true, false);
  if (
    setupComplete !== "true" || typeof user == "function"
  ) {
    req.cookies.clear();
    const res = NextResponse.redirect(new URL("/welcome?logout=true", req.url));
    res.cookies.delete("token");
    res.cookies.delete("setupComplete");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|terms|welcome|privacy|.*\\..*).*)"],
};
