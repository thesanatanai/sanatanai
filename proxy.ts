import { NextRequest, NextResponse } from "next/server";

export default function proxy(req: NextRequest) {
  const setupComplete = req.cookies.get("setupComplete")?.value;
  const token = req.cookies.get("token")?.value;
  const isPublicPath = req.nextUrl.pathname.includes("welcome");

  if (!(setupComplete == "true" && token) && !isPublicPath) {
    req.cookies.clear();
    const res = NextResponse.redirect(new URL("/welcome", req.url));
    res.cookies.delete("token");
    res.cookies.delete("setupComplete");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
