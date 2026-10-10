// لایهٔ دادهٔ کتابخانه — تایپوگرافی + کاتالوگ + رندرهای فارسی، یکپارچه در یک منو
const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${u} → ${r.status}`))));

export const SOURCE_FA = {
  typography: "تایپوگرافی",
  shotcraft: "video-shotcraft",
  mg: "موشن‌گرافیک",
  talkcraft: "تاک‌کرفت",
  explainer: "اکسپلینر",
  onetake: "وان‌تیک",
  native: "بومی",
};

const faDigits = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
export const faNum = faDigits;

function countBy(items, key) {
  const m = new Map();
  for (const it of items) {
    const k = it[key] || "سایر";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function loadLibrary() {
  const [typo, catalog, renders] = await Promise.all([
    j("./data/typography-models.json"),
    j("./data/catalog.json"),
    j("./data/persian-renders.json").catch(() => null),
  ]);

  // پوستر/ویدیوی رندرشده برای entryهای کاتالوگ (اگر وجود داشته باشد)
  const mediaOf = {};
  const R = (renders && renders.renders) || {};
  for (const [id, r] of Object.entries(R)) {
    const v = (r.variants || []).find((x) => x && (x.poster || x.thumbnail || x.video));
    if (v) mediaOf[id] = {
      poster: v.poster,
      thumbnail: v.thumbnail,
      video: v.video,
      audio: v.video ? String(v.video).replace(/preview\.mp4$/, "music.m4a") : null,
    };
  }

  const typoItems = typo.models.map((m) => ({
    kind: "typo",
    id: `typo/${m.key}`,
    title: m.titleFa,
    desc: m.descFa,
    category: "تایپوگرافی موشن",
    source: "typography",
    tags: m.tags || [],
    font: m.defaultFont,
    text: m.defaultText,
    accent: m.accent,
    media: m.media ? { ...m.media, audio: m.media.video ? m.media.video.replace(/preview\.mp4$/, "music.m4a") : null } : null,
    frames: m.durationFrames || 150,
    fps: m.fps || 30,
    sub: m.sub || null,
    target: m.target || null,
    finale: m.finale || null,
    model: m,
  }));

  const entryItems = catalog.entries.map((e) => ({
    kind: "entry",
    id: e.id,
    title: e.titleFa && e.titleFa !== e.name ? e.titleFa : e.name,
    desc: e.description || "",
    category: e.category || "سایر",
    source: e.source,
    tags: e.tags || [],
    duration: e.duration,
    energy: e.energy,
    license: e.license,
    sourceUrl: e.sourceUrl,
    status: e.status,
    media: mediaOf[e.id] || null,
  }));

  const items = [...typoItems, ...entryItems];
  return {
    items,
    categories: countBy(items, "category"),
    sources: countBy(items, "source"),
    stats: {
      typo: typoItems.length,
      entries: entryItems.length,
      total: items.length,
    },
  };
}
