import { NextRequest, NextResponse } from "next/server";
import { competitions } from "../../competitions";
import { getRuntimeEnv, listPublishedCertificates } from "../../lib/activity-store";
import type { PublicCertificate } from "../../lib/certificate-model";

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
    const origin = new URL(request.url).origin;
    const activities = new Map(competitions.map((activity) => [activity.id, activity]));
    const certificates: PublicCertificate[] = (await listPublishedCertificates()).map((certificate) => {
      const activity = activities.get(certificate.activityId);
      return {
        id: certificate.id,
        activityId: certificate.activityId,
        activityTitle: activity?.shortTitle ?? certificate.activityId,
        activityLevel: activity?.levelLabel ?? "",
        recipientName: certificate.recipientName,
        recipientRoom: certificate.recipientRoom,
        teamName: certificate.teamName,
        award: certificate.award,
        fileName: certificate.fileName,
        sizeBytes: certificate.sizeBytes,
        createdAt: certificate.createdAt,
        publishedAt: certificate.publishedAt,
        downloadUrl: `${origin}/api/certificates/download?id=${encodeURIComponent(certificate.id)}`,
      };
    });
    return NextResponse.json({ generatedAt: new Date().toISOString(), certificates }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("public-certificates", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดรายการเกียรติบัตรได้" }, { status: 500, headers: corsHeaders(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
