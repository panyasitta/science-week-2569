import { NextRequest, NextResponse } from "next/server";
import { getPublicDirectory, getRuntimeEnv } from "../../lib/activity-store";
import type { ActivityPayload } from "../../lib/content-model";

function absoluteDocumentLinks(directory: Record<string, ActivityPayload>, origin: string): Record<string, ActivityPayload> {
  for (const activity of Object.values(directory)) {
    for (const resource of activity.competition.resources ?? []) {
      if (resource.url.startsWith("/api/documents?")) resource.url = `${origin}${resource.url}`;
    }
    if (activity.result.documentUrl?.startsWith("/api/documents?")) {
      activity.result.documentUrl = `${origin}${activity.result.documentUrl}`;
    }
  }
  return directory;
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const allowedOrigin = getRuntimeEnv().PUBLIC_DATA_CORS_ORIGIN || "https://panyasitta.github.io";
  const requestOrigin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, max-age=0",
    Vary: "Origin",
  };
}

export async function GET(request: NextRequest) {
  try {
    const activities = absoluteDocumentLinks(await getPublicDirectory(), new URL(request.url).origin);
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      activities,
    }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("public-data", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลล่าสุดได้" }, { status: 500, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
