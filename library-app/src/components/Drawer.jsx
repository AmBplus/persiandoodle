import { useEffect, useMemo, useState } from "react";
import TypeCanvas from "./TypeCanvas.jsx";
import CodeBlock from "./CodeBlock.jsx";
import { reactCode, rawCode, effectSource } from "../lib/snippets.js";
import { FONT_NAMES } from "../lib/fonts.js";
import { SOURCE_FA, faNum } from "../lib/data.js";

const ACCENTS = ["#ffb547", "#7cc4b8", "#a78bfa", "#ff7a59", "#4ade80", "#38bdf8"];
const TABS = [
  ["react", "کد React"],
  ["raw", "کانواس خام"],
  ["src", "سورس افکت"],
];

function TypoDetail({ item }) {
  const [text, setText] = useState(item.text);
  const [font, setFont] = useState(item.font);
  const [accent, setAccent] = useState(item.accent);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState("react");
  const [showVideo, setShowVideo] = useState(false);

  const model = useMemo(
    () => ({
      ...item.model,
      title: item.title,
      frames: item.frames,
      fps: item.fps,
      sub: item.sub,
      target: item.target,
      finale: item.finale,
      pen: item.pen,
    }),
    [item]
  );
  const opts = { text, font, accent };
  const code = tab === "react" ? reactCode(model, opts) : tab === "raw" ? rawCode(model, opts) : effectSource(model);

  return (
    <>
      <TypeCanvas
        model={model}
        font={font}
        text={text}
        accent={accent}
        playing={playing}
        className="drawer-canvas"
      />

      <div className="controls">
        <button type="button" className="ctl" onClick={() => setPlaying((p) => !p)}>
          {playing ? "⏸ توقف" : "▶ پخش"}
        </button>
        <label className="ctl-field">
          متن
          <input dir="rtl" value={text} onChange={(e) => setText(e.target.value)} maxLength={64} />
        </label>
        <label className="ctl-field">
          فونت
          <select value={font} onChange={(e) => setFont(e.target.value)}>
            {FONT_NAMES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <div className="ctl-field swatches" role="group" aria-label="رنگ تأکید">
          رنگ
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`sw ${c === accent ? "on" : ""}`}
              style={{ background: c }}
              onClick={() => setAccent(c)}
              aria-label={`رنگ ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="detail-actions">
        {item.media?.video && (
          <>
            <button type="button" className="ghost-btn" onClick={() => setShowVideo((v) => !v)}>
              {showVideo ? "بستن ویدیو" : "▶ ویدیوی نمونه"}
            </button>
            <a className="ghost-btn" href={item.media.video} download target="_blank" rel="noopener noreferrer">
              ⬇ دانلود ویدیو (با موسیقی)
            </a>
            {item.media.audio && (
              <a className="ghost-btn" href={item.media.audio} download target="_blank" rel="noopener noreferrer">
                ♫ دانلود موسیقی (مجزا)
              </a>
            )}
          </>
        )}
        <a className="ghost-btn" href="typography/effects.js" download="effects.js">
          ⬇ دانلود موتور رندر (effects.js)
        </a>
      </div>

      {showVideo && item.media?.video && (
        <video className="sample-video" src={item.media.video} poster={item.media.poster} controls loop playsInline />
      )}

      <div className="tabs" role="tablist">
        {TABS.map(([k, lbl]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`tab-btn ${tab === k ? "on" : ""}`}
            onClick={() => setTab(k)}
          >
            {lbl}
          </button>
        ))}
      </div>
      <CodeBlock code={code} label={TABS.find(([k]) => k === tab)[1]} />

      <div className="detail-meta">
        <span className="chip">{faNum(model.frames)} فریم</span>
        <span className="chip">{faNum(model.fps)} فریم‌برثانیه</span>
        <span className="chip">فونت پیش‌فرض: {item.font}</span>
        {item.tags.map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
    </>
  );
}

function EntryDetail({ item }) {
  const m = item.media;
  const [showVideo, setShowVideo] = useState(false);
  const isSound = item.kind === "entry" && !m?.video && !!m?.audio;
  return (
    <>
      {m && (m.poster || m.thumbnail) && (
        <img className="entry-poster" src={m.poster || m.thumbnail} alt={item.title} />
      )}
      {m?.video && (
        <video className="sample-video" src={m.video} poster={m.poster} controls loop playsInline />
      )}
      {isSound && (
        <div className="sound-player">
          <span className="sound-ico" aria-hidden="true">♫</span>
          <audio controls src={m.audio} style={{ width: "100%" }} />
        </div>
      )}
      {!m && (
        <div className="entry-empty">
          رندر تصویری این طرح هنوز تولید نشده — پیش‌نمایش زنده به‌زودی برای مدل‌های منتخب اضافه می‌شود.
        </div>
      )}

      <dl className="entry-meta">
        {item.duration && <div><dt>مدت</dt><dd>{item.duration}</dd></div>}
        {item.energy && <div><dt>انرژی</dt><dd>{item.energy}</dd></div>}
        <div><dt>منبع</dt><dd>{SOURCE_FA[item.source] || item.source}</dd></div>
        {item.status && <div><dt>وضعیت</dt><dd>رندر محلی فارسی</dd></div>}
        {item.license && <div><dt>مجوز</dt><dd>{item.license}</dd></div>}
      </dl>

      {item.desc && (
        <div className="entry-desc">
          <h4>توضیح</h4>
          <p>{item.desc}</p>
        </div>
      )}

      <div className="detail-actions">
        {m?.video && (
          <>
            <button type="button" className="ghost-btn" onClick={() => setShowVideo((v) => !v)}>
              {showVideo ? "بستن ویدیو" : "▶ ویدیوی نمونه"}
            </button>
            <a className="ghost-btn" href={m.video} download target="_blank" rel="noopener noreferrer">
              ⬇ دانلود ویدیو
            </a>
            {m.audio && (
              <a className="ghost-btn" href={m.audio} download target="_blank" rel="noopener noreferrer">
                ♫ دانلود موسیقی (مجزا)
              </a>
            )}
          </>
        )}
        {isSound && (
          <a className="ghost-btn" href={m.audio} download target="_blank" rel="noopener noreferrer">
            ⬇ دانلود صدا
          </a>
        )}
      </div>

      {showVideo && m?.video && (
        <video className="sample-video" src={m.video} poster={m.poster} controls loop playsInline />
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="detail-meta">
          {item.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
    </>
  );
}

export default function Drawer({ item, onClose }) {
  // قفل اسکرول فقط وقتی دراور واقعاً باز است — وگرنه صفحه اسکرول نمی‌شد
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.title}>
        <header className="drawer-head">
          <div>
            <span className={`badge src-${item.source}`}>{SOURCE_FA[item.source] || item.source}</span>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="بستن">✕</button>
        </header>
        <div className="drawer-body">{item.kind === "typo" ? <TypoDetail item={item} /> : <EntryDetail item={item} />}</div>
      </aside>
    </div>
  );
}
