import { NextResponse } from "next/server";
import { readCookieValue, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const sessionToken = readCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  const session = verifySessionToken(sessionToken);

  return NextResponse.json({
    authenticated: Boolean(session),
    username: session?.username ?? null,
  });
}
