"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { competitions, scheduleDays, type Competition, type CompetitionLevel } from "./competitions";

type FilterValue = "all" | CompetitionLevel;

const staticBase = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/?$/, "/");
const publicAsset = (path: string) => `${staticBase}${path.replace(/^\/+/, "")}`;

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

function RulesModal({ item, onClose }: { item: Competition; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

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
          <div><span>สถานที่</span><strong>{item.place}</strong></div>
          <div><span>ผู้เข้าแข่งขัน</span><strong>{item.team}</strong></div>
        </div>

        {item.deadline && (
          <div className="deadline-note"><span>สมัครภายใน</span><strong>{item.deadline}</strong></div>
        )}

        <div className="modal-body">
          <div className="rules-column">
            {item.sections.map((section, sectionIndex) => (
              <section className="rule-section" key={section.title}>
                <div className="rule-heading"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><h3>{section.title}</h3></div>
                <ul>
                  {section.items.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
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
                      <div className="score-row" role="row" key={row.label}>
                        <span role="cell">{String(index + 1).padStart(2, "0")}</span>
                        <p role="cell">{row.label}</p>
                        <strong role="cell">{row.score}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {item.timePenalties && (
                <section className="penalty-panel">
                  <h3>การหักคะแนนด้านเวลา</h3>
                  {item.timePenalties.map((row) => (
                    <div key={row.label}><span>{row.label}</span><strong>{row.score}</strong></div>
                  ))}
                </section>
              )}

              {item.resources && (
                <section className="resource-panel">
                  <h3>สื่อประกอบ</h3>
                  {item.resources.map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">{resource.label}<span>↗</span></a>
                  ))}
                </section>
              )}
            </aside>
          )}
        </div>

        <footer className="modal-footer">
          <p>อ่านกติกาให้ครบถ้วนก่อนส่งแบบฟอร์มสมัคร</p>
          <div>
            <a className="button button-ghost-dark" href={publicAsset("downloads/science-competition-rules-2569.docx")} download>ดาวน์โหลดกติกา <span>↓</span></a>
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
  const [selected, setSelected] = useState<Competition | null>(null);

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
    return competitions.filter((item) => {
      const matchesLevel = showAllLevelsOnly ? item.level === "all" : activeFilter === "all" || item.level === activeFilter;
      const haystack = [item.title, item.shortTitle, item.subtitle, item.description, item.levelLabel, item.place, ...item.tags].join(" ").toLocaleLowerCase("th");
      return matchesLevel && (!normalized || haystack.includes(normalized));
    });
  }, [activeFilter, query, showAllLevelsOnly]);

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
          <a href="#competitions">การแข่งขัน</a>
          <a href="#resources">เอกสาร</a>
          <a className="nav-cta" href="#competitions">สมัครแข่งขัน <span>↗</span></a>
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
              <a className="button button-ghost" href="#schedule">ดูกำหนดการทั้งหมด</a>
            </div>
            <div className="hero-meta" aria-label="ข้อมูลสำคัญของกิจกรรม">
              <div><strong>11</strong><span>รายการแข่งขัน</span></div>
              <div><strong>20–31</strong><span>สิงหาคม 2569</span></div>
              <div><strong>ม.1–6</strong><span>ร่วมถอดรหัส</span></div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="hero-art-image" /><span className="spark spark-a">✦</span><span className="spark spark-b">✧</span><span className="spark spark-c">✦</span></div>
        </div>
        <div className="hero-scroll"><span>เลื่อนเพื่อสำรวจ</span><i /></div>
      </section>

      <section className="deadline-bar" aria-label="กำหนดเวลาสำคัญ">
        <div className="shell deadline-inner">
          <div className="deadline-copy"><span className="pulse-dot" /><div><strong>กำหนดเวลาสำคัญ</strong><p>ชุดรีไซเคิลสมัครภายใน 10 ส.ค. · Science Show สมัครภายใน 14 ส.ค. 2569</p></div></div>
          <a href="#competitions">ไปยังรายการสมัคร <span>→</span></a>
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
              {scheduleDays.map((item) => (
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
            <p className="section-intro">ค้นหาและกรองรายการตามระดับชั้น กด “อ่านกติกา” เพื่อดูข้อกำหนด เกณฑ์คะแนน และลิงก์สมัครอย่างครบถ้วน</p>
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="ค้นหา เช่น จรวด, วาดภาพ, ม.ปลาย" aria-label="ค้นหารายการแข่งขัน" />
              {query && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setQuery("")}>×</button>}
            </label>
          </div>

          <div className="result-summary" aria-live="polite"><span>{String(filteredCompetitions.length).padStart(2, "0")}</span><p>รายการที่ตรงกับการค้นหา</p><i /></div>

          {filteredCompetitions.length > 0 ? (
            <div className="competition-grid full-grid">
              {filteredCompetitions.map((item) => (
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
                    {item.deadline && <div className="deadline-fact"><dt>สมัครภายใน</dt><dd>{item.deadline}</dd></div>}
                  </dl>
                  <div className="card-actions">
                    <button type="button" onClick={() => setSelected(item)}>อ่านกติกา <span>＋</span></button>
                    <a href={item.form} target="_blank" rel="noreferrer" aria-label={`สมัคร ${item.shortTitle}`}>สมัคร <span>↗</span></a>
                  </div>
                </article>
              ))}
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
              <a className="button button-dark" href={publicAsset("downloads/science-competition-rules-2569.docx")} download>ดาวน์โหลดกติกาฉบับเต็ม <span>↓</span></a>
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
          <a href="#top">กลับด้านบน ↑</a>
        </div>
      </footer>

      {selected && <RulesModal item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
