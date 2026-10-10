import { useMemo, useState } from "react";
import { copyText, namesList, buildReport, buildJson } from "../lib/selection.js";
import { faNum } from "../lib/data.js";

// نوار شناور انتخاب چندگانه — تیک چند کارت، بعد کپی نام‌ها یا پرامنت‌ها
export default function SelectionBar({ items, picked, onClear, onPickAllFiltered, filteredCount }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("report"); // report | names | json

  const selected = useMemo(
    () => items.filter((it) => picked.has(it.id)),
    [items, picked]
  );

  const text = useMemo(() => {
    if (tab === "names") return namesList(selected);
    if (tab === "json") return buildJson(selected);
    return buildReport(selected, note);
  }, [tab, selected, note]);

  if (picked.size === 0) return null;

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const doCopy = async () => {
    const ok = await copyText(text);
    flash(ok ? "کپی شد ✓" : "کپی خودکار نشد — از کادر متنی دستی کپی کن");
  };

  return (
    <div className={`selbar ${open ? "open" : ""}`} role="region" aria-label="انتخاب‌های چندگانه">
      <div className="selbar-row">
        <span className="selbar-count">
          <b>{faNum(picked.size)}</b> مورد انتخاب شد
        </span>

        <div className="selbar-actions">
          <button type="button" className="sel-btn" onClick={onPickAllFiltered} title="همهٔ نتایج فیلترشده را تیک بزن">
            انتخاب همهٔ نتایج ({faNum(filteredCount)})
          </button>
          <button type="button" className="sel-btn primary" onClick={() => { setOpen(true); setTab("report"); doCopy(); }}>
            کپی پرامنت‌ها
          </button>
          <button type="button" className="sel-btn" onClick={() => { setOpen(true); setTab("names"); doCopy(); }}>
            کپی نام‌ها
          </button>
          <button type="button" className="sel-btn icon" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="پنل متنی">
            {open ? "▾" : "▴"}
          </button>
          <button type="button" className="sel-btn danger" onClick={onClear} title="پاک‌کردن انتخاب‌ها">
            ✕
          </button>
        </div>
      </div>

      {open && (
        <div className="selbar-panel">
          <div className="selbar-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "report"} className={`sel-tab ${tab === "report" ? "on" : ""}`} onClick={() => setTab("report")}>پرامنت / گزارش اصلاح</button>
            <button role="tab" aria-selected={tab === "names"} className={`sel-tab ${tab === "names" ? "on" : ""}`} onClick={() => setTab("names")}>فقط نام‌ها</button>
            <button role="tab" aria-selected={tab === "json"} className={`sel-tab ${tab === "json" ? "on" : ""}`} onClick={() => setTab("json")}>JSON</button>
          </div>

          {tab === "report" && (
            <label className="selbar-note">
              درخواستت را اضافه کن (مثلاً: «اینها را درست کن، به هم می‌خورند»)
              <input
                dir="rtl"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: متن‌ها از کادر بیرون می‌زنند — اصلاح کن"
              />
            </label>
          )}

          <textarea readOnly dir="auto" value={text} onFocus={(e) => e.target.select()} spellCheck={false} />
          <div className="selbar-hint">این متن را کپی کن و در گفتگو برایم بفرست تا همان موارد را اصلاح کنم.</div>
        </div>
      )}

      {toast && <div className="selbar-toast">{toast}</div>}
    </div>
  );
}
