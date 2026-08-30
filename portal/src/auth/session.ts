import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../config.js";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const exp = Date.now() + config.sessionDays * 24 * 60 * 60 * 1000;
  const body = JSON.stringify({ ...payload, exp });
  const encoded = Buffer.from(body).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.userId || !payload.email || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, payload: Omit<SessionPayload, "exp">) {
  const token = createSessionToken(payload);
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.appUrl.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(config.cookieName, { path: "/" });
}

export function getSession(req: Request): SessionPayload | null {
  return parseSessionToken(req.cookies?.[config.cookieName]);
}

export function generatePassword(length = 16): string {
  return randomBytes(length).toString("base64url").slice(0, length);
}
