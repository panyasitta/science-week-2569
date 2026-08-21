"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityAdminState, ActivityPayload, ActivitySummary, AuditLogEntry } from "../lib/content-model";
import type { StoredDocument } from "../lib/activity-store";
import { DocumentEditor, ParticipantEditor, ResultEditor, RulesEditor, ScheduleEditor, type DraftChange } from "./editors";

type JudgeSession = { name: string; issuedAt: number; expiresAt: number };
type EditorTab = "results" | "participants" | "schedule" | "rules" | "documents" | "audit";
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw Object.assign(new Error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่"), { status: response.status, data });
  return data;
}

function formatTimestamp(value: string | null) {
  if (!value) return "ยังไม่มีประวัติ";
  try { return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value)); }
  catch { return value; }
}

export default function AdminPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<JudgeSession | null>(null);
  const [loginName, setLoginName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activityState, setActivityState] = useState<ActivityAdminState | null>(null);
  const [draft, setDraft] = useState<ActivityPayload | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [tab, setTab] = useState<EditorTab>("results");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const signOutForExpiredSession = useCallback(() => {
    setSession(null);
    setActivityState(null);
    setDraft(null);
    setSelectedId(null);
    setNotice({ tone: "info", text: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" });
  }, []);

  const loadOverview = useCallback(async (preferredId?: string | null) => {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    if (response.status === 401) { signOutForExpiredSession(); return; }
    const data = await responseJson<{ judge: JudgeSession; activities: ActivitySummary[]; auditLogs: AuditLogEntry[] }>(response);
    setSession(data.judge);
    setActivities(data.activities);
    setAuditLogs(data.auditLogs);
    const nextId = preferredId ?? selectedId ?? data.activities[0]?.activityId ?? null;
    if (nextId && !selectedId) setSelectedId(nextId);
  }, [selectedId, signOutForExpiredSession]);

  const loadActivity = useCallback(async (activityId: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/content?activityId=${encodeURIComponent(activityId)}`, { cache: "no-store" });
      if (response.status === 401) { signOutForExpiredSession(); return; }
      const data = await responseJson<{ state: ActivityAdminState; documents: StoredDocument[] }>(response);
      setActivityState(data.state);
      setDraft(structuredClone(data.state.draft));
      setDocuments(data.documents);
      setSelectedId(activityId);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" });
    } finally { setBusy(false); }
  }, [signOutForExpiredSession]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) return;
        const data = await responseJson<{ session: JudgeSession }>(response);
        setSession(data.session);
      } finally { setAuthLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!session || activities.length) return;
    void Promise.resolve().then(() => loadOverview()).catch((error) => setNotice({ tone: "error", text: error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ" }));
  }, [activities.length, loadOverview, session]);

  useEffect(() => {
    if (!session || !selectedId || (activityState?.activityId === selectedId && draft)) return;
    void Promise.resolve().then(() => loadActivity(selectedId));
  }, [activityState?.activityId, draft, loadActivity, selectedId, session]);

  const dirty = useMemo(() => Boolean(draft && activityState && JSON.stringify(draft) !== JSON.stringify(activityState.draft)), [activityState, draft]);
  const publishedCount = activities.filter((activity) => activity.resultStatus === "published" && activity.resultCount > 0).length;

  const changeDraft: DraftChange = (updater) => setDraft((current) => {
    if (!current) return current;
    const next = structuredClone(current);
    updater(next);
    return next;
  });

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const data = await responseJson<{ session: JudgeSession }>(await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: loginName, accessCode }) }));
      setSession(data.session); setAccessCode(""); setActivities([]);
      setNotice({ tone: "success", text: `เข้าสู่ระบบแล้ว — ${data.session.name}` });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ" }); }
    finally { setBusy(false); setAuthLoading(false); }
  };

  const logout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSession(null); setActivities([]); setAuditLogs([]); setActivityState(null); setDraft(null); setSelectedId(null);
  };

  const save = async (action: "draft" | "publish" | "restore") => {
    if (!selectedId || !activityState || !draft) return;
    if (action === "publish" && !window.confirm("ยืนยันเผยแพร่ข้อมูลชุดนี้สู่หน้าเว็บไซต์สาธารณะ")) return;
    if (action === "restore" && !window.confirm("ยกเลิกการแก้ไขฉบับร่างและกลับไปใช้ข้อมูลที่เผยแพร่ล่าสุด")) return;
    setBusy(true); setNotice(null);
    try {
      const method = action === "draft" ? "PUT" : "POST";
      const body = action === "draft"
        ? { activityId: selectedId, payload: draft, expectedRevision: activityState.revision }
        : { action, activityId: selectedId, payload: draft, expectedRevision: activityState.revision };
      const data = await responseJson<{ state: ActivityAdminState }>(await fetch("/api/admin/content", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setActivityState(data.state); setDraft(structuredClone(data.state.draft));
      setNotice({ tone: "success", text: action === "publish" ? "เผยแพร่ข้อมูลสู่หน้าเว็บไซต์แล้ว" : action === "restore" ? "เรียกคืนข้อมูลที่เผยแพร่ล่าสุดแล้ว" : "บันทึกฉบับร่างแล้ว" });
      await loadOverview(selectedId);
    } catch (error) {
      const status = (error as { status?: number }).status;
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" });
      if (status === 401) signOutForExpiredSession();
    } finally { setBusy(false); }
  };

  const uploadDocument = async (file: File) => {
    if (!selectedId) return;
    setBusy(true); setNotice(null);
    const form = new FormData(); form.set("activityId", selectedId); form.set("file", file);
    try {
      await responseJson(await fetch("/api/admin/documents", { method: "POST", body: form }));
      await loadActivity(selectedId);
      setNotice({ tone: "success", text: `อัปโหลด ${file.name} แล้ว เลือกนำไปใช้ในสื่อประกอบหรือประกาศผลได้` });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" }); }
    finally { setBusy(false); }
  };

  const deleteUploadedDocument = async (id: string) => {
    if (!selectedId || !window.confirm("ยืนยันลบไฟล์นี้ออกจากระบบ")) return;
    setBusy(true);
    try {
      await responseJson(await fetch(`/api/admin/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
      await loadActivity(selectedId);
      setNotice({ tone: "success", text: "ลบเอกสารแล้ว" });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "ลบเอกสารไม่สำเร็จ" }); }
    finally { setBusy(false); }
  };

  if (authLoading) return <main className="admin-auth-screen"><div className="admin-loader" /><p>กำลังตรวจสอบสิทธิ์…</p></main>;

  if (!session) return (
    <main className="admin-auth-screen">
      <div className="admin-auth-card">
        <Link className="admin-back-link" href="/">← กลับหน้าเว็บไซต์</Link>
        <div className="admin-auth-mark">✦</div>
        <p className="admin-eyebrow">SCIENCE WEEK 2569</p>
        <h1>ระบบหลังบ้านกรรมการ</h1>
        <p>กรอกชื่อของคุณเพื่อบันทึกประวัติการทำงาน แล้วใช้รหัสกลางที่ผู้ดูแลมอบให้</p>
        {notice && <div className={`admin-notice ${notice.tone}`}>{notice.text}</div>}
        <form onSubmit={login}>
          <label><span>ชื่อกรรมการ</span><input autoComplete="name" value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="ชื่อ–นามสกุล" required /></label>
          <label><span>รหัสกลางกรรมการ</span><input type="password" autoComplete="current-password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="••••••••••••" required /></label>
          <button className="admin-button primary full" type="submit" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบจัดการข้อมูล →"}</button>
        </form>
        <small>ระบบจะออกจากระบบอัตโนมัติเมื่อครบ 8 ชั่วโมง</small>
      </div>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><Link href="/"><span>✦</span><div><strong>SCIENCE WEEK 2569</strong><small>ระบบหลังบ้านกรรมการ</small></div></Link><div className="admin-user"><div><span>กำลังใช้งานในชื่อ</span><strong>{session.name}</strong></div><button type="button" onClick={logout}>ออกจากระบบ</button></div></header>
      <aside className="admin-sidebar">
        <div className="admin-overview"><span>ประกาศผลแล้ว</span><strong>{publishedCount}<small> / {activities.length || 11}</small></strong><div><i style={{ width: `${(publishedCount / Math.max(activities.length, 11)) * 100}%` }} /></div></div>
        <nav aria-label="รายการกิจกรรม">
          {activities.map((activity) => <button type="button" className={selectedId === activity.activityId && tab !== "audit" ? "active" : ""} key={activity.activityId} onClick={() => { if (dirty && !window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการเปลี่ยนกิจกรรมหรือไม่")) return; setTab("results"); setActivityState(null); setDraft(null); setSelectedId(activity.activityId); }}><span>{String(activity.order).padStart(2, "0")}</span><div><strong>{activity.shortTitle}</strong><small>{activity.status === "draft" ? "มีฉบับร่าง" : activity.resultStatus === "published" && activity.resultCount ? "ประกาศผลแล้ว" : "ข้อมูลเผยแพร่แล้ว"}</small></div><i className={activity.status === "draft" ? "draft" : activity.resultStatus === "published" && activity.resultCount ? "result" : "published"} /></button>)}
        </nav>
        <button className={`audit-nav${tab === "audit" ? " active" : ""}`} type="button" onClick={() => setTab("audit")}>⌚ ประวัติการแก้ไข</button>
      </aside>

      <section className="admin-workspace">
        {notice && <div className={`admin-notice floating ${notice.tone}`}><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)}>×</button></div>}
        {tab === "audit" ? (
          <section className="audit-page"><div className="workspace-heading"><div><p>AUDIT LOG</p><h1>ประวัติการแก้ไขข้อมูล</h1></div><button className="admin-button secondary" type="button" onClick={() => loadOverview(selectedId)}>↻ โหลดใหม่</button></div><div className="audit-list">{auditLogs.map((log) => <article key={log.id}><span className={`audit-action ${log.action}`}>{log.action === "publish" ? "เผยแพร่" : log.action === "save_draft" ? "บันทึกร่าง" : log.action === "restore" ? "เรียกคืน" : log.action === "upload_document" ? "อัปโหลด" : log.action === "delete_document" ? "ลบไฟล์" : log.action}</span><div><strong>{log.summary}</strong><p>{activities.find((activity) => activity.activityId === log.activityId)?.shortTitle ?? "ระบบ"}</p></div><div><strong>{log.actorName}</strong><small>{formatTimestamp(log.createdAt)}</small></div></article>)}{!auditLogs.length && <div className="admin-empty"><strong>ยังไม่มีประวัติการแก้ไข</strong></div>}</div></section>
        ) : busy && !draft ? <div className="workspace-loading"><div className="admin-loader" /><p>กำลังโหลดข้อมูลกิจกรรม…</p></div> : draft && activityState ? (
          <>
            <div className="workspace-heading"><div><p>{draft.competition.levelLabel}</p><h1>{draft.competition.shortTitle}</h1><span>รุ่นข้อมูล {activityState.revision} · {activityState.updatedBy ? `แก้ไขล่าสุดโดย ${activityState.updatedBy} เมื่อ ${formatTimestamp(activityState.updatedAt)}` : "ใช้ข้อมูลเริ่มต้นของเว็บไซต์"}</span></div><div className="workspace-status"><span className={activityState.status}>{activityState.status === "draft" ? "มีฉบับร่างที่ยังไม่เผยแพร่" : "ข้อมูลตรงกับหน้าเว็บไซต์"}</span>{dirty && <strong>● มีการแก้ไขที่ยังไม่บันทึก</strong>}</div></div>
            <div className="editor-tabs" role="tablist">{([ ["results","ผลและคะแนน"], ["participants","รายชื่อ"], ["schedule","กำหนดการ"], ["rules","กติกา"], ["documents","เอกสาร"] ] as [EditorTab,string][]).map(([value,label]) => <button key={value} role="tab" aria-selected={tab === value} type="button" onClick={() => setTab(value)}>{label}</button>)}</div>
            <div className="editor-canvas">
              {tab === "results" && <ResultEditor draft={draft} change={changeDraft} />}
              {tab === "participants" && <ParticipantEditor draft={draft} change={changeDraft} />}
              {tab === "schedule" && <ScheduleEditor draft={draft} change={changeDraft} />}
              {tab === "rules" && <RulesEditor draft={draft} change={changeDraft} />}
              {tab === "documents" && <DocumentEditor draft={draft} documents={documents} change={changeDraft} onUpload={uploadDocument} onDelete={deleteUploadedDocument} busy={busy} />}
            </div>
            <footer className="admin-actionbar"><div><strong>{dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : activityState.status === "draft" ? "ฉบับร่างบันทึกแล้ว แต่ยังไม่ขึ้นหน้าเว็บไซต์" : "ข้อมูลล่าสุดเผยแพร่แล้ว"}</strong><small>การกด “เผยแพร่” จะนำข้อมูลทุกแท็บของกิจกรรมนี้ขึ้นหน้าเว็บไซต์พร้อมกัน</small></div><div>{activityState.revision > 0 && <button className="admin-button ghost" type="button" disabled={busy} onClick={() => save("restore")}>เรียกคืนข้อมูลที่เผยแพร่</button>}<button className="admin-button secondary" type="button" disabled={busy || !dirty} onClick={() => save("draft")}>บันทึกฉบับร่าง</button><button className="admin-button primary" type="button" disabled={busy} onClick={() => save("publish")}>{busy ? "กำลังดำเนินการ…" : "ตรวจทานและเผยแพร่ →"}</button></div></footer>
          </>
        ) : <div className="workspace-loading"><p>เลือกกิจกรรมจากรายการด้านซ้าย</p></div>}
      </section>
    </main>
  );
}
