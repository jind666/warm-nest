import { NextResponse } from "next/server";
import {
  createSessionToken,
  getLoginUsername,
  validateLogin,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!validateLogin(username, password)) {
      return NextResponse.json(
        {
          error: "账号或密码不正确，请再试一次。",
        },
        { status: 401 },
      );
    }

    const token = createSessionToken(username);
    const response = NextResponse.json({
      ok: true,
      username: getLoginUsername(),
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "登录失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
