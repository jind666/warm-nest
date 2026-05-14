import COS from "cos-nodejs-sdk-v5";
import { NextResponse } from "next/server";
import { type Entry } from "@/lib/warm-nest-model";
import { createWarmNestStore } from "@/lib/warm-nest-store";
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

function requireSession(request: Request) {
  const sessionToken = readCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return verifySessionToken(sessionToken);
}

function withSignedUrls(entries: Entry[]) {
  if (!cos || !bucket || !region) {
    return entries;
  }

  return entries.map((entry) => ({
    ...entry,
    media: entry.media.map((item) =>
      item.key
        ? {
            ...item,
            url: cos.getObjectUrl({
              Bucket: bucket,
              Region: region,
              Key: item.key,
              Sign: true,
              Expires: 900,
              Method: "GET",
            }),
          }
        : item,
    ),
  }));
}

const warmNestStore = createWarmNestStore();

export async function GET(request: Request) {
  const session = requireSession(request);

  if (!session) {
    return NextResponse.json({ error: "请先登录后再查看内容。" }, { status: 401 });
  }

  const entries = await warmNestStore.loadEntries();
  return NextResponse.json({ entries: withSignedUrls(entries) });
}

export async function POST(request: Request) {
  const session = requireSession(request);

  if (!session) {
    return NextResponse.json({ error: "请先登录后再保存内容。" }, { status: 401 });
  }

  const body = (await request.json()) as
    | {
        action: "addEntry";
        entry: Omit<Entry, "id">;
      }
    | {
        action: "deleteEntry";
        entryId: number;
      }
    | {
        action: "addComment";
        entryId: number;
        comment: string;
      }
    | {
        action: "deleteComment";
        entryId: number;
        commentIndex: number;
      };

  if (body.action === "addEntry") {
    const nextEntries = await warmNestStore.addEntry(body.entry);
    return NextResponse.json({ entries: withSignedUrls(nextEntries), entry: withSignedUrls(nextEntries)[0] });
  }

  if (body.action === "deleteEntry") {
    const nextEntries = await warmNestStore.deleteEntry(body.entryId);
    return NextResponse.json({ entries: withSignedUrls(nextEntries) });
  }

  if (body.action === "deleteComment") {
    const nextEntries = await warmNestStore.deleteComment(body.entryId, body.commentIndex);
    return NextResponse.json({ entries: withSignedUrls(nextEntries) });
  }

  const trimmedComment = body.comment.trim();
  if (!trimmedComment) {
    return NextResponse.json({ error: "评论不能为空。" }, { status: 400 });
  }

  const nextEntries = await warmNestStore.addComment(body.entryId, trimmedComment);
  return NextResponse.json({ entries: withSignedUrls(nextEntries) });
}
