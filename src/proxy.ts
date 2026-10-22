import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
 
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  let valid = false;
  if (token) { try { await jwtVerify(token, secret); valid = true; } catch {} }
  const welcomeRedirect = req.url.includes("welcome") && req.nextUrl.searchParams.get("logout");
 
  if (pathname.startsWith("/app") && !valid) {
    const res = NextResponse.redirect(new URL("/welcome?logout=true", req.url));
    res.cookies.delete("token");
    return res;
  }
  const redirect = pathname === "/" || pathname === "/hi" || pathname === "/welcome";
  if (redirect && valid && !welcomeRedirect)
    return NextResponse.redirect(new URL("/app", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/hi", "/app/:path*", "/welcome"] };