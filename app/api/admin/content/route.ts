import { NextRequest, NextResponse } from "next/server";
import {
  ContentConflictError,
  getActivityState,
  listActivitySummaries,
  listAuditLogs,
  listCertificates,
  listDocuments,
  publishActivity,
  restorePublishedDraft,
  saveActivityDraft,
} from "../../../lib/activity-store";
import { isActivityId } from "../../../lib/content-model";
import { ContentValidationError, validateActivityPayload } from "../../../lib/content-validation";
import { requestIsSameOrigin, verifyJudgeSession } from "../../../lib/judge-auth";

function errorResponse(error: unknown) {
  if (error instanceof ContentValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ContentConflictError) return NextResponse.json({ error: error.message, conflict: true }, { status: 409 });
  console.error("admin-content", error);
  return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });

  try {
    const activityId = request.nextUrl.searchParams.get("activityId");
    if (!activityId) {
      return NextResponse.json({
        judge,
        activities: await listActivitySummaries(),
        auditLogs: await listAuditLogs(),
      });
    }
    if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
    return NextResponse.json({
      judge,
      state: await getActivityState(activityId),
      documents: await listDocuments(activityId),
      certificates: await listCertificates(activityId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });

  try {
    const body = await request.json() as { activityId?: unknown; payload?: unknown; expectedRevision?: unknown };
    const activityId = typeof body.activityId === "string" ? body.activityId : "";
    if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new ContentValidationError("เลขรุ่นข้อมูลไม่ถูกต้อง กรุณาโหลดหน้าใหม่");
    const payload = validateActivityPayload(body.payload, activityId);
    return NextResponse.json({ state: await saveActivityDraft(activityId, payload, expectedRevision, judge.name) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });

  try {
    const body = await request.json() as { action?: unknown; activityId?: unknown; payload?: unknown; expectedRevision?: unknown };
    const activityId = typeof body.activityId === "string" ? body.activityId : "";
    if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new ContentValidationError("เลขรุ่นข้อมูลไม่ถูกต้อง กรุณาโหลดหน้าใหม่");

    if (body.action === "publish") {
      const payload = validateActivityPayload(body.payload, activityId);
      return NextResponse.json({ state: await publishActivity(activityId, payload, expectedRevision, judge.name) });
    }
    if (body.action === "restore") {
      return NextResponse.json({ state: await restorePublishedDraft(activityId, expectedRevision, judge.name) });
    }
    throw new ContentValidationError("คำสั่งจัดการข้อมูลไม่ถูกต้อง");
  } catch (error) {
    return errorResponse(error);
  }
}
