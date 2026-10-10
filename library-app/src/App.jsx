import { useEffect, useMemo, useRef, useState } from "react";
import { loadLibrary, SOURCE_FA, faNum } from "./lib/data.js";
import Card from "./components/Card.jsx";
import Drawer from "./components/Drawer.jsx";
import SelectionBar from "./components/SelectionBar.jsx";

const PAGE = 48;

export default function App() {
  const [lib, setLib] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [src, setSrc] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [sel, setSel] = useState(null);
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const searchRef = useRef(null);

  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pickAllFiltered = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      filtered.forEach((it) => next.add(it.id));
      return next;
    });

  useEffect(() => {
    loadLibrary().then(setLib).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!lib) return [];
    const query = q.trim().toLowerCase();
    return lib.items.filter((it) => {
      if (cat && it.category !== cat) return false;
      if (src && it.source !== src) return false;
      if (!query) return true;
      return (
        it.title?.toLowerCase().includes(query) ||
        it.desc?.toLowerCase().includes(query) ||
        it.id.toLowerCase().includes(query) ||
        it.category.toLowerCase().includes(query) ||
        (it.tags || []).some((t) => t.toLowerCase().includes(query)) ||
        (it.font || "").toLowerCase().includes(query)
      );
    });
  }, [lib, q, cat, src]);

  useEffect(() => setVisible(PAGE), [q, cat, src]);

  const shown = filtered.slice(0, visible);
  const liveCount = filtered.filter((i) => i.kind === "typo").length;

  if (error) return <div className="boot-error">خطا در بارگذاری داده‌ها: {error}</div>;
  if (!lib) return <div className="boot-loading">در بارگذاری کتابخانه…</div>;

  return (
    <div className="shell">
      <div className="aurora" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="https://github.com/AmBplus/persiandoodle" target="_blank" rel="noopener noreferrer">
          <span className="brand-mark">پ</span>
          <span className="brand-text">
            <b>کتابخانهٔ موشن فارسی</b>
            <small>PersianDoodle · کامپوننت‌های آمادهٔ موشن‌گرافیک</small>
          </span>
        </a>
        <div className="topbar-stats">
          <span><b>{faNum(lib.stats.typo)}</b> تایپوگرافی زنده</span>
          <i />
          <span><b>{faNum(lib.stats.entries)}</b> طرح و کامپوننت</span>
        </div>
        <a className="gh-btn" href="https://github.com/Vincentwei1021/video-shotcraft" target="_blank" rel="noopener noreferrer" title="منبع مرجع: video-shotcraft">
          ↗ منبع مرجع
        </a>
      </header>

      <section className="hero">
        <h1>هر حرکتی که برای ویدیوی فارسی‌ات لازم داری، <em>یک‌جا</em></h1>
        <p>
          تایپوگرافی متحرک با ۲۵ فونت فارسی، پیش‌نمایش زندهٔ کانواس، کد آمادهٔ React و کد خام کنار هر رندر —
          همه در یک منوی واحد؛ فیلتر کن، کلیک کن، استفاده کن.
        </p>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="جست‌وجو در عنوان، توضیح، فونت، تگ…  (کلید /)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </section>

      <nav className="filterbar" aria-label="فیلترها">
        <button
          type="button"
          className={`fchip pick-toggle ${pickMode ? "on" : ""}`}
          onClick={() => setPickMode((m) => !m)}
          title="حالت انتخاب چندگانه — چند مورد را تیک بزن و پرامنت/نام‌شان را کپی کن"
        >
          ☑ انتخاب چندگانه
        </button>
        <div className="chips" role="tablist" aria-label="دسته‌ها">
          <button className={`fchip ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>
            همه <b>{faNum(lib.stats.total)}</b>
          </button>
          {lib.categories.map((c) => (
            <button
              key={c.name}
              className={`fchip ${cat === c.name ? "on" : ""} ${c.name === "تایپوگرافی موشن" ? "typo-chip" : ""}`}
              onClick={() => setCat(cat === c.name ? "" : c.name)}
            >
              {c.name} <b>{faNum(c.count)}</b>
            </button>
          ))}
        </div>
        <div className="srcrow">
          {lib.sources.map((s) => (
            <button
              key={s.name}
              className={`fchip mini src-${s.name} ${src === s.name ? "on" : ""}`}
              onClick={() => setSrc(src === s.name ? "" : s.name)}
            >
              {SOURCE_FA[s.name] || s.name}
            </button>
          ))}
          {(q || cat || src) && (
            <button className="fchip mini clear" onClick={() => { setQ(""); setCat(""); setSrc(""); }}>
              ✕ پاک‌کردن
            </button>
          )}
        </div>
      </nav>

      <main className="grid-wrap">
        <div className="result-line">
          <b>{faNum(filtered.length)}</b> نتیجه
          {liveCount > 0 && <span className="live-note"> · {faNum(liveCount)} مورد با پیش‌نمایش زنده</span>}
        </div>
        <div className="grid">
          {shown.map((it) => (
            <Card
              key={it.id}
              item={it}
              onSelect={setSel}
              picked={picked.has(it.id)}
              onTogglePick={togglePick}
              pickMode={pickMode}
            />
          ))}
        </div>
        {filtered.length > visible && (
          <div className="more-wrap">
            <button className="more-btn" onClick={() => setVisible((v) => v + PAGE)}>
              نمایش {faNum(Math.min(PAGE, filtered.length - visible))} مورد بیشتر
            </button>
          </div>
        )}
        {filtered.length === 0 && <div className="empty">چیزی مطابق فیلترها پیدا نشد.</div>}
      </main>

      <footer className="footer">
        <div>
          بازسازی بومی فارسی بر پایهٔ منابع آزاد:
          <a href="https://github.com/Vincentwei1021/video-shotcraft" target="_blank" rel="noopener noreferrer"> Vincentwei1021/video-shotcraft </a>
          و
          <a href="https://github.com/atmirrr/persian-motion-director" target="_blank" rel="noopener noreferrer"> atmirrr/persian-motion-director</a>
        </div>
        <div>رندرها موتور اختصاصی همین پروژه‌اند · مجوزها در مخزن</div>
      </footer>

      <SelectionBar
        items={lib.items}
        picked={picked}
        onClear={() => setPicked(new Set())}
        onPickAllFiltered={pickAllFiltered}
        filteredCount={filtered.length}
      />

      <Drawer item={sel} onClose={() => setSel(null)} />
    </div>
  );
}
