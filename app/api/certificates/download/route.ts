import { NextRequest, NextResponse } from "next/server";
import { getCertificate, getRuntimeEnv } from "../../../lib/activity-store";
import { verifyJudgeSession } from "../../../lib/judge-auth";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ไม่พบเกียรติบัตร" }, { status: 404 });
  try {
    const certificate = await getCertificate(id);
    if (!certificate) return NextResponse.json({ error: "ไม่พบเกียรติบัตร" }, { status: 404 });
    if (certificate.status !== "published" && !(await verifyJudgeSession(request))) {
      return NextResponse.json({ error: "เกียรติบัตรนี้ยังไม่เผยแพร่" }, { status: 404 });
    }
    const object = await getRuntimeEnv().BUCKET.get(certificate.objectKey);
    if (!object) return NextResponse.json({ error: "ไม่พบไฟล์เกียรติบัตร" }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(certificate.sizeBytes),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(certificate.fileName)}`,
        "Cache-Control": certificate.status === "published" ? "public, max-age=3600" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("download-certificate", error);
    return NextResponse.json({ error: "ดาวน์โหลดเกียรติบัตรไม่สำเร็จ" }, { status: 500 });
  }
}
