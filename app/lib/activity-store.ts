import { env } from "cloudflare:workers";
import {
  activityIds,
  getDefaultActivityPayload,
  getDefaultPublicDirectory,
  summarizeActivity,
  type ActivityAdminState,
  type ActivityPayload,
  type ActivitySummary,
  type AuditLogEntry,
} from "./content-model";

type RuntimeEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JUDGE_ACCESS_CODE?: string;
  JUDGE_SESSION_SECRET?: string;
  PUBLIC_DATA_CORS_ORIGIN?: string;
};

type ActivityRow = {
  activity_id: string;
  draft_json: string;
  published_json: string | null;
  status: "draft" | "published";
  revision: number;
  updated_at: string;
  updated_by: string;
  published_at: string | null;
  published_by: string | null;
};

type DocumentRow = {
  id: string;
  activity_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  object_key: string;
  created_at: string;
  created_by: string;
};

export type StoredDocument = {
  id: string;
  activityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
  createdAt: string;
  createdBy: string;
};

export class ContentConflictError extends Error {
  constructor(message = "ข้อมูลถูกแก้ไขจากอุปกรณ์อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองอีกครั้ง") {
    super(message);
    this.name = "ContentConflictError";
  }
}

export class DocumentInUseError extends Error {
  constructor(message = "เอกสารนี้ยังถูกใช้ในฉบับร่างหรือข้อมูลที่เผยแพร่ กรุณานำลิงก์ออกและเผยแพร่ข้อมูลใหม่ก่อนลบไฟล์") {
    super(message);
    this.name = "DocumentInUseError";
  }
}

export function getRuntimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

function database(): D1Database {
  const db = getRuntimeEnv().DB;
  if (!db) throw new Error("ไม่พบการเชื่อมต่อฐานข้อมูล DB");
  return db;
}

