import type { Competition, ResourceLink, RuleSection, ScoreRow } from "../competitions";
import type { ActivityParticipants, ParticipantMember, ParticipantTeam } from "../participants";
import type { ActivityResult, ResultEntry, ResultMember } from "../results";
import { getDefaultActivityPayload, type ActivityPayload } from "./content-model";

export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContentValidationError(`${label} ไม่ถูกต้อง`);
  return value as Record<string, unknown>;
}

function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new ContentValidationError(`${label} ต้องเป็นรายการ`);
  if (value.length > max) throw new ContentValidationError(`${label} มีจำนวนมากเกินกำหนด (${max})`);
  return value;
}

function text(value: unknown, label: string, max = 300, required = false): string {
  if (value === null || value === undefined) {
    if (required) throw new ContentValidationError(`กรุณากรอก${label}`);
    return "";
  }
  if (typeof value !== "string") throw new ContentValidationError(`${label} ไม่ถูกต้อง`);
  const cleaned = value.replace(/\u0000/g, "").trim();
  if (required && !cleaned) throw new ContentValidationError(`กรุณากรอก${label}`);
  if (cleaned.length > max) throw new ContentValidationError(`${label} ยาวเกิน ${max} ตัวอักษร`);
  return cleaned;
}

function optionalText(value: unknown, label: string, max = 300): string | undefined {
  const cleaned = text(value, label, max);
  return cleaned || undefined;
}

function url(value: unknown, label: string): string {
  const cleaned = text(value, label, 1_000);
  if (!cleaned) return "";
  if (cleaned.startsWith("/api/documents?")) return cleaned;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    return parsed.toString();
  } catch {
    throw new ContentValidationError(`${label} ต้องเป็นลิงก์ http หรือ https`);
  }
}

function scoreRows(value: unknown, label: string): ScoreRow[] | undefined {
  if (value === undefined || value === null) return undefined;
  return list(value, label, 40).map((row, index) => {
    const item = object(row, `${label} ลำดับ ${index + 1}`);
    return { label: text(item.label, `ชื่อ${label}`, 500, true), score: text(item.score, `คะแนน${label}`, 80, true) };
  });
}

function resources(value: unknown): ResourceLink[] | undefined {
  if (value === undefined || value === null) return undefined;
  return list(value, "เอกสารและลิงก์", 40).map((resource, index) => {
    const item = object(resource, `เอกสารลำดับ ${index + 1}`);
    return { label: text(item.label, "ชื่อเอกสาร", 250, true), url: url(item.url, "ลิงก์เอกสาร") };
  }).filter((item) => item.url);
}

function ruleSections(value: unknown): RuleSection[] {
  return list(value, "หัวข้อกติกา", 40).map((section, sectionIndex) => {
    const item = object(section, `หัวข้อกติกาลำดับ ${sectionIndex + 1}`);
    return {
      title: text(item.title, "ชื่อหัวข้อกติกา", 250, true),
      items: list(item.items, "รายการกติกา", 100).map((rule, ruleIndex) => text(rule, `กติกาข้อ ${ruleIndex + 1}`, 1_500, true)),
    };
  });
}

function competition(value: unknown, activityId: string): Competition {
  const base = getDefaultActivityPayload(activityId).competition;
  const item = object(value, "ข้อมูลกิจกรรม");
  return {
    ...base,
    date: text(item.date, "วันที่แข่งขัน", 120, true),
    dateShort: text(item.dateShort, "วันที่แบบย่อ", 60, true),
    sortDate: text(item.sortDate, "วันเวลาสำหรับเรียงลำดับ", 80, true),
    time: text(item.time, "เวลาแข่งขัน", 120, true),
    place: text(item.place, "สถานที่แข่งขัน", 250, true),
    team: text(item.team, "รูปแบบทีม", 180, true),
    deadline: optionalText(item.deadline, "กำหนดรับสมัคร", 120),
    sections: ruleSections(item.sections),
    scoreRows: scoreRows(item.scoreRows, "เกณฑ์คะแนน"),
    scoreTotal: optionalText(item.scoreTotal, "คะแนนรวม", 80),
    timePenalties: scoreRows(item.timePenalties, "การหักคะแนน"),
    note: optionalText(item.note, "หมายเหตุ", 2_000),
    resources: resources(item.resources),
  };
}

