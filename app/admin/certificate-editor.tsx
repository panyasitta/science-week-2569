"use client";

import { useMemo, useState } from "react";
import type { CertificateMetadata, StoredCertificate } from "../lib/certificate-model";
import type { ActivityPayload } from "../lib/content-model";

export type CertificateUploadItem = { file: File; metadata: CertificateMetadata };

const AWARD_OPTIONS = ["ชนะเลิศ", "รองชนะเลิศ", "รองชนะเลิศอันดับ 1", "รองชนะเลิศอันดับ 2", "ชมเชย", "เข้าร่วม", "รางวัลพิเศษ"];

function normalize(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
}

function CertificateRow({ certificate, busy, onUpdate, onDelete }: {
  certificate: StoredCertificate;
  busy: boolean;
  onUpdate: (id: string, metadata: CertificateMetadata) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [recipientName, setRecipientName] = useState(certificate.recipientName);
  const [recipientRoom, setRecipientRoom] = useState(certificate.recipientRoom ?? "");
  const [teamName, setTeamName] = useState(certificate.teamName ?? "");
  const [award, setAward] = useState(certificate.award ?? "");
  const [status, setStatus] = useState(certificate.status);
  const changed = recipientName.trim() !== certificate.recipientName
    || recipientRoom.trim() !== (certificate.recipientRoom ?? "")
    || teamName.trim() !== (certificate.teamName ?? "")
    || award.trim() !== (certificate.award ?? "")
    || status !== certificate.status;

  return (
    <article className="certificate-admin-card">
      <header>
        <div><span className={`certificate-status ${certificate.status}`}>{certificate.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</span><strong>{certificate.fileName}</strong><small>{(certificate.sizeBytes / 1024 / 1024).toFixed(2)} MB · อัปโหลดโดย {certificate.createdBy}</small></div>
        <a href={`/api/certificates/download?id=${encodeURIComponent(certificate.id)}`} target="_blank" rel="noreferrer">เปิดไฟล์ ↗</a>
      </header>
      <div className="certificate-edit-grid">
        <label><span>ชื่อผู้รับ</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label>
        <label><span>ชั้น/ห้อง</span><input value={recipientRoom} onChange={(event) => setRecipientRoom(event.target.value)} /></label>
        <label><span>ทีม/ผลงาน</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} /></label>
        <label><span>รางวัล</span><input list="certificate-awards" value={award} onChange={(event) => setAward(event.target.value)} /></label>
        <label><span>สถานะ</span><select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}><option value="draft">ฉบับร่าง — นักเรียนยังไม่เห็น</option><option value="published">เผยแพร่ — ดาวน์โหลดได้</option></select></label>
      </div>
      <footer><button className="danger-text" type="button" disabled={busy} onClick={() => onDelete(certificate.id)}>ลบเกียรติบัตร</button><button className="admin-button secondary" type="button" disabled={busy || !changed || !recipientName.trim()} onClick={() => onUpdate(certificate.id, { recipientName, recipientRoom, teamName, award, status })}>บันทึกการแก้ไข</button></footer>
    </article>
  );
}

