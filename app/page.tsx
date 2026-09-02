"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Competition, CompetitionLevel } from "./competitions";
import type { ActivityParticipants } from "./participants";
import type { ActivityResult } from "./results";
import { competitions, participantDataUpdated, participantDirectory, resultAnnouncementNote, resultDirectory, syncedCertificates } from "./synced-data";
import type { PublicCertificate } from "./lib/certificate-model";
import type { ActivityPayload } from "./lib/content-model";

type FilterValue = "all" | CompetitionLevel;
type ModalView = "participants" | "results" | "rules";

const CENTRAL_SITE_URL = "https://science-week-2569.chaiyarit-p94.chatgpt.site";
const certificateCategories: Record<string, { title: string; level: string }> = {
  "event-staff": { title: "คณะดำเนินงานกิจกรรม", level: "นักเรียนและผู้ช่วยงาน" },
  teachers: { title: "คณะครูผู้ดำเนินงาน", level: "ครูและบุคลากร" },
};

const fallbackCertificates: PublicCertificate[] = syncedCertificates.map((certificate) => {
  const activity = competitions.find((item) => item.id === certificate.activityId);
  const category = certificateCategories[certificate.activityId];
  return {
    id: certificate.id,
    activityId: certificate.activityId,
    activityTitle: activity?.shortTitle ?? category?.title ?? certificate.activityId,
    activityLevel: activity?.levelLabel ?? category?.level ?? "",
    recipientName: certificate.recipientName,
    recipientRoom: certificate.recipientRoom,
    teamName: certificate.teamName,
    award: certificate.award,
    fileName: certificate.fileName,
    sizeBytes: certificate.sizeBytes,
    createdAt: certificate.createdAt,
    publishedAt: certificate.publishedAt,
    downloadUrl: certificate.externalUrl ?? "#certificates",
  };
});

const scheduleGroups = [
  { ids: ["science-show-lower", "science-show-upper"], label: "Science Show", note: "ม.ต้น และ ม.ปลาย", tone: "violet" },
  { ids: ["science-quiz-lower", "science-quiz-upper"], label: "ตอบปัญหาวิทยาศาสตร์", note: "ม.ต้น และ ม.ปลาย", tone: "cyan" },
  { ids: ["painting-lower", "painting-upper"], label: "วาดภาพ–ระบายสี", note: "ม.ต้น และ ม.ปลาย", tone: "gold" },
  { ids: ["food-web"], label: "บอร์ดเกม Food Web", note: "ม.ต้น", tone: "cyan" },
  { ids: ["air-rocket"], label: "จรวดพลังลม", note: "ม.ต้น", tone: "cyan" },
  { ids: ["water-rocket-lower", "water-rocket-upper"], label: "จรวดขวดน้ำ", note: "ม.ต้น และ ม.ปลาย", tone: "violet" },
  { ids: ["recycled-costume"], label: "ชุดรีไซเคิล", note: "ทุกระดับชั้น", tone: "gold" },
] as const;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function scheduleFrom(competitionList: Competition[]) {
  const byId = new Map(competitionList.map((item) => [item.id, item]));
  return scheduleGroups.map((group) => {
    const items = group.ids.map((id) => byId.get(id)).filter((item): item is Competition => Boolean(item));
    const dates = unique(items.map((item) => item.dateShort.replace(/\s*ส\.ค\.$/, "")));
    const times = unique(items.map((item) => item.time));
    const places = unique(items.map((item) => item.place));
    return {
      day: dates.join(" / ") || "—",
      label: group.label,
      note: group.note,
      detail: `${times.join(" / ") || "—"} · ${places.join(" / ") || "—"}`,
      tone: group.tone,
    };
  });
}

const filters: { value: FilterValue; label: string; helper: string }[] = [
  { value: "all", label: "ทั้งหมด", helper: "11 รายการ" },
  { value: "lower", label: "ม.1–3", helper: "6 รายการ" },
  { value: "upper", label: "ม.4–6", helper: "4 รายการ" },
  { value: "all", label: "ทุกระดับ", helper: "1 รายการ" },
];

function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date("2026-08-31T12:30:00+07:00").getTime();
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const units = useMemo(() => {
    if (remaining === null) return [{ value: "—", label: "วัน" }, { value: "—", label: "ชั่วโมง" }, { value: "—", label: "นาที" }];
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    return [
      { value: String(days).padStart(2, "0"), label: "วัน" },
      { value: String(hours).padStart(2, "0"), label: "ชั่วโมง" },
      { value: String(minutes).padStart(2, "0"), label: "นาที" },
    ];
  }, [remaining]);

  return (
    <div className="countdown" aria-label="เวลานับถอยหลังถึงกิจกรรมวันที่ 31 สิงหาคม 2569">
      <p><span /> COUNTDOWN TO 31 AUGUST</p>
      <div className="countdown-date" aria-hidden="true"><span>MAIN EVENT</span><strong>31</strong><small>AUG</small></div>
      <div className="countdown-units">
        {units.map((unit) => (
          <div key={unit.label}><strong>{unit.value}</strong><small>{unit.label}</small></div>
        ))}
      </div>
    </div>
  );
}

