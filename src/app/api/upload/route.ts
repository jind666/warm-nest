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

function uploadObject({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  if (!cos || !bucket || !region) {
    throw new Error("COS is not configured.");
  }

  return new Promise<COS.PutObjectResult>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
      (error, data) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(data);
      },
    );
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

    const formData = await request.formData();
    const file = formData.get("file");
    const date = String(formData.get("date") ?? "undated");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "没有找到要上传的文件。",
        },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const safeName = sanitizeFileName(file.name || `upload-${randomUUID()}`);
    const key = `memories/${date}/${randomUUID()}-${safeName}`;

    await uploadObject({
      key,
      body: fileBuffer,
      contentType: file.type || "application/octet-stream",
    });

    const signedUrl = cos.getObjectUrl({
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
      url: signedUrl,
      bucket,
      region,
      size: file.size,
      contentType: file.type,
      fileName: file.name,
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