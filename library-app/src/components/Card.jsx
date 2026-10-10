import { useState } from "react";
import TypeCanvas from "./TypeCanvas.jsx";
import { SOURCE_FA, faNum } from "../lib/data.js";

const hash = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const HUES = [212, 262, 22, 162, 335, 192];
function PlaceholderArt({ item }) {
  const h = HUES[hash(item.id) % HUES.length];
  const letter = (item.title || "؟").trim().charAt(0);
  return (
    <div
      className="ph-art"
      style={{
        background: `radial-gradient(120% 120% at 85% 15%, hsl(${h} 60% 24%) 0%, hsl(${(h + 40) % 360} 55% 12%) 55%, #0b0f1a 100%)`,
      }}
    >
      <span className="ph-letter" style={{ color: `hsl(${h} 70% 70%)` }}>{letter}</span>
      <span className="ph-cat">{item.category}</span>
    </div>
  );
}

export default function Card({ item, onSelect }) {
  const [hover, setHover] = useState(false);
  const live = item.kind === "typo";

  return (
    <article
      className={`card ${live ? "card-typo" : "card-entry"}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(item)}
    >
      {live ? (
        <div className="card-media">
          <TypeCanvas model={item.model} font={item.font} text={item.text} accent={item.accent} playing={hover} />
          <span className="live-dot" title="پیش‌نمایش زنده">زنده</span>
        </div>
      ) : (
        <div className="card-media">
          {item.media && (item.media.poster || item.media.thumbnail) ? (
            <img loading="lazy" src={item.media.poster || item.media.thumbnail} alt={item.title} />
          ) : (
            <PlaceholderArt item={item} />
          )}
        </div>
      )}

      <div className="card-body">
        <h3 className="card-title">{item.title}</h3>
        <div className="card-meta">
          <span className={`badge src-${item.source}`}>{SOURCE_FA[item.source] || item.source}</span>
          <span className="chip cat">{item.category}</span>
          {live && <span className="chip font-chip">{item.font}</span>}
        </div>
        {live && item.desc && <p className="card-desc">{item.desc}</p>}
        {!live && item.tags.length > 0 && (
          <div className="card-tags">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export { faNum };
