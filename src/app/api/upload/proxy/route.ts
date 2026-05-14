import COS from "cos-nodejs-sdk-v5";
import { NextResponse } from "next/server";
import { readCookieValue, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { normalizeCosRegion } from "@/lib/cos-region";

export const runtime = "nodejs";

const bucket = process.env.NEXT_PUBLIC_COS_BUCKET;
const region = normalizeCosRegion(process.env.NEXT_PUBLIC_COS_REGION);
const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;

const cos =
  bucket && region && secretId && secretKey
    ? new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      })
    : null;

function serializeUploadError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    return {
      message: "上传失败。",
      details: Object.fromEntries(
        Object.entries(error).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
      ),
    };
  }

  return {
    message: typeof error === "string" ? error : "上传失败。",
  };
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

    const bodyBuffer = Buffer.from(await request.arrayBuffer());

    await cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const payload = serializeUploadError(error);

    return NextResponse.json(
      { error: payload.message, ...payload },
      { status: 500 },
    );
  }
}