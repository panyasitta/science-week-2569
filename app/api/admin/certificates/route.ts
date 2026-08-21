import { NextRequest, NextResponse } from "next/server";
import {
  deleteCertificate,
  listCertificates,
  publishAllCertificates,
  saveCertificate,
  updateCertificate,
} from "../../../lib/activity-store";
import type { CertificateMetadata, CertificateStatus } from "../../../lib/certificate-model";
import { isActivityId } from "../../../lib/content-model";
import { requestIsSameOrigin, verifyJudgeSession } from "../../../lib/judge-auth";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

function text(value: unknown, maxLength: number, required = false): string {
  const clean = typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
  if (required && !clean) throw new Error("กรุณาระบุชื่อผู้รับเกียรติบัตร");
  return clean;
}

function status(value: unknown): CertificateStatus {
  return value === "published" ? "published" : "draft";
}

function metadataFrom(values: { recipientName?: unknown; recipientRoom?: unknown; teamName?: unknown; award?: unknown; status?: unknown }): CertificateMetadata {
  return {
    recipientName: text(values.recipientName, 180, true),
    recipientRoom: text(values.recipientRoom, 120),
    teamName: text(values.teamName, 180),
    award: text(values.award, 180),
    status: status(values.status),
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "จัดการเกียรติบัตรไม่สำเร็จ";
  const isInputError = message.startsWith("กรุณา") || message.startsWith("รองรับ") || message.includes("ขนาด");
  if (!isInputError) console.error("admin-certificates", error);
  return NextResponse.json({ error: isInputError ? message : "จัดการเกียรติบัตรไม่สำเร็จ กรุณาลองใหม่" }, { status: isInputError ? 400 : 500 });
}

export async function GET(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  const activityId = request.nextUrl.searchParams.get("activityId") ?? "";
  if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
  try {
    return NextResponse.json({ certificates: await listCertificates(activityId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });
  try {
    const form = await request.formData();
    const activityId = String(form.get("activityId") ?? "");
    const file = form.get("file");
    if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
    if (!(file instanceof File)) throw new Error("กรุณาเลือกไฟล์ PDF");
    if (!file.size || file.size > MAX_FILE_BYTES) throw new Error("ไฟล์ PDF ต้องมีขนาดไม่เกิน 15 MB");
    if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("รองรับไฟล์เกียรติบัตรรูปแบบ PDF เท่านั้น");
    const certificate = await saveCertificate(activityId, metadataFrom({
      recipientName: form.get("recipientName"),
      recipientRoom: form.get("recipientRoom"),
      teamName: form.get("teamName"),
      award: form.get("award"),
      status: form.get("status"),
    }), file, judge.name);
    return NextResponse.json({ certificate });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "publish_all") {
      const activityId = typeof body.activityId === "string" ? body.activityId : "";
      if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
      return NextResponse.json({ published: await publishAllCertificates(activityId, judge.name) });
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ไม่พบเกียรติบัตร" }, { status: 404 });
    const certificate = await updateCertificate(id, metadataFrom(body), judge.name);
    if (!certificate) return NextResponse.json({ error: "ไม่พบเกียรติบัตร" }, { status: 404 });
    return NextResponse.json({ certificate });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ไม่พบเกียรติบัตร" }, { status: 404 });
  try {
    await deleteCertificate(id, judge.name);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
