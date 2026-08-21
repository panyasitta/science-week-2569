import type { NextRequest } from "next/server";
import { getRuntimeEnv } from "./activity-store";

const COOKIE_NAME = "science_judge_session";
const SESSION_SECONDS = 8 * 60 * 60;

export type JudgeSession = {
  name: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionPayload = JudgeSession & {
  accessVersion: string;
};

function secretConfig(): { accessCode: string; sessionSecret: string } {
  const runtime = getRuntimeEnv();
  const accessCode = runtime.JUDGE_ACCESS_CODE?.trim();
  const sessionSecret = runtime.JUDGE_SESSION_SECRET?.trim();
  if (!accessCode || !sessionSecret) throw new Error("ระบบเข้าสู่ระบบยังไม่ได้ตั้งค่ารหัสกรรมการ");
  return { accessCode, sessionSecret };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}

export async function accessCodeMatches(candidate: string): Promise<boolean> {
  const { accessCode } = secretConfig();
  return equalBytes(await digest(candidate.trim()), await digest(accessCode));
}

async function accessVersion(): Promise<string> {
  const { accessCode, sessionSecret } = secretConfig();
  return (await hmac(`access:${accessCode}`, sessionSecret)).slice(0, 18);
}

export async function createJudgeSession(name: string): Promise<{ token: string; maxAge: number; session: JudgeSession }> {
  const { sessionSecret } = secretConfig();
  const now = Math.floor(Date.now() / 1_000);
  const payload: SessionPayload = {
    name: name.trim().slice(0, 120),
    issuedAt: now,
    expiresAt: now + SESSION_SECONDS,
    accessVersion: await accessVersion(),
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(encoded, sessionSecret);
  return { token: `${encoded}.${signature}`, maxAge: SESSION_SECONDS, session: payload };
}

export async function verifyJudgeSession(request: NextRequest): Promise<JudgeSession | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;

  try {
    const { sessionSecret } = secretConfig();
    const expectedSignature = await hmac(encoded, sessionSecret);
    if (!equalBytes(new TextEncoder().encode(signature), new TextEncoder().encode(expectedSignature))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    const now = Math.floor(Date.now() / 1_000);
    if (!payload.name || payload.expiresAt <= now || payload.issuedAt > now + 60) return null;
    if (payload.accessVersion !== await accessVersion()) return null;
    return { name: payload.name, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export function sessionCookie() {
  return { name: COOKIE_NAME, path: "/", httpOnly: true, secure: true, sameSite: "strict" as const };
}

export function requestIsSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function clientRateLimitKey(request: NextRequest): Promise<string> {
  const { sessionSecret } = secretConfig();
  const clientAddress = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return (await hmac(`client:${clientAddress}`, sessionSecret)).slice(0, 32);
}
