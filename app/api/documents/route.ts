import { NextRequest, NextResponse } from "next/server";
import { getDocument, getRuntimeEnv } from "../../lib/activity-store";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });

  try {
    const document = await getDocument(id);
    if (!document) return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
    const object = await getRuntimeEnv().BUCKET.get(document.objectKey);
    if (!object) return NextResponse.json({ error: "ไม่พบไฟล์เอกสาร" }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": document.contentType,
        "Content-Length": String(document.sizeBytes),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("serve-document", error);
    return NextResponse.json({ error: "เปิดเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