function CompetitionModal({ item, participantSet, resultSet, initialView, onClose }: { item: Competition; participantSet?: ActivityParticipants; resultSet: ActivityResult; initialView: ModalView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<ModalView>(initialView);
  const [participantQuery, setParticipantQuery] = useState("");

  const indexedTeams = useMemo(() => {
    let participantNo = 1;
    return (participantSet?.teams ?? []).map((team) => ({
      ...team,
      members: team.members.map((member) => ({ ...member, participantNo: participantNo++ })),
    }));
  }, [participantSet]);

  const filteredTeams = useMemo(() => {
    const normalized = participantQuery.trim().toLocaleLowerCase("th");
    if (!normalized) return indexedTeams;
    return indexedTeams.filter((team) => {
      const haystack = [team.team, team.title, ...team.members.flatMap((member) => [member.name, member.room, member.role])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("th");
      return haystack.includes(normalized);
    });
  }, [indexedTeams, participantQuery]);

  const totalPeople = indexedTeams.reduce((total, team) => total + team.members.length, 0);
  const filteredPeople = filteredTeams.reduce((total, team) => total + team.members.length, 0);
  const hasPublishedResults = resultSet.status === "published" && resultSet.entries.length > 0;
  const footerCopy = view === "results"
    ? hasPublishedResults
      ? `ประกาศผล ณ วันที่ ${resultSet.announcementDate ?? "—"}`
      : "ผลการแข่งขันจะแสดงหลังคณะกรรมการรับรอง"
    : view === "participants"
      ? `รายชื่อประกาศ ณ วันที่ ${participantDataUpdated}`
      : "อ่านกติกาให้ครบถ้วนก่อนเข้าร่วมการแข่งขัน";
  const switchTarget: ModalView = view === "participants" ? "results" : "participants";
  const switchLabel = view === "participants" ? "ดูผลการแข่งขัน" : "ดูรายชื่อ";

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`rules-modal ${item.accent}`} role="dialog" aria-modal="true" aria-labelledby={`rules-title-${item.id}`}>
        <div className="modal-orbit" aria-hidden="true" />
        <header className="modal-header">
          <div>
            <p className="modal-level">{item.levelLabel}</p>
            <h2 id={`rules-title-${item.id}`}>{item.title}</h2>
            <p>{item.subtitle}</p>
          </div>
          <button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="ปิดรายละเอียดกติกา">×</button>
        </header>

        <div className="modal-summary">
          <div><span>วันที่</span><strong>{item.date}</strong></div>
          <div><span>เวลา</span><strong>{item.time}</strong></div>
          <div><span>ทีม/ผลงาน</span><strong>{indexedTeams.length} ทีม</strong></div>
          <div><span>ผู้เข้าแข่งขัน</span><strong>{totalPeople} คน</strong></div>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="ข้อมูลกิจกรรม">
          <button type="button" role="tab" aria-selected={view === "results"} onClick={() => setView("results")}>
            <span>ผลการแข่งขัน</span><small>{hasPublishedResults ? `${resultSet.entries.length} รางวัล` : "รอประกาศผล"}</small>
          </button>
          <button type="button" role="tab" aria-selected={view === "participants"} onClick={() => setView("participants")}>
            <span>รายชื่อผู้เข้าแข่งขัน</span><small>{totalPeople} คน</small>
          </button>
          <button type="button" role="tab" aria-selected={view === "rules"} onClick={() => setView("rules")}>
            <span>กติกากิจกรรม</span><small>รายละเอียดและเกณฑ์คะแนน</small>
          </button>
        </div>

        {view === "results" ? (
          <section className="competition-results-panel" role="tabpanel" aria-label={`ผลการแข่งขัน ${item.title}`}>
            <div className="competition-results-heading">
              <div>
                <p>ประกาศผลการแข่งขัน</p>
                <h3>{item.shortTitle}</h3>
                <small>{resultAnnouncementNote}</small>
              </div>
              <span className={`result-status-badge ${hasPublishedResults ? "published" : "pending"}`}>
                {hasPublishedResults ? "ประกาศผลแล้ว" : "รอประกาศผล"}
              </span>
            </div>

            {hasPublishedResults ? (
              <>
                <div className="result-entry-list">
                  {resultSet.entries.map((entry, entryIndex) => (
                    <article className="result-entry" key={`${entry.award}-${entry.team ?? entry.title ?? entryIndex}`}>
                      <div className="result-award">
                        <span>{String(entryIndex + 1).padStart(2, "0")}</span>
                        <strong>{entry.award}</strong>
                      </div>
                      <div className="result-winner">
                        {(entry.team || entry.title) && (
                          <div className="result-team-title">
                            {entry.team && <strong>{/^\d+$/.test(entry.team) ? `ทีม ${entry.team}` : entry.team}</strong>}
                            {entry.title && <small>{entry.title}</small>}
                          </div>
                        )}
                        <ul>
                          {entry.members.map((member) => (
                            <li key={`${member.name}-${member.room ?? ""}`}><span>{member.name}</span><small>{member.room || "—"}</small></li>
                          ))}
                        </ul>
                        {entry.note && <p>{entry.note}</p>}
                      </div>
                      {entry.score && <div className="result-score"><span>คะแนน</span><strong>{entry.score}</strong></div>}
                    </article>
                  ))}
                </div>
                <div className="result-verification-note">
                  <span aria-hidden="true">✓</span>
                  <div><strong>ผลผ่านการรับรองแล้ว</strong><p>ประกาศ ณ วันที่ {resultSet.announcementDate ?? "—"}</p></div>
                  {resultSet.documentUrl && <a href={resultSet.documentUrl} target="_blank" rel="noreferrer">เปิดประกาศฉบับเต็ม <span>↗</span></a>}
                </div>
              </>
            ) : (
              <div className="result-pending-state">
                <span aria-hidden="true">⌛</span>
                <strong>อยู่ระหว่างรอผลที่คณะกรรมการรับรอง</strong>
                <p>เมื่อผลการแข่งขันได้รับการยืนยัน ระบบจะแสดงอันดับ ทีม รายชื่อผู้เข้าแข่งขัน ชั้น/ห้อง คะแนน และหมายเหตุในหน้านี้</p>
              </div>
            )}
          </section>
        ) : view === "participants" ? (
          <section className="participant-panel" role="tabpanel" aria-label={`รายชื่อผู้เข้าแข่งขัน ${item.title}`}>
            <div className="participant-panel-heading">
              <div>
                <p>ประกาศรายชื่อผู้เข้าแข่งขัน</p>
                <h3>{indexedTeams.length} ทีม/ผลงาน · {totalPeople} คน</h3>
                <small>ข้อมูล ณ วันที่ {participantDataUpdated}</small>
              </div>
              <label className="participant-search">
                <span aria-hidden="true">⌕</span>
                <input value={participantQuery} onChange={(event) => setParticipantQuery(event.target.value)} type="search" placeholder="ค้นหาชื่อ ทีม หรือห้อง" aria-label="ค้นหาในรายชื่อกิจกรรมนี้" />
                {participantQuery && <button type="button" onClick={() => setParticipantQuery("")} aria-label="ล้างคำค้นหา">×</button>}
              </label>
            </div>

            <div className="participant-result" aria-live="polite">
              <strong>{filteredTeams.length}</strong> ทีม/ผลงาน · <strong>{filteredPeople}</strong> รายชื่อ
            </div>

            {filteredTeams.length > 0 ? (
              <div className="participant-table-wrap">
                <table className="participant-table">
                  <thead>
                    <tr><th>ลำดับ</th><th>ทีม/หมายเลขทีม</th><th>ชื่อ–นามสกุลผู้เข้าแข่งขัน</th><th>ชั้น/ห้อง</th></tr>
                  </thead>
                  <tbody>
                    {filteredTeams.map((team) => team.members.map((member, memberIndex) => (
                      <tr key={`${team.team}-${member.participantNo}-${member.name}`}>
                        <td className="participant-number">{member.participantNo}</td>
                        {memberIndex === 0 && (
                          <td className="participant-team" rowSpan={team.members.length}>
                            <strong>{/^\d+$/.test(team.team) ? `ทีม ${team.team}` : team.team || "—"}</strong>
                            {team.title && <small>{team.title}</small>}
                          </td>
                        )}
                        <td><span className="participant-name">{member.name}</span>{member.role && <small className="participant-role">{member.role}</small>}</td>
                        <td className="participant-room">{member.room || "—"}</td>
                      </tr>
                    ))) }
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="participant-empty"><strong>ไม่พบรายชื่อที่ค้นหา</strong><p>ลองค้นด้วยชื่อจริง ชื่อทีม หรือเลขห้อง</p><button type="button" onClick={() => setParticipantQuery("")}>แสดงรายชื่อทั้งหมด</button></div>
            )}
          </section>
        ) : (
          <>
            {item.deadline && <div className="deadline-note"><span>สมัครภายใน</span><strong>{item.deadline}</strong></div>}
            <div className="modal-body" role="tabpanel" aria-label={`กติกา ${item.title}`}>
              <div className="rules-column">
                {item.sections.map((section, sectionIndex) => (
                  <section className="rule-section" key={section.title}>
                    <div className="rule-heading"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><h3>{section.title}</h3></div>
                    <ul>{section.items.map((rule) => <li key={rule}>{rule}</li>)}</ul>
                  </section>
                ))}
              </div>

              {(item.scoreRows || item.timePenalties || item.note || item.resources) && (
                <aside className="modal-aside">
                  {item.note && <div className="important-note"><span aria-hidden="true">!</span><p>{item.note}</p></div>}
                  {item.scoreRows && (
                    <section className="score-panel">
                      <div className="score-title"><h3>เกณฑ์การให้คะแนน</h3><strong>{item.scoreTotal}</strong></div>
                      <div className="score-table" role="table" aria-label="เกณฑ์การให้คะแนน">
                        {item.scoreRows.map((row, index) => (
                          <div className="score-row" role="row" key={row.label}><span role="cell">{String(index + 1).padStart(2, "0")}</span><p role="cell">{row.label}</p><strong role="cell">{row.score}</strong></div>
                        ))}
                      </div>
                    </section>
                  )}
                  {item.timePenalties && (
                    <section className="penalty-panel"><h3>การหักคะแนนด้านเวลา</h3>{item.timePenalties.map((row) => <div key={row.label}><span>{row.label}</span><strong>{row.score}</strong></div>)}</section>
                  )}
                  {item.resources && (
                    <section className="resource-panel"><h3>สื่อประกอบ</h3>{item.resources.map((resource) => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">{resource.label}<span>↗</span></a>)}</section>
                  )}
                </aside>
              )}
            </div>
          </>
        )}

        <footer className="modal-footer">
          <p>{footerCopy}</p>
          <div>
            <button className="button button-ghost-dark modal-switch" type="button" onClick={() => setView(switchTarget)}>{switchLabel} <span>↔</span></button>
            <a className="button button-ghost-dark" href="/downloads/science-competition-rules-2569.docx" download>ดาวน์โหลดกติกา <span>↓</span></a>
            <a className="button button-primary" href={item.form} target="_blank" rel="noreferrer">สมัครรายการนี้ <span>↗</span></a>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [showAllLevelsOnly, setShowAllLevelsOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ item: Competition; view: ModalView } | null>(null);
  const [liveActivities, setLiveActivities] = useState<Record<string, ActivityPayload> | null>(null);
  const [certificates, setCertificates] = useState<PublicCertificate[]>(fallbackCertificates);
  const [certificatesLoaded, setCertificatesLoaded] = useState(true);
  const [certificateQuery, setCertificateQuery] = useState("");
  const [certificateActivity, setCertificateActivity] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = window.location.hostname.endsWith("github.io")
      ? `${CENTRAL_SITE_URL}/api/public-data`
      : "/api/public-data";
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("public data unavailable")))
      .then((data: { activities?: Record<string, ActivityPayload> }) => {
        if (data.activities && typeof data.activities === "object") setLiveActivities(data.activities);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.warn("ใช้ข้อมูลสำรองของเว็บไซต์", error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = window.location.hostname.endsWith("github.io")
      ? `${CENTRAL_SITE_URL}/api/certificates`
      : "/api/certificates";
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("certificate data unavailable")))
      .then((data: { certificates?: PublicCertificate[] }) => setCertificates(Array.isArray(data.certificates) ? data.certificates : []))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.warn("ใช้รายการเกียรติบัตรสำรองจากชุดข้อมูลกลาง", error);
      })
      .finally(() => setCertificatesLoaded(true));
    return () => controller.abort();
  }, []);

  const activityDirectory = useMemo<Record<string, ActivityPayload>>(() => Object.fromEntries(
    competitions.map((item) => [item.id, liveActivities?.[item.id] ?? {
      competition: item,
      participants: participantDirectory[item.id],
      result: resultDirectory[item.id] ?? { status: "pending", entries: [] },
    }]),
  ), [liveActivities]);
  const competitionList = useMemo(() => competitions.map((item) => activityDirectory[item.id]?.competition ?? item), [activityDirectory]);
  const totalRegisteredTeams = useMemo(() => competitionList.reduce((total, item) => total + (activityDirectory[item.id]?.participants.teams.length ?? 0), 0), [activityDirectory, competitionList]);
  const totalRegisteredParticipants = useMemo(() => competitionList.reduce((total, item) => total + (activityDirectory[item.id]?.participants.teams.reduce((activityTotal, team) => activityTotal + team.members.length, 0) ?? 0), 0), [activityDirectory, competitionList]);
  const totalPublishedResultActivities = useMemo(() => competitionList.filter((item) => {
    const result = activityDirectory[item.id]?.result;
    return result?.status === "published" && result.entries.length > 0;
  }).length, [activityDirectory, competitionList]);
  const totalPublishedAwards = useMemo(() => competitionList.reduce((total, item) => {
    const result = activityDirectory[item.id]?.result;
    return total + (result?.status === "published" ? result.entries.length : 0);
  }, 0), [activityDirectory, competitionList]);
  const liveScheduleDays = useMemo(() => scheduleFrom(competitionList), [competitionList]);
  const selectedPayload = selected ? activityDirectory[selected.item.id] : null;
  const certificateActivities = useMemo(() => [...new Map(certificates.map((certificate) => [certificate.activityId, { id: certificate.activityId, title: certificate.activityTitle }])).values()], [certificates]);
  const filteredCertificates = useMemo(() => {
    const normalized = certificateQuery.trim().toLocaleLowerCase("th");
    return certificates.filter((certificate) => {
      const matchesActivity = certificateActivity === "all" || certificate.activityId === certificateActivity;
      const haystack = [certificate.recipientName, certificate.recipientRoom, certificate.teamName, certificate.award, certificate.activityTitle, certificate.activityLevel].filter(Boolean).join(" ").toLocaleLowerCase("th");
      return matchesActivity && (!normalized || haystack.includes(normalized));
    });
  }, [certificateActivity, certificateQuery, certificates]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [selected]);

  const filteredCompetitions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return competitionList.filter((item) => {
      const matchesLevel = showAllLevelsOnly ? item.level === "all" : activeFilter === "all" || item.level === activeFilter;
      const participantTerms = activityDirectory[item.id]?.participants.teams.flatMap((team) => [
        team.team,
        team.title,
        ...team.members.flatMap((member) => [member.name, member.room, member.role]),
      ]).filter(Boolean).join(" ") ?? "";
      const resultTerms = activityDirectory[item.id]?.result.entries.flatMap((entry) => [
        entry.award,
        entry.team,
        entry.title,
        entry.score,
        entry.note,
        ...entry.members.flatMap((member) => [member.name, member.room]),
      ]).filter(Boolean).join(" ") ?? "";
      const haystack = [item.title, item.shortTitle, item.subtitle, item.description, item.levelLabel, item.place, ...item.tags, participantTerms, resultTerms].join(" ").toLocaleLowerCase("th");
      return matchesLevel && (!normalized || haystack.includes(normalized));
    });
  }, [activeFilter, activityDirectory, competitionList, query, showAllLevelsOnly]);

  const chooseFilter = (value: FilterValue, allLevelsOnly = false) => {
    setActiveFilter(value);
    setShowAllLevelsOnly(allLevelsOnly);
  };

  return (
    <main>
      <nav className="topbar" aria-label="เมนูหลัก">
        <a className="wordmark" href="#top" aria-label="กลับสู่ด้านบน">
          <span className="wordmark-mark" aria-hidden="true">✦</span>
          <span><strong>SCIENCE WEEK 2569</strong><small>โรงเรียนทุ่งเสลี่ยมชนูปถัมภ์</small></span>
        </a>
        <div className="nav-links">
          <a href="#schedule">กำหนดการ</a>
          <a href="#results">ผลการแข่งขัน</a>
          <a href="#competitions">การแข่งขัน</a>
          <a href="#resources">เอกสาร</a>
          <a className="nav-cta" href="#certificates">เกียรติบัตร <span>↓</span></a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow glow-one" aria-hidden="true" />
        <div className="hero-glow glow-two" aria-hidden="true" />
        <div className="hero-content shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> งานสัปดาห์วิทยาศาสตร์แห่งชาติ · ปีการศึกษา 2569</p>
            <h1><span>ตำราลับแม่มด</span>ถอดรหัสเวทมนตร์<br />ด้วยวิทยาศาสตร์</h1>
            <p className="hero-lead">เมื่อเวทมนตร์ไม่ใช่เรื่องลึกลับ แต่คือวิทยาศาสตร์ที่รอการค้นพบ ร่วมคิด ทดลอง ประลองกลยุทธ์ และปล่อยพลังแห่งความอยากรู้ไปด้วยกัน</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#competitions">ค้นหารายการของคุณ <span>↓</span></a>
              <a className="button button-ghost" href="#results">ตรวจผลการแข่งขัน</a>
              <a className="button button-ghost" href="#certificates">ดาวน์โหลดเกียรติบัตร</a>
            </div>
            <div className="hero-meta" aria-label="ข้อมูลสำคัญของกิจกรรม">
              <div><strong>11</strong><span>รายการแข่งขัน</span></div>
              <div><strong>20–31</strong><span>สิงหาคม 2569</span></div>
              <div><strong>{totalRegisteredParticipants}</strong><span>รายชื่อผู้เข้าแข่งขัน</span></div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="hero-art-image" /><span className="spark spark-a">✦</span><span className="spark spark-b">✧</span><span className="spark spark-c">✦</span></div>
        </div>
        <div className="hero-scroll"><span>เลื่อนเพื่อสำรวจ</span><i /></div>
      </section>

      <section className="deadline-bar" aria-label="กำหนดเวลาสำคัญ">
        <div className="shell deadline-inner">
          <div className="deadline-copy"><span className="pulse-dot" /><div><strong>ประกาศรายชื่อผู้เข้าแข่งขันแล้ว</strong><p>ครบ 11 กิจกรรม · {totalRegisteredTeams} ทีม/ผลงาน · {totalRegisteredParticipants} คน · ข้อมูล ณ วันที่ {participantDataUpdated}</p></div></div>
          <a href="#competitions">ตรวจสอบรายชื่อ <span>→</span></a>
        </div>
      </section>

      <section className="results-section section" id="results">
        <div className="shell">
          <div className="section-heading results-heading">
            <div><p className="eyebrow dark"><span /> OFFICIAL RESULTS</p><h2>ประกาศผลการแข่งขัน</h2></div>
            <p>ผลแต่ละรายการจะแสดงทันทีหลังผ่านการตรวจสอบและรับรองจากคณะกรรมการ โดยไม่ต้องรอให้การแข่งขันครบทุกกิจกรรม</p>
          </div>

          <div className="results-overview">
            <div className="results-progress-copy"><span>ประกาศแล้ว</span><strong>{totalPublishedResultActivities}<small> / {competitionList.length} กิจกรรม</small></strong><p>{totalPublishedAwards > 0 ? `${totalPublishedAwards} รางวัลที่ประกาศอย่างเป็นทางการ` : "ระบบพร้อมสำหรับบันทึกและเผยแพร่ผลการแข่งขัน"}</p></div>
            <div className="results-progress" aria-label={`ประกาศผลแล้ว ${totalPublishedResultActivities} จาก ${competitionList.length} กิจกรรม`}><i style={{ width: `${(totalPublishedResultActivities / competitionList.length) * 100}%` }} /></div>
            <p>{resultAnnouncementNote}</p>
          </div>

          <div className="results-activity-list">
            {competitionList.map((item) => {
              const resultSet = activityDirectory[item.id]?.result;
              const isPublished = resultSet?.status === "published" && resultSet.entries.length > 0;
              return (
                <button className={`results-activity ${isPublished ? "published" : "pending"}`} type="button" key={item.id} onClick={() => setSelected({ item, view: "results" })} aria-label={`ดูผลการแข่งขัน ${item.shortTitle}`}>
                  <span className="results-activity-number">{String(item.order).padStart(2, "0")}</span>
                  <span className="results-activity-name"><strong>{item.shortTitle}</strong><small>{item.levelLabel}</small></span>
                  <span className="results-activity-status">{isPublished ? `${resultSet.entries.length} รางวัล` : "รอประกาศผล"}<i>→</i></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="certificate-section section" id="certificates">
        <div className="shell">
          <div className="section-heading certificate-heading">
            <div><p className="eyebrow dark"><span /> DIGITAL CERTIFICATES</p><h2>ค้นหาและดาวน์โหลด<br /><em>เกียรติบัตรของคุณ</em></h2></div>
            <p>ค้นหาด้วยชื่อ–นามสกุล แล้วตรวจสอบกิจกรรม ชั้น/ห้อง และรางวัลก่อนดาวน์โหลดไฟล์เกียรติบัตร</p>
          </div>
          <div className="certificate-tools">
            <label className="certificate-search"><span aria-hidden="true">⌕</span><input type="search" value={certificateQuery} onChange={(event) => setCertificateQuery(event.target.value)} placeholder="พิมพ์ชื่อ–นามสกุล ห้อง ทีม หรือรางวัล" aria-label="ค้นหาเกียรติบัตร" />{certificateQuery && <button type="button" onClick={() => setCertificateQuery("")} aria-label="ล้างคำค้นหา">×</button>}</label>
            <label className="certificate-filter"><span>กิจกรรม</span><select value={certificateActivity} onChange={(event) => setCertificateActivity(event.target.value)}><option value="all">ทุกกิจกรรม</option>{certificateActivities.map((activity) => <option value={activity.id} key={activity.id}>{activity.title}</option>)}</select></label>
          </div>
          {!certificatesLoaded ? (
            <div className="certificate-public-empty"><strong>กำลังโหลดรายการเกียรติบัตร…</strong></div>
          ) : certificates.length === 0 ? (
            <div className="certificate-public-empty"><span aria-hidden="true">✦</span><strong>ยังไม่เปิดให้ดาวน์โหลดเกียรติบัตร</strong><p>รายการจะปรากฏที่นี่หลังคณะกรรมการตรวจสอบและเผยแพร่ไฟล์แล้ว</p></div>
          ) : filteredCertificates.length === 0 ? (
            <div className="certificate-public-empty"><strong>ไม่พบเกียรติบัตรที่ตรงกับคำค้นหา</strong><p>ตรวจการสะกดชื่อ หรือลองเลือก “ทุกกิจกรรม”</p><button type="button" onClick={() => { setCertificateQuery(""); setCertificateActivity("all"); }}>แสดงทั้งหมด</button></div>
          ) : (
            <>
              <div className="certificate-result-count"><strong>{filteredCertificates.length}</strong><span>เกียรติบัตรที่ค้นพบ</span></div>
              <div className="certificate-download-list">
                {filteredCertificates.map((certificate, index) => (
                  <article key={certificate.id}>
                    <span className="certificate-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="certificate-recipient"><strong>{certificate.recipientName}</strong><small>{[certificate.recipientRoom, certificate.teamName].filter(Boolean).join(" · ") || "ผู้เข้าร่วมกิจกรรม"}</small></div>
                    <div className="certificate-activity"><strong>{certificate.activityTitle}</strong><small>{certificate.activityLevel}</small></div>
                    <span className="certificate-award">{certificate.award || "เข้าร่วม"}</span>
                    <a href={certificate.downloadUrl}>ดาวน์โหลดเกียรติบัตร <span>↓</span></a>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="schedule-section section" id="schedule">
        <div className="shell">
          <div className="section-heading split-heading">
            <div><p className="eyebrow dark"><span /> AUGUST 2569</p><h2>ปฏิทินแห่งการค้นพบ</h2></div>
            <p>บันทึกวันแข่งขันของคุณไว้ แล้วมาพร้อมความสงสัย ไอเดีย และทีมที่พร้อมลงมือทำ</p>
          </div>
          <div className="schedule-layout">
            <div className="schedule-track">
              {liveScheduleDays.map((item) => (
                <article className={`schedule-item ${item.tone}`} key={`${item.day}-${item.label}`}>
                  <div className="date-badge"><small>ส.ค.</small><strong>{item.day}</strong></div>
                  <div><h3>{item.label}</h3><p>{item.note}</p><small>{item.detail}</small></div>
                </article>
              ))}
            </div>
            <Countdown />
          </div>
        </div>
      </section>

      <section className="competition-section section" id="competitions">
        <div className="shell">
          <div className="section-heading competition-heading">
            <div><p className="eyebrow light"><span /> CHOOSE YOUR QUEST</p><h2>เลือกภารกิจที่ใช่<br /><em>แล้วปล่อยพลังของทีม</em></h2></div>
            <p className="section-intro">ค้นหาด้วยชื่อกิจกรรม ชื่อทีม หรือชื่อผู้สมัคร แล้วกด “รายชื่อผู้เข้าแข่งขัน” เพื่อดูตารางแยกทีมและชั้น/ห้องของแต่ละกิจกรรม</p>
          </div>

          <div className="competition-tools">
            <div className="filter-tabs" role="group" aria-label="กรองตามระดับชั้น">
              {filters.map((filter, index) => {
                const isAllLevels = index === 3;
                const pressed = isAllLevels ? showAllLevelsOnly : !showAllLevelsOnly && activeFilter === filter.value;
                return (
                  <button key={`${filter.value}-${index}`} type="button" className={pressed ? "active" : ""} aria-pressed={pressed} onClick={() => chooseFilter(filter.value, isAllLevels)}>
                    <span>{filter.label}</span><small>{filter.helper}</small>
                  </button>
                );
              })}
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="ค้นหากิจกรรม ทีม หรือชื่อผู้สมัคร" aria-label="ค้นหารายการแข่งขันหรือชื่อผู้สมัคร" />
              {query && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setQuery("")}>×</button>}
            </label>
          </div>

          <div className="result-summary" aria-live="polite"><span>{String(filteredCompetitions.length).padStart(2, "0")}</span><p>รายการที่ตรงกับการค้นหา</p><i /></div>

          {filteredCompetitions.length > 0 ? (
            <div className="competition-grid full-grid">
              {filteredCompetitions.map((item) => {
                const activityParticipants = activityDirectory[item.id]?.participants;
                const activityPeople = activityParticipants?.teams.reduce((total, team) => total + team.members.length, 0) ?? 0;
                const activityResult = activityDirectory[item.id]?.result;
                const hasActivityResult = activityResult?.status === "published" && activityResult.entries.length > 0;
                return (
                <article className={`competition-card ${item.accent}`} key={item.id} data-competition={item.id}>
                  <div className="card-topline"><span>{String(item.order).padStart(2, "0")}</span><i /><small>{item.levelShort}</small></div>
                  <div className="card-symbol" aria-hidden="true"><span>{item.glyph}</span></div>
                  <p className="card-kicker">{item.team} · {item.dateShort}</p>
                  <h3>{item.shortTitle}</h3>
                  <p className="card-subtitle">{item.subtitle}</p>
                  <p className="card-desc">{item.description}</p>
                  <dl className="card-facts">
                    <div><dt>เวลา</dt><dd>{item.time}</dd></div>
                    <div><dt>สถานที่</dt><dd>{item.place}</dd></div>
                    <div className="participant-fact"><dt>รายชื่อ</dt><dd>{activityParticipants?.teams.length ?? 0} ทีม · {activityPeople} คน</dd></div>
                    <div className={`result-fact ${hasActivityResult ? "published" : "pending"}`}><dt>ผล</dt><dd>{hasActivityResult ? `ประกาศแล้ว ${activityResult.entries.length} รางวัล` : "รอประกาศผล"}</dd></div>
                    {item.deadline && <div className="deadline-fact"><dt>สมัครภายใน</dt><dd>{item.deadline}</dd></div>}
                  </dl>
                  <div className="card-actions card-actions-with-results">
                    <button className="participant-button" type="button" onClick={() => setSelected({ item, view: "participants" })}>รายชื่อผู้เข้าแข่งขัน <span>→</span></button>
                    <button className={`result-button ${hasActivityResult ? "published" : "pending"}`} type="button" onClick={() => setSelected({ item, view: "results" })}>ผลการแข่งขัน <span>★</span></button>
                    <button type="button" onClick={() => setSelected({ item, view: "rules" })} aria-label={`อ่านกติกา ${item.shortTitle}`}>กติกา <span>＋</span></button>
                    <a href={item.form} target="_blank" rel="noreferrer" aria-label={`สมัคร ${item.shortTitle}`}>สมัคร <span>↗</span></a>
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><span aria-hidden="true">∅</span><h3>ยังไม่พบภารกิจที่ตรงกัน</h3><p>ลองเปลี่ยนระดับชั้นหรือใช้คำค้นที่สั้นลง</p><button type="button" onClick={() => { setQuery(""); chooseFilter("all"); }}>แสดงรายการทั้งหมด</button></div>
          )}
        </div>
      </section>

      <section className="resources-section section" id="resources">
        <div className="shell resources-grid">
          <div className="resource-copy">
            <p className="eyebrow dark"><span /> OFFICIAL DOCUMENTS</p>
            <h2>เตรียมทีมให้พร้อม<br />ก่อนเริ่มภารกิจ</h2>
            <p>ดาวน์โหลดกติกาฉบับรวม อ่านรายละเอียดรายการที่เลือกให้ครบ และตรวจสอบวัน–เวลาอีกครั้งก่อนสมัคร</p>
            <div className="resource-actions">
              <a className="button button-dark" href="/downloads/science-competition-rules-2569.docx" download>ดาวน์โหลดกติกาฉบับเต็ม <span>↓</span></a>
              <a className="text-link" href="#competitions">กลับไปเลือกรายการ <span>↑</span></a>
            </div>
          </div>
          <div className="prep-list">
            <article><span>01</span><div><h3>เลือกระดับชั้นให้ถูกต้อง</h3><p>ตรวจชื่อรายการและช่วงชั้นก่อนเปิดแบบฟอร์ม</p></div></article>
            <article><span>02</span><div><h3>อ่านกติกาและเกณฑ์คะแนน</h3><p>เตรียมวัสดุ อุปกรณ์ และผลงานให้ตรงข้อกำหนด</p></div></article>
            <article><span>03</span><div><h3>บันทึกวัน เวลา และสถานที่</h3><p>มาถึงก่อนเวลา พร้อมอุปกรณ์และสมาชิกทีมครบถ้วน</p></div></article>
          </div>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-art" aria-hidden="true" />
        <div className="shell closing-inner"><p>31 AUGUST 2569</p><h2>ทุกคำถาม คือจุดเริ่มต้น<br />ของการค้นพบครั้งใหม่</h2><a className="button button-primary" href="#competitions">เลือกภารกิจของคุณ <span>↑</span></a></div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <div className="wordmark footer-mark"><span className="wordmark-mark">✦</span><span><strong>SCIENCE TC 💛❤️</strong><small>โรงเรียนทุ่งเสลี่ยมชนูปถัมภ์</small></span></div>
          <p>งานสัปดาห์วิทยาศาสตร์แห่งชาติ · ปีการศึกษา 2569</p>
          <div><a href={`${CENTRAL_SITE_URL}/admin`}>สำหรับกรรมการ</a><a href="#top">กลับด้านบน ↑</a></div>
        </div>
      </footer>

      {selected && selectedPayload && <CompetitionModal item={selectedPayload.competition} participantSet={selectedPayload.participants} resultSet={selectedPayload.result} initialView={selected.view} onClose={() => setSelected(null)} />}
    </main>
  );
}
