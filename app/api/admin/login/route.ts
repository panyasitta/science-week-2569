import { NextRequest, NextResponse } from "next/server";
import { clearLoginFailures, loginAttemptState, recordLoginFailure } from "../../../lib/activity-store";
import { accessCodeMatches, clientRateLimitKey, createJudgeSession, requestIsSameOrigin, sessionCookie } from "../../../lib/judge-auth";

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });

  try {
    const body = await request.json() as { name?: unknown; accessCode?: unknown };
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const accessCode = typeof body.accessCode === "string" ? body.accessCode : "";
    if (name.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อกรรมการอย่างน้อย 2 ตัวอักษร" }, { status: 400 });
    if (!accessCode) return NextResponse.json({ error: "กรุณากรอกรหัสกรรมการ" }, { status: 400 });

    const clientKey = await clientRateLimitKey(request);
    const attempt = await loginAttemptState(clientKey);
    if (attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
      const waitMinutes = Math.max(1, Math.ceil((attempt.blockedUntil - Date.now()) / 60_000));
      return NextResponse.json({ error: `กรอกรหัสผิดหลายครั้ง กรุณารอ ${waitMinutes} นาที` }, { status: 429 });
    }
    if (attempt.blockedUntil && attempt.blockedUntil <= Date.now()) await clearLoginFailures(clientKey);

    if (!await accessCodeMatches(accessCode)) {
      const blockedUntil = await recordLoginFailure(clientKey);
      return NextResponse.json({ error: blockedUntil ? "กรอกรหัสผิดครบ 5 ครั้ง ระบบพักการเข้าสู่ระบบ 15 นาที" : "ชื่อหรือรหัสกรรมการไม่ถูกต้อง" }, { status: 401 });
    }

    await clearLoginFailures(clientKey);
    const { token, maxAge, session } = await createJudgeSession(name);
    const response = NextResponse.json({ session });
    response.cookies.set({ ...sessionCookie(), value: token, maxAge });
    return response;
  } catch (error) {
    console.error("judge-login", error);
    return NextResponse.json({ error: "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาติดต่อผู้ดูแล" }, { status: 500 });
  }
}
