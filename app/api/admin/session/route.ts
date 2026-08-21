import { NextRequest, NextResponse } from "next/server";
import { requestIsSameOrigin, sessionCookie, verifyJudgeSession } from "../../../lib/judge-auth";

export async function GET(request: NextRequest) {
  const session = await verifyJudgeSession(request);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, session });
}

export async function DELETE(request: NextRequest) {
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({ ...sessionCookie(), value: "", maxAge: 0 });
  return response;
}