function participantMember(value: unknown, teamIndex: number, memberIndex: number): ParticipantMember {
  const item = object(value, `ผู้เข้าแข่งขันทีม ${teamIndex + 1} คนที่ ${memberIndex + 1}`);
  const role = optionalText(item.role, "บทบาท", 80);
  if (role && role !== "ผู้สวมใส่" && role !== "ผู้ช่วย") throw new ContentValidationError("บทบาทผู้เข้าแข่งขันไม่ถูกต้อง");
  return {
    name: text(item.name, "ชื่อ–นามสกุลผู้เข้าแข่งขัน", 250, true),
    room: text(item.room, "ชั้น/ห้อง", 120),
    ...(role ? { role: role as ParticipantMember["role"] } : {}),
  };
}

function participantTeam(value: unknown, teamIndex: number): ParticipantTeam {
  const item = object(value, `ทีมลำดับ ${teamIndex + 1}`);
  const members = list(item.members, "สมาชิกทีม", 30).map((member, memberIndex) => participantMember(member, teamIndex, memberIndex));
  if (!members.length) throw new ContentValidationError(`ทีมลำดับ ${teamIndex + 1} ต้องมีผู้เข้าแข่งขันอย่างน้อย 1 คน`);
  return {
    team: text(item.team, "ชื่อหรือหมายเลขทีม", 180, true),
    title: optionalText(item.title, "ชื่อผลงาน", 300),
    members,
  };
}

function participants(value: unknown, activityId: string): ActivityParticipants {
  const item = object(value, "ข้อมูลผู้เข้าแข่งขัน");
  return {
    sourceLabel: getDefaultActivityPayload(activityId).participants.sourceLabel,
    teams: list(item.teams, "รายชื่อทีม", 400).map(participantTeam),
  };
}

function resultMember(value: unknown, entryIndex: number, memberIndex: number): ResultMember {
  const item = object(value, `ผู้ได้รับรางวัลลำดับ ${entryIndex + 1} คนที่ ${memberIndex + 1}`);
  return {
    name: text(item.name, "ชื่อ–นามสกุลผู้ได้รับรางวัล", 250, true),
    room: optionalText(item.room, "ชั้น/ห้อง", 120),
  };
}

function resultEntry(value: unknown, entryIndex: number): ResultEntry {
  const item = object(value, `ผลรางวัลลำดับ ${entryIndex + 1}`);
  const members = list(item.members, "รายชื่อผู้ได้รับรางวัล", 30).map((member, memberIndex) => resultMember(member, entryIndex, memberIndex));
  if (!members.length) throw new ContentValidationError(`ผลรางวัลลำดับ ${entryIndex + 1} ต้องมีรายชื่ออย่างน้อย 1 คน`);
  return {
    award: text(item.award, "ชื่อรางวัล", 180, true),
    team: optionalText(item.team, "ชื่อหรือหมายเลขทีม", 180),
    title: optionalText(item.title, "ชื่อผลงาน", 300),
    members,
    score: optionalText(item.score, "คะแนน", 80),
    note: optionalText(item.note, "หมายเหตุผลการแข่งขัน", 1_000),
  };
}

function result(value: unknown): ActivityResult {
  const item = object(value, "ผลการแข่งขัน");
  const status = item.status === "published" ? "published" : "pending";
  const entries = list(item.entries, "รายการรางวัล", 50).map(resultEntry);
  if (status === "published" && !entries.length) throw new ContentValidationError("ต้องเพิ่มผลอย่างน้อย 1 รายการก่อนตั้งสถานะเป็นประกาศผลแล้ว");
  return {
    status,
    announcementDate: optionalText(item.announcementDate, "วันที่ประกาศผล", 120),
    entries,
    note: optionalText(item.note, "หมายเหตุการประกาศผล", 2_000),
    documentUrl: item.documentUrl ? url(item.documentUrl, "ลิงก์ประกาศผล") : undefined,
  };
}

export function validateActivityPayload(value: unknown, activityId: string): ActivityPayload {
  const raw = object(value, "ข้อมูลกิจกรรม");
  const normalized = {
    competition: competition(raw.competition, activityId),
    participants: participants(raw.participants, activityId),
    result: result(raw.result),
  };
  if (JSON.stringify(normalized).length > 2_000_000) throw new ContentValidationError("ข้อมูลกิจกรรมมีขนาดใหญ่เกินกำหนด");
  return normalized;
}
