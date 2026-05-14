import COS from "cos-nodejs-sdk-v5";
import { randomUUID } from "crypto";
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

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

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

    const body = (await request.json()) as {
      date?: string;
      fileName?: string;
      contentType?: string;
    };

    const date = String(body.date ?? "undated");
    const fileName = body.fileName?.trim();
    const contentType = body.contentType?.trim() || "application/octet-stream";

    if (!fileName) {
      return NextResponse.json(
        {
          error: "没有找到文件名。",
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(fileName || `upload-${randomUUID()}`);
    const key = `memories/${date}/${randomUUID()}-${safeName}`;

    const uploadUrl = createSignedUploadUrl(key, contentType);
    const previewUrl = cos.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Sign: true,
      Expires: 900,
      Method: "GET",
    });

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl,
      previewUrl,
      bucket,
      region,
      contentType,
      fileName,
    });
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