import COS from "cos-nodejs-sdk-v5";
import { NextResponse } from "next/server";
import { readCookieValue, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const bucket = process.env.NEXT_PUBLIC_COS_BUCKET;
const region = process.env.NEXT_PUBLIC_COS_REGION;
const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;

const cos =
  bucket && region && secretId && secretKey
    ? new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      })
    : null;

function createSignedUploadUrl(key: string, contentType: string) {
  if (!cos || !bucket || !region) {
    throw new Error("COS is not configured.");
  }

  return cos.getObjectUrl({
    Bucket: bucket,
    Region: region,
    Key: key,
    Method: "PUT",
    Sign: true,
    Expires: 900,
    Headers: {
      "Content-Type": contentType,
    },
  });
}

export async function POST(request: Request) {
  try {
    if (!cos || !bucket || !region) {
      return NextResponse.json(
        {
          error: "COS 环境变量还没有配置完整，请检查 .env.local。",
        },
        { status: 500 },
      );
    }

    const sessionToken = readCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
    const session = verifySessionToken(sessionToken);

    if (!session) {
      return NextResponse.json(
        {
          error: "请先登录后再上传文件。",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key")?.trim();
    const contentType = searchParams.get("contentType")?.trim() || "application/octet-stream";

    if (!key) {
      return NextResponse.json(
        {
          error: "没有找到要上传的 COS key。",
        },
        { status: 400 },
      );
    }

    const uploadUrl = createSignedUploadUrl(key, contentType);
    const upstreamResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: request.body,
      duplex: "half",
    } as any);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: errorText || `COS 上传失败，状态码 ${upstreamResponse.status}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败。";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}