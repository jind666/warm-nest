import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "warm-nest-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const appUsername = process.env.APP_LOGIN_USERNAME ?? "pjdizwj";
const appPassword = process.env.APP_LOGIN_PASSWORD;
const sessionSecret = process.env.APP_SESSION_SECRET;

export function getLoginUsername() {
  return appUsername;
}

export function validateLogin(username: string, password: string) {
  return Boolean(appPassword) && username === appUsername && password === appPassword;
}

function getSessionSecret() {
  if (!sessionSecret) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  return sessionSecret;
}

function signSessionValue(payload: string) {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(username: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${username}.${issuedAt}`;
  const signature = signSessionValue(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [username, issuedAtText, signature] = parts;
  const issuedAt = Number(issuedAtText);

  if (!username || !Number.isFinite(issuedAt)) {
    return null;
  }

  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < 0 || age > SESSION_MAX_AGE_SECONDS) {
    return null;
  }

  const expectedSignature = signSessionValue(`${username}.${issuedAt}`);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  return {
    username,
    issuedAt,
  };
}

export function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawKey, ...rawValueParts] = cookie.trim().split("=");
    if (rawKey === name) {
      return rawValueParts.join("=");
    }
  }

  return undefined;
}
