"use client";

import type { ActivityPayload } from "../lib/content-model";
import type { StoredDocument } from "../lib/activity-store";

export type DraftChange = (updater: (draft: ActivityPayload) => void) => void;

function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`admin-field${wide ? " field-wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function ScheduleEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const item = draft.competition;
  const set = (key: keyof typeof item, value: string) => change((copy) => { (copy.competition as unknown as Record<string, unknown>)[key] = value || undefined; });
  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>กำหนดการและสถานที่</p><h2>ข้อมูลวันแข่งขัน</h2></div><span>แสดงบนหน้าแรก การ์ดกิจกรรม และหน้ารายละเอียด</span></div>
      <div className="admin-field-grid">
        <Field label="วันที่แข่งขัน" wide><input value={item.date} onChange={(event) => set("date", event.target.value)} placeholder="เช่น 31 สิงหาคม 2569" /></Field>
        <Field label="วันที่แบบย่อ"><input value={item.dateShort} onChange={(event) => set("dateShort", event.target.value)} placeholder="31 ส.ค." /></Field>
        <Field label="วัน–เวลาสำหรับเรียงลำดับ" hint="รูปแบบ ISO เช่น 2026-08-31T12:30:00+07:00"><input value={item.sortDate} onChange={(event) => set("sortDate", event.target.value)} /></Field>
        <Field label="เวลาแข่งขัน"><input value={item.time} onChange={(event) => set("time", event.target.value)} placeholder="12.30 น." /></Field>
        <Field label="สถานที่"><input value={item.place} onChange={(event) => set("place", event.target.value)} /></Field>
        <Field label="รูปแบบทีม/จำนวนคน"><input value={item.team} onChange={(event) => set("team", event.target.value)} /></Field>
        <Field label="กำหนดรับสมัคร"><input value={item.deadline ?? ""} onChange={(event) => set("deadline", event.target.value)} placeholder="เว้นว่างได้" /></Field>
      </div>
    </section>
  );
}

export function ParticipantEditor({ draft, change }: { draft: ActivityPayload; change: DraftChange }) {
  const teams = draft.participants.teams;
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
          <article className="team-editor-card" key={`${teamIndex}-${team.team}`}>
            <header><span>{String(teamIndex + 1).padStart(2, "0")}</span><div><input aria-label={`ทีมลำดับ ${teamIndex + 1}`} value={team.team} onChange={(event) => updateTeam(teamIndex, "team", event.target.value)} placeholder="ชื่อหรือหมายเลขทีม" /><input aria-label={`ชื่อผลงานทีม ${teamIndex + 1}`} value={team.title ?? ""} onChange={(event) => updateTeam(teamIndex, "title", event.target.value)} placeholder="ชื่อผลงาน (ถ้ามี)" /></div><button className="icon-danger" type="button" onClick={() => removeTeam(teamIndex)} aria-label={`ลบทีม ${team.team}`}>×</button></header>
            <div className="member-editor-list">
              {team.members.map((member, memberIndex) => (
                <div className="member-editor-row" key={`${teamIndex}-${memberIndex}`}>
                  <span>{memberIndex + 1}</span>
                  <input value={member.name} onChange={(event) => updateMember(teamIndex, memberIndex, "name", event.target.value)} placeholder="ชื่อ–นามสกุล" aria-label="ชื่อ–นามสกุล" />
                  <input value={member.room} onChange={(event) => updateMember(teamIndex, memberIndex, "room", event.target.value)} placeholder="ชั้น/ห้อง" aria-label="ชั้น/ห้อง" />
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
  const updateMember = (entryIndex: number, memberIndex: number, key: "name" | "room", value: string) => change((copy) => { copy.result.entries[entryIndex].members[memberIndex][key] = value; });
  const removeEntry = (entryIndex: number) => change((copy) => copy.result.entries.splice(entryIndex, 1));
  const addMember = (entryIndex: number) => change((copy) => copy.result.entries[entryIndex].members.push({ name: "", room: "" }));
  const removeMember = (entryIndex: number, memberIndex: number) => change((copy) => copy.result.entries[entryIndex].members.splice(memberIndex, 1));

  return (
    <section className="admin-editor-section">
      <div className="editor-heading"><div><p>ผลการแข่งขันและคะแนน</p><h2>{result.entries.length} รายการรางวัล</h2></div><span className={`admin-result-state ${result.status}`}>{result.status === "published" ? "ตั้งเป็นประกาศผลแล้ว" : "ยังรอประกาศผล"}</span></div>
      <div className="result-settings admin-field-grid">
        <Field label="สถานะผลการแข่งขัน"><select value={result.status} onChange={(event) => updateResult("status", event.target.value)}><option value="pending">รอประกาศผล</option><option value="published">ประกาศผลแล้ว</option></select></Field>
        <Field label="วันที่ประกาศผล"><input value={result.announcementDate ?? ""} onChange={(event) => updateResult("announcementDate", event.target.value)} placeholder="เช่น 21 สิงหาคม 2569" /></Field>
        <Field label="หมายเหตุการประกาศ" wide><textarea value={result.note ?? ""} onChange={(event) => updateResult("note", event.target.value)} rows={2} placeholder="ข้อความเพิ่มเติม (ถ้ามี)" /></Field>
        <Field label="ลิงก์ประกาศผลฉบับเต็ม" wide><input value={result.documentUrl ?? ""} onChange={(event) => updateResult("documentUrl", event.target.value)} placeholder="https://… หรือเลือกไฟล์ในแท็บเอกสาร" /></Field>
      </div>
      <div className="result-add-tools">
        <select defaultValue="" onChange={(event) => { if (event.target.value) { addFromTeam(Number(event.target.value)); event.target.value = ""; } }} aria-label="เพิ่มผลจากรายชื่อทีม"><option value="">＋ เพิ่มผลจากทีมผู้สมัคร…</option>{draft.participants.teams.map((team, index) => <option value={index} key={`${team.team}-${index}`}>{team.team}{team.title ? ` — ${team.title}` : ""}</option>)}</select>
        <button className="admin-button secondary" type="button" onClick={addBlankEntry}>＋ เพิ่มผลแบบกรอกเอง</button>
      </div>
      <div className="result-editor-list">
        {result.entries.map((entry, entryIndex) => (
          <article className="result-editor-card" key={`${entryIndex}-${entry.award}`}>
            <header><span>{String(entryIndex + 1).padStart(2, "0")}</span><div><input value={entry.award} onChange={(event) => updateEntry(entryIndex, "award", event.target.value)} placeholder="รางวัล เช่น ชนะเลิศ" aria-label="ชื่อรางวัล" /><input value={entry.score ?? ""} onChange={(event) => updateEntry(entryIndex, "score", event.target.value)} placeholder="คะแนน (ถ้ามี)" aria-label="คะแนน" /></div><button className="icon-danger" type="button" onClick={() => removeEntry(entryIndex)} aria-label="ลบผลรางวัล">×</button></header>
            <div className="result-team-fields"><input value={entry.team ?? ""} onChange={(event) => updateEntry(entryIndex, "team", event.target.value)} placeholder="ชื่อ/หมายเลขทีม" /><input value={entry.title ?? ""} onChange={(event) => updateEntry(entryIndex, "title", event.target.value)} placeholder="ชื่อผลงาน (ถ้ามี)" /></div>
            <div className="winner-members">
              {entry.members.map((member, memberIndex) => <div key={`${entryIndex}-${memberIndex}`}><input value={member.name} onChange={(event) => updateMember(entryIndex, memberIndex, "name", event.target.value)} placeholder="ชื่อ–นามสกุล" /><input value={member.room ?? ""} onChange={(event) => updateMember(entryIndex, memberIndex, "room", event.target.value)} placeholder="ชั้น/ห้อง" /><button className="icon-danger" type="button" onClick={() => removeMember(entryIndex, memberIndex)}>×</button></div>)}
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
        {item.sections.map((section, sectionIndex) => <article className="rule-editor-card" key={`${sectionIndex}-${section.title}`}><header><span>{String(sectionIndex + 1).padStart(2, "0")}</span><input value={section.title} onChange={(event) => updateSection(sectionIndex, "title", event.target.value)} aria-label="ชื่อหัวข้อกติกา" /><button className="icon-danger" type="button" onClick={() => removeSection(sectionIndex)}>×</button></header><textarea value={section.items.join("\n")} onChange={(event) => updateSection(sectionIndex, "items", event.target.value)} rows={Math.max(4, section.items.length + 1)} aria-label="รายการกติกา" /><small>พิมพ์กติกา 1 ข้อต่อ 1 บรรทัด</small></article>)}
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
        {resources.map((resource, index) => <div key={`${index}-${resource.label}`}><input value={resource.label} onChange={(event) => updateResource(index, "label", event.target.value)} placeholder="ชื่อเอกสาร/ลิงก์" /><input value={resource.url} onChange={(event) => updateResource(index, "url", event.target.value)} placeholder="https://…" /><button className="icon-danger" type="button" onClick={() => removeResource(index)}>×</button></div>)}
      </div>
    </section>
  );
}
