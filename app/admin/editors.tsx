"use client";

import { useState, type ReactNode } from "react";
import type { ActivityPayload } from "../lib/content-model";
import type { StoredDocument } from "../lib/activity-store";

export type DraftChange = (updater: (draft: ActivityPayload) => void) => void;

const CUSTOM_OPTION = "__custom__";
const AWARD_OPTIONS = ["ชนะเลิศ", "รองชนะเลิศ", "รองชนะเลิศอันดับ 1", "รองชนะเลิศอันดับ 2", "ชมเชย", "เข้าร่วม", "รางวัลพิเศษ"];
const PLACE_OPTIONS = ["ห้องประชุมสะเลียม", "ห้องประชุมปัญญาภิรมย์", "ห้อง 626", "สนามฟุตบอล", "ถนนบริเวณรอบอาคาร 6"];
const TEAM_FORMAT_OPTIONS = ["รายบุคคล", "ทีมละ 2 คน", "ทีมละ 3 คน", "ทีมละ 4 คน", "ทีมละ 5 คน", "อย่างน้อยห้องละ 1 ชุด"];
const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const STANDARD_ROOM_OPTIONS = [
  ...Array.from({ length: 6 }, (_, gradeIndex) => Array.from({ length: 7 }, (_, roomIndex) => `ม.${gradeIndex + 1}/${roomIndex + 1}`)).flat(),
  "ม.1 ห้อง SM1/1",
  "ม.1 ห้อง SM1/2",
  "ม.2 ห้อง SM2",
  "ม.3 ห้อง SM3",
];

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`admin-field${wide ? " field-wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function PresetSelect({ value, options, onChange, placeholder, customLabel = "อื่น ๆ / กรอกเอง", customPlaceholder = "กรอกข้อมูล" }: { value: string; options: string[]; onChange: (value: string) => void; placeholder: string; customLabel?: string; customPlaceholder?: string }) {
  const [customSelected, setCustomSelected] = useState(false);
  const customMode = Boolean(value && !options.includes(value)) || (customSelected && !value);

  return (
    <div className="preset-select">
      <select
        value={customMode ? CUSTOM_OPTION : value}
        onChange={(event) => {
          if (event.target.value === CUSTOM_OPTION) {
            setCustomSelected(true);
            if (options.includes(value)) onChange("");
          } else {
            setCustomSelected(false);
            onChange(event.target.value);
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
        <option value={CUSTOM_OPTION}>{customLabel}</option>
      </select>
      {customMode && <input value={options.includes(value) ? "" : value} onChange={(event) => onChange(event.target.value)} placeholder={customPlaceholder} />}
    </div>
  );
}

function roomOptions(draft: ActivityPayload): string[] {
  const existingRooms = [
    ...draft.participants.teams.flatMap((team) => team.members.map((member) => member.room)),
    ...draft.result.entries.flatMap((entry) => entry.members.map((member) => member.room ?? "")),
  ].filter(Boolean);
  return [...new Set([...STANDARD_ROOM_OPTIONS, ...existingRooms])];
}

function dateParts(value: string): [number, number, number] | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function formatThaiDate(value: string, short = false): string {
  const parts = dateParts(value);
  if (!parts) return "";
  const [year, month, day] = parts;
  return short ? `${day} ${THAI_MONTHS_SHORT[month - 1]}` : `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`;
}

function formatThaiDateRange(start: string, end: string, short = false): string {
  if (!end || end === start) return formatThaiDate(start, short);
  const startParts = dateParts(start);
  const endParts = dateParts(end);
  if (!startParts || !endParts) return formatThaiDate(start, short);
  const [startYear, startMonth, startDay] = startParts;
  const [endYear, endMonth, endDay] = endParts;
  const months = short ? THAI_MONTHS_SHORT : THAI_MONTHS;
  if (startYear === endYear && startMonth === endMonth) {
    return short ? `${startDay}–${endDay} ${months[startMonth - 1]}` : `${startDay}–${endDay} ${months[startMonth - 1]} ${startYear + 543}`;
  }
  if (short) return `${startDay} ${months[startMonth - 1]}–${endDay} ${months[endMonth - 1]}`;
  if (startYear === endYear) return `${startDay} ${months[startMonth - 1]}–${endDay} ${months[endMonth - 1]} ${startYear + 543}`;
  return `${startDay} ${months[startMonth - 1]} ${startYear + 543}–${endDay} ${months[endMonth - 1]} ${endYear + 543}`;
}

function parseThaiDate(value: string): string {
  const match = value.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (!match) return "";
  const monthIndex = [...THAI_MONTHS, ...THAI_MONTHS_SHORT].findIndex((month) => month === match[2]) % 12;
  if (monthIndex < 0) return "";
  const year = Number(match[3]) - 543;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function scheduleStartDate(sortDate: string): string {
  return sortDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function scheduleEndDate(dateLabel: string): string {
  const sameMonth = dateLabel.match(/^\d{1,2}\s*[–-]\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (sameMonth) return parseThaiDate(`${sameMonth[1]} ${sameMonth[2]} ${sameMonth[3]}`);
  const crossMonth = dateLabel.match(/^\d{1,2}\s+([^\s]+)(?:\s+(\d{4}))?\s*[–-]\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (crossMonth) return parseThaiDate(`${crossMonth[3]} ${crossMonth[4]} ${crossMonth[5]}`);
  return "";
}

function scheduleStartTime(sortDate: string): string {
  return sortDate.match(/T(\d{2}:\d{2})/)?.[1] ?? "";
}

function scheduleEndTime(timeLabel: string): string {
  const match = timeLabel.match(/[–-](\d{2})[.:](\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function timeMode(timeLabel: string): "single" | "range" | "open" {
  if (timeLabel.includes("เป็นต้นไป")) return "open";
  return /[–-]\d{2}[.:]\d{2}/.test(timeLabel) ? "range" : "single";
}

function formatThaiTime(start: string, end: string, mode: "single" | "range" | "open"): string {
  if (!start) return "";
  const startLabel = start.replace(":", ".");
  if (mode === "open") return `${startLabel} น. เป็นต้นไป`;
  if (mode === "range" && end) return `${startLabel}–${end.replace(":", ".")} น.`;
  return `${startLabel} น.`;
}

export function ScheduleEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const item = draft.competition;
  const set = (key: keyof typeof item, value: string) => change((copy) => { (copy.competition as unknown as Record<string, unknown>)[key] = value || undefined; });
  const startDate = scheduleStartDate(item.sortDate);
  const endDate = scheduleEndDate(item.date);
  const startTime = scheduleStartTime(item.sortDate);
  const endTime = scheduleEndTime(item.time);
  const mode = timeMode(item.time);
  const setScheduleDate = (nextStart: string, nextEnd: string) => change((copy) => {
    const safeEnd = nextEnd && nextEnd >= nextStart ? nextEnd : "";
    const currentTime = scheduleStartTime(copy.competition.sortDate) || "00:00";
    copy.competition.date = formatThaiDateRange(nextStart, safeEnd);
    copy.competition.dateShort = formatThaiDateRange(nextStart, safeEnd, true);
    copy.competition.sortDate = nextStart ? `${nextStart}T${currentTime}:00+07:00` : "";
  });
  const setScheduleTime = (nextStart: string, nextEnd: string, nextMode: "single" | "range" | "open") => change((copy) => {
    const currentDate = scheduleStartDate(copy.competition.sortDate);
    const safeEnd = nextMode === "range" ? nextEnd || nextStart : "";
    copy.competition.time = formatThaiTime(nextStart, safeEnd, nextMode);
    copy.competition.sortDate = currentDate && nextStart ? `${currentDate}T${nextStart}:00+07:00` : "";
  });
  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>กำหนดการและสถานที่</p><h2>ข้อมูลวันแข่งขัน</h2></div><span>แสดงบนหน้าแรก การ์ดกิจกรรม และหน้ารายละเอียด</span></div>
      <div className="admin-field-grid">
        <Field label="วันที่เริ่มแข่งขัน" hint={`แสดงผลบนเว็บไซต์: ${item.date || "—"}`}><input type="date" value={startDate} onChange={(event) => setScheduleDate(event.target.value, endDate)} /></Field>
        <Field label="วันที่สิ้นสุด" hint="เว้นว่างหากแข่งขันวันเดียว"><input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setScheduleDate(startDate, event.target.value)} /></Field>
        <Field label="เวลาเริ่ม" hint={`แสดงผลบนเว็บไซต์: ${item.time || "—"}`}><input type="time" value={startTime} onChange={(event) => setScheduleTime(event.target.value, endTime, mode)} /></Field>
        <Field label="รูปแบบเวลา"><select value={mode} onChange={(event) => setScheduleTime(startTime, endTime, event.target.value as "single" | "range" | "open")}><option value="single">ระบุเวลาเดียว</option><option value="range">ระบุช่วงเวลา</option><option value="open">ตั้งแต่เวลาเริ่มต้นเป็นต้นไป</option></select></Field>
        <Field label="เวลาสิ้นสุด" hint={mode === "range" ? "เลือกเวลาสิ้นสุด" : "ใช้เมื่อเลือกรูปแบบช่วงเวลา"}><input type="time" min={startTime || undefined} disabled={mode !== "range"} value={mode === "range" ? endTime : ""} onChange={(event) => setScheduleTime(startTime, event.target.value, "range")} /></Field>
        <Field label="สถานที่"><PresetSelect key={`${item.id}-place`} value={item.place} options={PLACE_OPTIONS} onChange={(value) => set("place", value)} placeholder="เลือกสถานที่" customLabel="สถานที่อื่น / กรอกเอง" customPlaceholder="ระบุสถานที่" /></Field>
        <Field label="รูปแบบทีม/จำนวนคน"><PresetSelect key={`${item.id}-team-format`} value={item.team} options={TEAM_FORMAT_OPTIONS} onChange={(value) => set("team", value)} placeholder="เลือกรูปแบบทีม" customLabel="รูปแบบอื่น / กรอกเอง" customPlaceholder="ระบุรูปแบบทีม/จำนวนคน" /></Field>
        <Field label="กำหนดรับสมัคร" hint="เว้นว่างได้"><input type="date" value={parseThaiDate(item.deadline ?? "")} onChange={(event) => set("deadline", formatThaiDate(event.target.value))} /></Field>
      </div>
    </section>
  );
}

export function ParticipantEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const teams = draft.participants.teams;
  const rooms = roomOptions(draft);
  const updateTeam = (teamIndex: number, key: "team" | "title", value: string) => change((copy) => {
    const team = copy.participants.teams[teamIndex];
    if (key === "team") team.team = value;
    else team.title = value || undefined;
  });
  const updateMember = (teamIndex: number, memberIndex: number, key: "name" | "room" | "role", value: string) => change((copy) => {
    const member = copy.participants.teams[teamIndex].members[memberIndex];
    if (key === "role") member.role = value ? value as typeof member.role : undefined;
    else member[key] = value;
  });
  const addTeam = () => change((copy) => copy.participants.teams.push({ team: String(copy.participants.teams.length + 1), members: [{ name: "", room: "" }] }));
  const removeTeam = (teamIndex: number) => change((copy) => copy.participants.teams.splice(teamIndex, 1));
  const addMember = (teamIndex: number) => change((copy) => copy.participants.teams[teamIndex].members.push({ name: "", room: "" }));
  const removeMember = (teamIndex: number, memberIndex: number) => change((copy) => copy.participants.teams[teamIndex].members.splice(memberIndex, 1));

  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>รายชื่อผู้เข้าแข่งขัน</p><h2>{teams.length} ทีม/ผลงาน</h2></div><button className="admin-button secondary" type="button" onClick={addTeam}>＋ เพิ่มทีม</button></div>
      <div className="team-editor-list">
        {teams.map((team, teamIndex) => (
          <article className="team-editor-card" key={`team-${teamIndex}`}>
            <header><span>{String(teamIndex + 1).padStart(2, "0")}</span><div><input aria-label={`ทีมลำดับ ${teamIndex + 1}`} value={team.team} onChange={(event) => updateTeam(teamIndex, "team", event.target.value)} placeholder="ชื่อหรือหมายเลขทีม" /><input aria-label={`ชื่อผลงานทีม ${teamIndex + 1}`} value={team.title ?? ""} onChange={(event) => updateTeam(teamIndex, "title", event.target.value)} placeholder="ชื่อผลงาน (ถ้ามี)" /></div><button className="icon-danger" type="button" onClick={() => removeTeam(teamIndex)} aria-label={`ลบทีม ${team.team}`}>×</button></header>
            <div className="member-editor-list">
              {team.members.map((member, memberIndex) => (
                <div className="member-editor-row" key={`${teamIndex}-${memberIndex}`}>
                  <span>{memberIndex + 1}</span>
                  <input value={member.name} onChange={(event) => updateMember(teamIndex, memberIndex, "name", event.target.value)} placeholder="ชื่อ–นามสกุล" aria-label="ชื่อ–นามสกุล" />
                  <PresetSelect key={`${draft.competition.id}-${teamIndex}-${memberIndex}-room`} value={member.room} options={rooms} onChange={(value) => updateMember(teamIndex, memberIndex, "room", value)} placeholder="เลือกชั้น/ห้อง" customLabel="ห้องอื่น / กรอกเอง" customPlaceholder="ระบุชั้น/ห้อง" />
                  <select value={member.role ?? ""} onChange={(event) => updateMember(teamIndex, memberIndex, "role", event.target.value)} aria-label="บทบาท"><option value="">ไม่มีบทบาท</option><option value="ผู้สวมใส่">ผู้สวมใส่</option><option value="ผู้ช่วย">ผู้ช่วย</option></select>
                  <button className="icon-danger" type="button" onClick={() => removeMember(teamIndex, memberIndex)} aria-label="ลบสมาชิก">×</button>
                </div>
              ))}
            </div>
            <button className="inline-add" type="button" onClick={() => addMember(teamIndex)}>＋ เพิ่มสมาชิกในทีม</button>
          </article>
        ))}
      </div>
      <button className="admin-button secondary bottom-add" type="button" onClick={addTeam}>＋ เพิ่มทีม/ผลงาน</button>
    </section>
  );
}

export function ResultEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const result = draft.result;
  const rooms = roomOptions(draft);
  const updateResult = (key: keyof typeof result, value: string) => change((copy) => { (copy.result as unknown as Record<string, unknown>)[key] = value || undefined; });
  const addBlankEntry = () => change((copy) => copy.result.entries.push({ award: "", team: "", members: [{ name: "", room: "" }] }));
  const addFromTeam = (teamIndex: number) => change((copy) => {
    const team = copy.participants.teams[teamIndex];
    if (!team) return;
    copy.result.entries.push({ award: "", team: team.team, title: team.title, members: team.members.map((member) => ({ name: member.name, room: member.room })) });
  });
  const updateEntry = (entryIndex: number, key: "award" | "team" | "title" | "score" | "note", value: string) => change((copy) => {
    const entry = copy.result.entries[entryIndex];
    if (key === "award") entry.award = value;
    else entry[key] = value || undefined;
  });
  const applyTeamToEntry = (entryIndex: number, teamIndex: number) => change((copy) => {
    const team = copy.participants.teams[teamIndex];
    const entry = copy.result.entries[entryIndex];
    if (!team || !entry) return;
    entry.team = team.team;
    entry.title = team.title;
    entry.members = team.members.map((member) => ({ name: member.name, room: member.room }));
  });
  const updateMember = (entryIndex: number, memberIndex: number, key: "name" | "room", value: string) => change((copy) => { copy.result.entries[entryIndex].members[memberIndex][key] = value; });
  const removeEntry = (entryIndex: number) => change((copy) => copy.result.entries.splice(entryIndex, 1));
  const addMember = (entryIndex: number) => change((copy) => copy.result.entries[entryIndex].members.push({ name: "", room: "" }));
  const removeMember = (entryIndex: number, memberIndex: number) => change((copy) => copy.result.entries[entryIndex].members.splice(memberIndex, 1));

  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>ผลการแข่งขันและคะแนน</p><h2>{result.entries.length} รายการรางวัล</h2></div><span className={`admin-result-state ${result.status}`}>{result.status === "published" ? "ตั้งเป็นประกาศผลแล้ว" : "ยังรอประกาศผล"}</span></div>
      <div className="result-settings admin-field-grid">
        <Field label="สถานะผลการแข่งขัน"><select value={result.status} onChange={(event) => updateResult("status", event.target.value)}><option value="pending">รอประกาศผล</option><option value="published">ประกาศผลแล้ว</option></select></Field>
        <Field label="วันที่ประกาศผล"><input type="date" value={parseThaiDate(result.announcementDate ?? "")} onChange={(event) => updateResult("announcementDate", formatThaiDate(event.target.value))} /></Field>
        <Field label="หมายเหตุการประกาศ" wide><textarea value={result.note ?? ""} onChange={(event) => updateResult("note", event.target.value)} rows={2} placeholder="ข้อความเพิ่มเติม (ถ้ามี)" /></Field>
        <Field label="ลิงก์ประกาศผลฉบับเต็ม" wide><input value={result.documentUrl ?? ""} onChange={(event) => updateResult("documentUrl", event.target.value)} placeholder="https://… หรือเลือกไฟล์ในแท็บเอกสาร" /></Field>
      </div>
      <div className="result-add-tools">
        <select defaultValue="" onChange={(event) => { if (event.target.value) { addFromTeam(Number(event.target.value)); event.target.value = ""; } }} aria-label="เพิ่มผลจากรายชื่อทีม"><option value="">＋ เพิ่มผลจากทีมผู้สมัคร…</option>{draft.participants.teams.map((team, index) => <option value={index} key={`${team.team}-${index}`}>{team.team}{team.title ? ` — ${team.title}` : ""}</option>)}</select>
        <button className="admin-button secondary" type="button" onClick={addBlankEntry}>＋ เพิ่มผลแบบกรอกเอง</button>
      </div>
      <div className="result-editor-list">
        {result.entries.map((entry, entryIndex) => (
          <article className="result-editor-card" key={`result-${entryIndex}`}>
            <header><span>{String(entryIndex + 1).padStart(2, "0")}</span><div><PresetSelect key={`${draft.competition.id}-${entryIndex}-award`} value={entry.award} options={AWARD_OPTIONS} onChange={(value) => updateEntry(entryIndex, "award", value)} placeholder="เลือกรางวัล" customLabel="รางวัลอื่น / กรอกเอง" customPlaceholder="ระบุชื่อรางวัล" /><input value={entry.score ?? ""} onChange={(event) => updateEntry(entryIndex, "score", event.target.value)} placeholder="คะแนน (ถ้ามี)" aria-label="คะแนน" inputMode="decimal" /></div><button className="icon-danger" type="button" onClick={() => removeEntry(entryIndex)} aria-label="ลบผลรางวัล">×</button></header>
            <label className="result-team-picker"><span>ดึงข้อมูลจากรายชื่อผู้เข้าแข่งขัน</span><select value={draft.participants.teams.findIndex((team) => team.team === entry.team && team.title === entry.title)} onChange={(event) => { if (event.target.value !== "-1") applyTeamToEntry(entryIndex, Number(event.target.value)); }}><option value="-1">เลือกทีม/ผลงาน…</option>{draft.participants.teams.map((team, index) => <option value={index} key={`${team.team}-${index}`}>{team.team}{team.title ? ` — ${team.title}` : ""}</option>)}</select><small>เมื่อเลือก ระบบจะเติมชื่อทีม ผลงาน และสมาชิกให้อัตโนมัติ</small></label>
            <div className="result-team-fields"><input value={entry.team ?? ""} onChange={(event) => updateEntry(entryIndex, "team", event.target.value)} placeholder="ชื่อ/หมายเลขทีม" /><input value={entry.title ?? ""} onChange={(event) => updateEntry(entryIndex, "title", event.target.value)} placeholder="ชื่อผลงาน (ถ้ามี)" /></div>
            <div className="winner-members">
              {entry.members.map((member, memberIndex) => <div key={`${entryIndex}-${memberIndex}`}><input value={member.name} onChange={(event) => updateMember(entryIndex, memberIndex, "name", event.target.value)} placeholder="ชื่อ–นามสกุล" /><PresetSelect key={`${draft.competition.id}-${entryIndex}-${memberIndex}-result-room`} value={member.room ?? ""} options={rooms} onChange={(value) => updateMember(entryIndex, memberIndex, "room", value)} placeholder="เลือกชั้น/ห้อง" customLabel="ห้องอื่น / กรอกเอง" customPlaceholder="ระบุชั้น/ห้อง" /><button className="icon-danger" type="button" onClick={() => removeMember(entryIndex, memberIndex)}>×</button></div>)}
            </div>
            <button className="inline-add" type="button" onClick={() => addMember(entryIndex)}>＋ เพิ่มรายชื่อผู้ได้รับรางวัล</button>
            <textarea value={entry.note ?? ""} onChange={(event) => updateEntry(entryIndex, "note", event.target.value)} rows={2} placeholder="หมายเหตุของรางวัลนี้ (ถ้ามี)" />
          </article>
        ))}
      </div>
      {!result.entries.length && <div className="admin-empty"><strong>ยังไม่มีผลการแข่งขัน</strong><p>เลือกทีมจากรายชื่อผู้สมัครหรือเพิ่มผลแบบกรอกเอง</p></div>}
    </section>
  );
}

export function RulesEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const item = draft.competition;
  const updateSection = (sectionIndex: number, key: "title" | "items", value: string) => change((copy) => {
    if (key === "title") copy.competition.sections[sectionIndex].title = value;
    else copy.competition.sections[sectionIndex].items = value.split("\n").map((line) => line.trim()).filter(Boolean);
  });
  const addSection = () => change((copy) => copy.competition.sections.push({ title: "หัวข้อใหม่", items: [""] }));
  const removeSection = (sectionIndex: number) => change((copy) => copy.competition.sections.splice(sectionIndex, 1));
  const updateScore = (kind: "scoreRows" | "timePenalties", index: number, key: "label" | "score", value: string) => change((copy) => {
    const rows = copy.competition[kind] ?? [];
    rows[index][key] = value;
    copy.competition[kind] = rows;
  });
  const addScore = (kind: "scoreRows" | "timePenalties") => change((copy) => { (copy.competition[kind] ??= []).push({ label: "", score: "" }); });
  const removeScore = (kind: "scoreRows" | "timePenalties", index: number) => change((copy) => copy.competition[kind]?.splice(index, 1));

  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>กติกาและเกณฑ์คะแนน</p><h2>{item.sections.length} หัวข้อกติกา</h2></div><button className="admin-button secondary" type="button" onClick={addSection}>＋ เพิ่มหัวข้อ</button></div>
      <div className="rules-editor-list">
        {item.sections.map((section, sectionIndex) => <article className="rule-editor-card" key={`rule-${sectionIndex}`}><header><span>{String(sectionIndex + 1).padStart(2, "0")}</span><input value={section.title} onChange={(event) => updateSection(sectionIndex, "title", event.target.value)} aria-label="ชื่อหัวข้อกติกา" /><button className="icon-danger" type="button" onClick={() => removeSection(sectionIndex)}>×</button></header><textarea value={section.items.join("\n")} onChange={(event) => updateSection(sectionIndex, "items", event.target.value)} rows={Math.max(4, section.items.length + 1)} aria-label="รายการกติกา" /><small>พิมพ์กติกา 1 ข้อต่อ 1 บรรทัด</small></article>)}
      </div>
      <div className="score-editors">
        {(["scoreRows", "timePenalties"] as const).map((kind) => <section key={kind}><header><div><p>{kind === "scoreRows" ? "เกณฑ์การให้คะแนน" : "การหักคะแนน"}</p><h3>{item[kind]?.length ?? 0} รายการ</h3></div><button className="inline-add" type="button" onClick={() => addScore(kind)}>＋ เพิ่มรายการ</button></header>{item[kind]?.map((row, index) => <div className="score-editor-row" key={`${kind}-${index}`}><input value={row.label} onChange={(event) => updateScore(kind, index, "label", event.target.value)} placeholder="รายการประเมิน" /><input value={row.score} onChange={(event) => updateScore(kind, index, "score", event.target.value)} placeholder="คะแนน" /><button className="icon-danger" type="button" onClick={() => removeScore(kind, index)}>×</button></div>)}</section>)}
      </div>
      <div className="admin-field-grid"><Field label="คะแนนรวม"><input value={item.scoreTotal ?? ""} onChange={(event) => change((copy) => { copy.competition.scoreTotal = event.target.value || undefined; })} placeholder="เช่น 100 คะแนน" /></Field><Field label="หมายเหตุสำคัญ" wide><textarea value={item.note ?? ""} onChange={(event) => change((copy) => { copy.competition.note = event.target.value || undefined; })} rows={3} /></Field></div>
    </section>
  );
}

export function DocumentEditor({ draft, documents, change, onUpload, onDelete, busy }: { draft: ActivityPayload; documents: StoredDocument[]; change: DraftChange; onUpload: (file: File) => Promise<void>; onDelete: (id: string) => Promise<void>; busy: boolean }) {
  const resources = draft.competition.resources ?? [];
  const updateResource = (index: number, key: "label" | "url", value: string) => change((copy) => { (copy.competition.resources ??= [])[index][key] = value; });
  const addResource = () => change((copy) => (copy.competition.resources ??= []).push({ label: "", url: "" }));
  const removeResource = (index: number) => change((copy) => copy.competition.resources?.splice(index, 1));
  const attachDocument = (document: StoredDocument, target: "resource" | "result") => change((copy) => {
    const url = `/api/documents?id=${encodeURIComponent(document.id)}`;
    if (target === "result") copy.result.documentUrl = url;
    else (copy.competition.resources ??= []).push({ label: document.fileName, url });
  });

  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>กติกาและเอกสาร</p><h2>ไฟล์และลิงก์ประกอบ</h2></div><label className={`admin-upload${busy ? " disabled" : ""}`}>↑ อัปโหลดไฟล์<input type="file" disabled={busy} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onUpload(file); event.target.value = ""; }} /></label></div>
      <p className="editor-help">รองรับ PDF, Word, Excel, PowerPoint และรูปภาพ ขนาดไม่เกิน 15 MB</p>
      <div className="uploaded-documents">
        {documents.map((document) => <article key={document.id}><div><strong>{document.fileName}</strong><small>{(document.sizeBytes / 1024 / 1024).toFixed(2)} MB · อัปโหลดโดย {document.createdBy}</small></div><div><button type="button" onClick={() => attachDocument(document, "resource")}>เพิ่มในสื่อประกอบ</button><button type="button" onClick={() => attachDocument(document, "result")}>ใช้เป็นประกาศผล</button><button className="danger-text" type="button" onClick={() => onDelete(document.id)}>ลบ</button></div></article>)}
        {!documents.length && <div className="admin-empty compact"><strong>ยังไม่มีไฟล์อัปโหลด</strong></div>}
      </div>
      <div className="editor-heading subheading"><div><p>ลิงก์และสื่อประกอบ</p><h2>{resources.length} รายการ</h2></div><button className="admin-button secondary" type="button" onClick={addResource}>＋ เพิ่มลิงก์</button></div>
      <div className="resource-editor-list">
        {resources.map((resource, index) => <div key={`resource-${index}`}><input value={resource.label} onChange={(event) => updateResource(index, "label", event.target.value)} placeholder="ชื่อเอกสาร/ลิงก์" /><input value={resource.url} onChange={(event) => updateResource(index, "url", event.target.value)} placeholder="https://…" /><button className="icon-danger" type="button" onClick={() => removeResource(index)}>×</button></div>)}
      </div>
    </section>
  );
}