export async function ensureStore(): Promise<void> {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS activity_content (
      activity_id TEXT PRIMARY KEY,
      draft_json TEXT NOT NULL,
      published_json TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      published_at TEXT,
      published_by TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      object_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS documents_activity_id_idx ON documents (activity_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      activity_id TEXT,
      action TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      revision INTEGER,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_logs_activity_id_idx ON audit_logs (activity_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS judge_login_attempts (
      client_key TEXT PRIMARY KEY,
      failures INTEGER NOT NULL DEFAULT 0,
      blocked_until INTEGER,
      updated_at INTEGER NOT NULL
    )`),
  ]);
}

function parsePayload(value: string | null, fallback: ActivityPayload): ActivityPayload {
  if (!value) return structuredClone(fallback);
  try {
    return JSON.parse(value) as ActivityPayload;
  } catch {
    return structuredClone(fallback);
  }
}

function rowToState(activityId: string, row: ActivityRow | null): ActivityAdminState {
  const fallback = getDefaultActivityPayload(activityId);
  if (!row) {
    return {
      activityId,
      draft: structuredClone(fallback),
      published: structuredClone(fallback),
      status: "published",
      revision: 0,
      updatedAt: null,
      updatedBy: null,
      publishedAt: null,
      publishedBy: null,
    };
  }
  const published = parsePayload(row.published_json, fallback);
  return {
    activityId,
    draft: parsePayload(row.draft_json, published),
    published,
    status: row.status,
    revision: row.revision,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
  };
}

async function activityRow(activityId: string): Promise<ActivityRow | null> {
  await ensureStore();
  return database().prepare("SELECT * FROM activity_content WHERE activity_id = ?").bind(activityId).first<ActivityRow>();
}

export async function getActivityState(activityId: string): Promise<ActivityAdminState> {
  return rowToState(activityId, await activityRow(activityId));
}

export async function listActivitySummaries(): Promise<ActivitySummary[]> {
  await ensureStore();
  const rows = await database().prepare("SELECT * FROM activity_content").all<ActivityRow>();
  const byId = new Map(rows.results.map((row) => [row.activity_id, row]));
  return activityIds.map((activityId) => summarizeActivity(rowToState(activityId, byId.get(activityId) ?? null))).sort((a, b) => a.order - b.order);
}

function auditStatement(db: D1Database, activityId: string | null, action: string, actorName: string, summary: string, revision: number | null) {
  return db.prepare("INSERT INTO audit_logs (id, activity_id, action, actor_name, summary, revision, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), activityId, action, actorName, summary, revision, new Date().toISOString());
}

export async function saveActivityDraft(activityId: string, payload: ActivityPayload, expectedRevision: number, actorName: string): Promise<ActivityAdminState> {
  await ensureStore();
  const db = database();
  const row = await activityRow(activityId);
  if ((row?.revision ?? 0) !== expectedRevision) throw new ContentConflictError();
  const now = new Date().toISOString();
  const nextRevision = expectedRevision + 1;
  const json = JSON.stringify(payload);

  if (!row) {
    const publishedJson = JSON.stringify(getDefaultActivityPayload(activityId));
    await db.batch([
      db.prepare("INSERT INTO activity_content (activity_id, draft_json, published_json, status, revision, updated_at, updated_by) VALUES (?, ?, ?, 'draft', ?, ?, ?)")
        .bind(activityId, json, publishedJson, nextRevision, now, actorName),
      auditStatement(db, activityId, "save_draft", actorName, "บันทึกข้อมูลฉบับร่างครั้งแรก", nextRevision),
    ]);
  } else {
    const result = await db.prepare("UPDATE activity_content SET draft_json = ?, status = 'draft', revision = ?, updated_at = ?, updated_by = ? WHERE activity_id = ? AND revision = ?")
      .bind(json, nextRevision, now, actorName, activityId, expectedRevision).run();
    if (!result.meta.changes) throw new ContentConflictError();
    await auditStatement(db, activityId, "save_draft", actorName, "บันทึกการแก้ไขเป็นฉบับร่าง", nextRevision).run();
  }
  return getActivityState(activityId);
}

export async function publishActivity(activityId: string, payload: ActivityPayload, expectedRevision: number, actorName: string): Promise<ActivityAdminState> {
  await ensureStore();
  const db = database();
  const row = await activityRow(activityId);
  if ((row?.revision ?? 0) !== expectedRevision) throw new ContentConflictError();
  const now = new Date().toISOString();
  const nextRevision = expectedRevision + 1;
  const json = JSON.stringify(payload);

  if (!row) {
    await db.batch([
      db.prepare("INSERT INTO activity_content (activity_id, draft_json, published_json, status, revision, updated_at, updated_by, published_at, published_by) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?)")
        .bind(activityId, json, json, nextRevision, now, actorName, now, actorName),
      auditStatement(db, activityId, "publish", actorName, "เผยแพร่ข้อมูลกิจกรรมครั้งแรก", nextRevision),
    ]);
  } else {
    const result = await db.prepare("UPDATE activity_content SET draft_json = ?, published_json = ?, status = 'published', revision = ?, updated_at = ?, updated_by = ?, published_at = ?, published_by = ? WHERE activity_id = ? AND revision = ?")
      .bind(json, json, nextRevision, now, actorName, now, actorName, activityId, expectedRevision).run();
    if (!result.meta.changes) throw new ContentConflictError();
    await auditStatement(db, activityId, "publish", actorName, "ตรวจทานและเผยแพร่ข้อมูลสู่หน้าเว็บไซต์", nextRevision).run();
  }
  return getActivityState(activityId);
}

export async function restorePublishedDraft(activityId: string, expectedRevision: number, actorName: string): Promise<ActivityAdminState> {
  await ensureStore();
  const db = database();
  const row = await activityRow(activityId);
  if (!row || !row.published_json) throw new Error("ยังไม่มีข้อมูลที่เผยแพร่สำหรับเรียกคืน");
  if (row.revision !== expectedRevision) throw new ContentConflictError();
  const now = new Date().toISOString();
  const nextRevision = expectedRevision + 1;
  const result = await db.prepare("UPDATE activity_content SET draft_json = published_json, status = 'published', revision = ?, updated_at = ?, updated_by = ? WHERE activity_id = ? AND revision = ?")
    .bind(nextRevision, now, actorName, activityId, expectedRevision).run();
  if (!result.meta.changes) throw new ContentConflictError();
  await auditStatement(db, activityId, "restore", actorName, "ยกเลิกฉบับร่างและเรียกคืนข้อมูลที่เผยแพร่ล่าสุด", nextRevision).run();
  return getActivityState(activityId);
}

export async function getPublicDirectory(): Promise<Record<string, ActivityPayload>> {
  await ensureStore();
  const defaults = getDefaultPublicDirectory();
  const rows = await database().prepare("SELECT activity_id, published_json FROM activity_content WHERE published_json IS NOT NULL").all<Pick<ActivityRow, "activity_id" | "published_json">>();
  for (const row of rows.results) {
    if (!defaults[row.activity_id] || !row.published_json) continue;
    defaults[row.activity_id] = parsePayload(row.published_json, defaults[row.activity_id]);
  }
  return defaults;
}

export async function listAuditLogs(limit = 80): Promise<AuditLogEntry[]> {
  await ensureStore();
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const rows = await database().prepare("SELECT id, activity_id, action, actor_name, summary, revision, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?")
    .bind(safeLimit).all<{ id: string; activity_id: string | null; action: string; actor_name: string; summary: string; revision: number | null; created_at: string }>();
  return rows.results.map((row) => ({ id: row.id, activityId: row.activity_id, action: row.action, actorName: row.actor_name, summary: row.summary, revision: row.revision, createdAt: row.created_at }));
}

function mapDocument(row: DocumentRow): StoredDocument {
  return { id: row.id, activityId: row.activity_id, fileName: row.file_name, contentType: row.content_type, sizeBytes: row.size_bytes, objectKey: row.object_key, createdAt: row.created_at, createdBy: row.created_by };
}

export async function saveDocument(activityId: string, file: File, actorName: string): Promise<StoredDocument> {
  await ensureStore();
  const bucket = getRuntimeEnv().BUCKET;
  if (!bucket) throw new Error("ไม่พบพื้นที่จัดเก็บเอกสาร BUCKET");
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^\p{L}\p{N}._()\- ]/gu, "_").slice(0, 180) || "document";
  const objectKey = `science-week-2569/${activityId}/${id}/${safeName}`;
  const now = new Date().toISOString();
  await bucket.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream", contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(safeName)}` } });
  await database().batch([
    database().prepare("INSERT INTO documents (id, activity_id, file_name, content_type, size_bytes, object_key, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, activityId, safeName, file.type || "application/octet-stream", file.size, objectKey, now, actorName),
    auditStatement(database(), activityId, "upload_document", actorName, `อัปโหลดเอกสาร ${safeName}`, null),
  ]);
  return { id, activityId, fileName: safeName, contentType: file.type || "application/octet-stream", sizeBytes: file.size, objectKey, createdAt: now, createdBy: actorName };
}

export async function listDocuments(activityId: string): Promise<StoredDocument[]> {
  await ensureStore();
  const rows = await database().prepare("SELECT * FROM documents WHERE activity_id = ? ORDER BY created_at DESC").bind(activityId).all<DocumentRow>();
  return rows.results.map(mapDocument);
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  await ensureStore();
  const row = await database().prepare("SELECT * FROM documents WHERE id = ?").bind(id).first<DocumentRow>();
  return row ? mapDocument(row) : null;
}

export async function deleteDocument(id: string, actorName: string): Promise<void> {
  await ensureStore();
  const document = await getDocument(id);
  if (!document) return;
  const contentRows = await database().prepare("SELECT draft_json, published_json FROM activity_content WHERE activity_id = ?")
    .bind(document.activityId).all<{ draft_json: string; published_json: string | null }>();
  const documentLink = `/api/documents?id=${id}`;
  if (contentRows.results.some((row) => row.draft_json.includes(documentLink) || row.published_json?.includes(documentLink))) {
    throw new DocumentInUseError();
  }
  await getRuntimeEnv().BUCKET.delete(document.objectKey);
  await database().batch([
    database().prepare("DELETE FROM documents WHERE id = ?").bind(id),
    auditStatement(database(), document.activityId, "delete_document", actorName, `ลบเอกสาร ${document.fileName}`, null),
  ]);
}

export async function loginAttemptState(clientKey: string): Promise<{ failures: number; blockedUntil: number | null }> {
  await ensureStore();
  const row = await database().prepare("SELECT failures, blocked_until FROM judge_login_attempts WHERE client_key = ?").bind(clientKey).first<{ failures: number; blocked_until: number | null }>();
  return row ? { failures: row.failures, blockedUntil: row.blocked_until } : { failures: 0, blockedUntil: null };
}

export async function recordLoginFailure(clientKey: string): Promise<number | null> {
  await ensureStore();
  const current = await loginAttemptState(clientKey);
  const failures = current.failures + 1;
  const now = Date.now();
  const blockedUntil = failures >= 5 ? now + 15 * 60_000 : null;
  await database().prepare(`INSERT INTO judge_login_attempts (client_key, failures, blocked_until, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(client_key) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`)
    .bind(clientKey, failures, blockedUntil, now).run();
  return blockedUntil;
}

export async function clearLoginFailures(clientKey: string): Promise<void> {
  await ensureStore();
  await database().prepare("DELETE FROM judge_login_attempts WHERE client_key = ?").bind(clientKey).run();
}
