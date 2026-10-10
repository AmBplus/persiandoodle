import { useState } from "react";
import CompoCanvas from "./CompoCanvas.jsx";
import { faNum } from "../lib/data.js";
import { FPS } from "../lib/compositions.js";

// کارت «استفاده عملی» — صحنهٔ ترکیبی زنده + چیپِ کامپوننت‌های سازنده‌اش + صدای اختیاری
export default function CompoCard({ compo, audio, onOpenItem, items }) {
  const [hover, setHover] = useState(false);
  const [sound, setSound] = useState(false);
  const totalFrames = compo.steps.reduce((a, s) => a + s.frames, 0);
  const durSec = (totalFrames / FPS).toFixed(1);

  const toggleSound = async () => {
    if (sound) { audio.disable(); setSound(false); }
    else { await audio.enable(); setSound(true); }
  };

  const ingredients = compo.steps
    .map((s) => items.find((it) => it.id === `typo/${s.key}`))
    .filter(Boolean);

  return (
    <article
      className="card card-compo"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="card-media">
        <CompoCanvas compo={compo} playing={hover} audio={audio} withAudio={sound && hover} />
        <span className="live-dot compo-dot">ترکیبی</span>
        <button
          type="button"
          className={`sound-btn ${sound ? "on" : ""}`}
          onClick={toggleSound}
          title={sound ? "قطع صدا" : "پخش با صدا"}
          aria-label={sound ? "قطع صدا" : "پخش با صدا"}
        >
          {sound ? "♫" : "♪̸"}
        </button>
      </div>
      <div className="card-body">
        <h3 className="card-title">{compo.titleFa}</h3>
        <p className="card-desc">{compo.descFa}</p>
        <div className="card-meta">
          <span className="chip">زنجیرهٔ {faNum(compo.steps.length)} افکت</span>
          <span className="chip">~{faNum(durSec)} ثانیه حلقه</span>
        </div>
        <div className="compo-ing" aria-label="کامپوننت‌های سازنده">
          {ingredients.map((it) => (
            <button
              key={it.id}
              type="button"
              className="ing-chip"
              onClick={() => onOpenItem?.(it)}
              title={`باز کردن «${it.title}»`}
            >
              {it.title}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
