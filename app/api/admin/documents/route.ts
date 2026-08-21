import { NextRequest, NextResponse } from "next/server";
import { deleteDocument, DocumentInUseError, saveDocument } from "../../../lib/activity-store";
import { isActivityId } from "../../../lib/content-model";
import { requestIsSameOrigin, verifyJudgeSession } from "../../../lib/judge-auth";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg", "webp"]);

export async function POST(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });

  try {
    const form = await request.formData();
    const activityId = String(form.get("activityId") ?? "");
    const file = form.get("file");
    if (!isActivityId(activityId)) return NextResponse.json({ error: "ไม่พบกิจกรรมที่เลือก" }, { status: 404 });
    if (!(file instanceof File)) return NextResponse.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
    if (!file.size || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 15 MB" }, { status: 400 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return NextResponse.json({ error: "รองรับไฟล์ PDF, Word, Excel, PowerPoint และรูปภาพ" }, { status: 400 });

    const document = await saveDocument(activityId, file, judge.name);
    return NextResponse.json({
      document,
      url: `${new URL(request.url).origin}/api/documents?id=${encodeURIComponent(document.id)}`,
    });
  } catch (error) {
    console.error("upload-document", error);
    return NextResponse.json({ error: "อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const judge = await verifyJudgeSession(request);
  if (!judge) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  if (!requestIsSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ได้มาจากเว็บไซต์นี้" }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 400 });
  try {
    await deleteDocument(id, judge.name);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof DocumentInUseError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("delete-document", error);
    return NextResponse.json({ error: "ลบเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
