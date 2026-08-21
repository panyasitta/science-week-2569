import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const activityContent = sqliteTable("activity_content", {
  activityId: text("activity_id").primaryKey(),
  draftJson: text("draft_json").notNull(),
  publishedJson: text("published_json"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  activityId: text("activity_id").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  objectKey: text("object_key").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
}, (table) => [
  index("documents_activity_id_idx").on(table.activityId),
]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  activityId: text("activity_id"),
  action: text("action").notNull(),
  actorName: text("actor_name").notNull(),
  summary: text("summary").notNull(),
  revision: integer("revision"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("audit_logs_created_at_idx").on(table.createdAt),
  index("audit_logs_activity_id_idx").on(table.activityId),
]);

export const judgeLoginAttempts = sqliteTable("judge_login_attempts", {
  clientKey: text("client_key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  blockedUntil: integer("blocked_until"),
  updatedAt: integer("updated_at").notNull(),
});