export function CertificateEditor({ draft, certificates, busy, onUpload, onUpdate, onDelete, onPublishAll }: {
  draft: ActivityPayload;
  certificates: StoredCertificate[];
  busy: boolean;
  onUpload: (items: CertificateUploadItem[]) => Promise<void>;
  onUpdate: (id: string, metadata: CertificateMetadata) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublishAll: () => Promise<void>;
}) {
  const candidates = useMemo(() => draft.participants.teams.flatMap((team, teamIndex) => team.members.map((member, memberIndex) => {
    const result = draft.result.entries.find((entry) => entry.members.some((winner) => normalize(winner.name) === normalize(member.name)));
    return {
      key: `${teamIndex}-${memberIndex}`,
      name: member.name,
      room: member.room,
      team: [team.team, team.title].filter(Boolean).join(" — "),
      award: result?.award ?? "เข้าร่วม",
    };
  })), [draft]);
  const [candidateKey, setCandidateKey] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRoom, setRecipientRoom] = useState("");
  const [teamName, setTeamName] = useState("");
  const [award, setAward] = useState("เข้าร่วม");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const draftCount = certificates.filter((certificate) => certificate.status === "draft").length;

  const chooseCandidate = (key: string) => {
    setCandidateKey(key);
    const candidate = candidates.find((item) => item.key === key);
    if (!candidate) return;
    setRecipientName(candidate.name);
    setRecipientRoom(candidate.room);
    setTeamName(candidate.team);
    setAward(candidate.award);
  };

  const submitSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !recipientName.trim()) return;
    await onUpload([{ file, metadata: { recipientName, recipientRoom, teamName, award, status } }]);
    setFile(null);
    setFileInputKey((value) => value + 1);
    setLocalMessage(null);
  };

  const uploadMany = async (files: FileList | null) => {
    if (!files?.length) return;
    const uploads: CertificateUploadItem[] = [];
    const unmatched: string[] = [];
    for (const item of Array.from(files)) {
      const filename = normalize(item.name.replace(/\.pdf$/i, ""));
      const matches = candidates.filter((candidate) => filename.includes(normalize(candidate.name)));
      if (matches.length !== 1) {
        unmatched.push(item.name);
        continue;
      }
      const candidate = matches[0];
      uploads.push({ file: item, metadata: { recipientName: candidate.name, recipientRoom: candidate.room, teamName: candidate.team, award: candidate.award, status: "draft" } });
    }
    if (unmatched.length) {
      setLocalMessage(`ยังไม่อัปโหลด: ${unmatched.slice(0, 4).join(", ")}${unmatched.length > 4 ? ` และอีก ${unmatched.length - 4} ไฟล์` : ""} — ชื่อไฟล์ต้องมีชื่อ–นามสกุลตรงกับรายชื่อผู้เข้าแข่งขัน`);
    } else setLocalMessage(null);
    if (uploads.length) await onUpload(uploads);
  };

  return (
    <section className="admin-editor-section certificate-editor">
      <datalist id="certificate-awards">{AWARD_OPTIONS.map((item) => <option value={item} key={item} />)}</datalist>
      <div className="editor-heading"><div><p>เกียรติบัตรผู้เข้าแข่งขัน</p><h2>{certificates.length} ไฟล์ · {draftCount} ฉบับร่าง</h2></div>{draftCount > 0 && <button className="admin-button primary" type="button" disabled={busy} onClick={onPublishAll}>เผยแพร่ฉบับร่างทั้งหมด</button>}</div>
      <div className="certificate-upload-layout">
        <form className="certificate-single-upload" onSubmit={submitSingle}>
          <header><strong>อัปโหลดรายบุคคล</strong><small>เลือกชื่อจากรายชื่อเดิมเพื่อลดการพิมพ์ผิด</small></header>
          <label><span>เลือกผู้เข้าแข่งขัน</span><select value={candidateKey} onChange={(event) => chooseCandidate(event.target.value)}><option value="">เลือกจากรายชื่อ…</option>{candidates.map((candidate) => <option value={candidate.key} key={candidate.key}>{candidate.name} · {candidate.room}</option>)}</select></label>
          <div className="certificate-form-grid">
            <label><span>ชื่อผู้รับ</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required /></label>
            <label><span>ชั้น/ห้อง</span><input value={recipientRoom} onChange={(event) => setRecipientRoom(event.target.value)} /></label>
            <label><span>ทีม/ผลงาน</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} /></label>
            <label><span>รางวัล</span><input list="certificate-awards" value={award} onChange={(event) => setAward(event.target.value)} /></label>
            <label><span>สถานะเริ่มต้น</span><select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}><option value="draft">ฉบับร่าง — ตรวจสอบก่อน</option><option value="published">เผยแพร่ทันที</option></select></label>
            <label><span>ไฟล์ PDF</span><input key={fileInputKey} type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
          </div>
          <button className="admin-button secondary" type="submit" disabled={busy || !file || !recipientName.trim()}>{busy ? "กำลังอัปโหลด…" : "อัปโหลดเกียรติบัตร"}</button>
        </form>
        <div className="certificate-bulk-upload">
          <span>PDF หลายไฟล์</span>
          <strong>อัปโหลดชุดที่แยกแล้ว</strong>
          <p>ระบบจะเทียบชื่อ–นามสกุลในชื่อไฟล์กับรายชื่อผู้เข้าแข่งขันของกิจกรรมนี้ แล้วนำเข้าเป็นฉบับร่างโดยอัตโนมัติ</p>
          <label className={`admin-upload${busy ? " disabled" : ""}`}>↑ เลือก PDF หลายไฟล์<input type="file" multiple disabled={busy} accept="application/pdf,.pdf" onChange={(event) => { void uploadMany(event.target.files); event.target.value = ""; }} /></label>
          {localMessage && <div className="certificate-local-warning">{localMessage}</div>}
        </div>
      </div>
      <div className="certificate-admin-list">
        {certificates.map((certificate) => <CertificateRow key={`${certificate.id}-${certificate.recipientName}-${certificate.status}-${certificate.publishedAt ?? ""}`} certificate={certificate} busy={busy} onUpdate={onUpdate} onDelete={onDelete} />)}
        {!certificates.length && <div className="admin-empty"><strong>ยังไม่มีเกียรติบัตรในกิจกรรมนี้</strong><p>อัปโหลดรายบุคคล หรือเลือก PDF หลายไฟล์หลังจากแยกไฟล์เรียบร้อยแล้ว</p></div>}
      </div>
    </section>
  );
}
