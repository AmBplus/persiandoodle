// PersianArts · shot scene engine — ONE shared procedural scene module.
// Used by: the library page (poster stills) and the engine's film renderer (headless MP4).
// Pure canvas 2D, no DOM. Every scene is seeded → the same entry always renders identically.
// Archetypes are parameterized by the entry's name/tags so hundreds of catalog items get
// honest local renders without hand-animating each one.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => { t = clamp01(t); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; t = clamp01(t); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const lerpK = (p, a, b) => a + (b - a) * clamp01(p);
const toFa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const SETTLE = 0.78;

// ---------------------------------------------------------------- palettes (dark, cinematic)
export const SHOT_PALETTES = [
  { bg: "#0d1424", panel: "#17203a", ink: "#f2f6fc", accent: "#ffb547", muted: "#4a5873" },
  { bg: "#0b1118", panel: "#142230", ink: "#eef4f2", accent: "#4fd1b1", muted: "#3f5566" },
  { bg: "#120f1e", panel: "#1f1936", ink: "#f4f1fb", accent: "#a78bfa", muted: "#4d4570" },
  { bg: "#101418", panel: "#1b232c", ink: "#f0f4f6", accent: "#ff7a59", muted: "#46525c" },
  { bg: "#0d1410", panel: "#16241a", ink: "#eef6ef", accent: "#7dd87d", muted: "#3f5745" },
  { bg: "#14101a", panel: "#231a2e", ink: "#f6f1f8", accent: "#ff5f8f", muted: "#554a63" },
  { bg: "#0e1216", panel: "#19212a", ink: "#eef3f8", accent: "#38bdf8", muted: "#42505e" },
  { bg: "#151311", panel: "#262019", ink: "#f7f3ec", accent: "#e8b04b", muted: "#59503f" },
  { bg: "#101018", panel: "#1b1b2c", ink: "#f1f1f8", accent: "#8fa7ff", muted: "#484a66" },
  { bg: "#111616", panel: "#1c2727", ink: "#eff6f4", accent: "#2dd4bf", muted: "#41504e" },
];

// ---------------------------------------------------------------- Persian phrasebook
const FA_WORDS = {
  typewriter: "ماشین‌نویس", flying: "پرنده", words: "کلمات", word: "واژه", glitch: "گلیچ", split: "شکاف",
  flap: "فلپ", flip: "فلیپ", title: "عنوان", camera: "دوربین", pan: "پن", zoom: "زوم", depth: "عمق",
  layer: "لایه", layers: "لایه‌ها", chart: "نمودار", bar: "میله‌ای", bars: "میله‌ای", line: "خطی", dot: "نقطه‌ای",
  donut: "دونات", gauge: "گیج", progress: "پیشرفت", cursor: "نشانگر", click: "کلیک", chip: "چیپ",
  card: "کارت", cards: "کارت‌ها", stack: "پشته", carousel: "چرخان", slider: "لغزنده", toggle: "کلید",
  avatar: "آواتار", modal: "مودال", toast: "توست", stream: "جریان", typing: "تایپ", type: "تایپ",
  reveal: "آشکارسازی", wipe: "وایپ", push: "رانش", slam: "کوبش", iris: "دریچه", blur: "محو",
  slide: "سُرش", spring: "فنری", bounce: "جهش", shake: "لرزش", pulse: "پالس", beat: "ضرب",
  rhythm: "ریتم", flash: "فلاش", strobe: "چشمک", particle: "ذره", particles: "ذرات", bubble: "حباب",
  bubbles: "حباب‌ها", glow: "درخشش", bokeh: "بوکه", aurora: "شفق", confetti: "کاغذرنگی", spark: "جرقه",
  smoke: "دود", fire: "آتش", rain: "باران", snow: "برف", star: "ستاره", stars: "ستاره‌ها", wave: "موج",
  grid: "شبکه", list: "فهرست", badge: "نشان", button: "دکمه", icon: "آیکن", logo: "نشان برند",
  brand: "برند", intro: "ورود", outro: "پایان", end: "پایان", credits: "عوامل", counter: "شمارنده",
  number: "شمارش", countdown: "شمارش معکوس", timer: "زمان‌سنج", calendar: "تقویم", date: "تاریخ",
  clock: "ساعت", map: "نقشه", pin: "سنجاق", phone: "موبایل", mockup: "ماکت", terminal: "ترمینال",
  code: "کد", console: "کنسول", screen: "صفحه", window: "پنجره", panel: "پنل", menu: "منو",
  nav: "ناوبری", tab: "تب", search: "جست‌وجو", input: "ورودی", form: "فرم", login: "ورود",
  play: "پخش", pause: "توقف", audio: "صدا", sound: "صدا", music: "موسیقی", whoosh: "ووش",
  pop: "پاپ", tick: "تیک", chime: "چایم", impact: "ایمپکت", riser: "رایزر", transition: "ترنزیشن",
  ambient: "امبینت", loop: "لوپ", keyboard: "کیبورد", notification: "نوتیفیکیشن", alert: "هشدار",
  success: "موفقیت", error: "خطا", switch: "سوئیچ", assemble: "سرهم‌بندی", skeleton: "اسکلت",
  fly: "پرواز", flyin: "پروازبه‌داخل", step: "گام", steps: "گام‌ها", marker: "ماژیک", underline: "زیرخط",
  highlight: "هایلایت", outline: "دورخط", fill: "پرشدن", gradient: "گرادیان", sweep: "موج",
  lead: "پیشرو", demote: "تنزل", label: "برچسب", pill: "قرصی", slot: "جای‌گردان", cycle: "چرخه",
  converge: "همگرایی", column: "ستون", columns: "ستون‌ها", roll: "غلتک", vertical: "عمودی",
  filmstrip: "نوار فیلم", relay: "ابلاغ", assembly: "بازشدن", drop: "سقوط", letter: "حرف",
  karaoke: "کارائوکه", pump: "پمپ", font: "قلم", weight: "وزن", block: "بلوک", entrance: "ورود",
  moves: "حرکت‌ها", cel: "سل", boil: "خط لرزان", paper: "کاغذی", cutout: "برشی", page: "صفحه",
  poster: "پوستر", hero: "قهرمان", banner: "بنر", header: "سرصفحه", footer: "پاصفحه", sidebar: "نوار کنار",
  profile: "پروفایل", user: "کاربر", chat: "گفت‌وگو", message: "پیام", mail: "نامه", like: "پسند",
  share: "هم‌رسانی", download: "دانلود", upload: "بارگذاری", sync: "هم‌گام", load: "بارگذاری",
  loading: "بارگذاری", refresh: "بازخوانی", swipe: "کشیدن", drag: "کشیدن", drop2: "رهاکردن",
  scale: "مقیاس", rotate: "چرخش", orbit: "مدار", drift: "رانش آرام", float: "شناوری", wind: "باد",
  liquid: "مایع", water: "آب", koi: "ماهی", ink: "مرکب", pen: "قلم", brush: "قلم‌مو", pencil: "مداد",
  marker2: "ماژیک", sketch: "اسکیس", draw: "نقاشی", paint: "رنگ", color: "رنگ", riser2: "اوج‌گیر",
  boom: "بوم", hit: "برخورد", soft: "نرم", deep: "عمیق", fast: "تند", slow: "کند", air: "هوا",
  ui: "رابط", ux: "تجربه", app: "اپ", web: "وب", site: "سایت", dashboard: "داشبورد", stats: "آمار",
  data: "داده", growth: "رشد", price: "قیمت", sale: "فروش", shop: "فروشگاه", cart: "سبد خرید",
  pay: "پرداخت", wallet: "کیف پول", coin: "سکه", credit: "اعتبار", bank: "بانک", health: "سلامت",
  heart: "قلب", fitness: "تناسب", weather: "آب‌وهوا", news: "خبر", feed: "خوراک", story: "داستان",
  game: "بازی", score: "امتیاز", level: "مرحله", win: "برد", lose: "باخت", start: "شروع",
  finish: "پایان", goal: "هدف", target: "هدف", arrow: "پیکان", pointer: "اشاره‌گر", hand: "دست",
  eye: "چشم", face: "چهره", smile: "لبخند", photo: "عکس", image: "تصویر", video: "ویدیو",
  media: "رسانه", camera2: "دوربین", lens: "عدسی", flash2: "فلاش", filter: "فیلتر", effect: "افکت",
  fx: "افکت", vfx: "جلوه", overlay: "روی‌تصویر", lower: "زیرین", third: "یک‌سوم", caption: "زیرنویس",
  subtitle: "زیرنویس", quote: "نقل", callout: "کال‌اوت", note: "یادداشت", tip: "نکته", hint: "راهنما",
  info: "اطلاع", warning: "هشدار", danger: "خطر", beta: "بتا", new: "تازه", live: "زنده",
  record: "ضبط", mic: "میکروفون", voice: "صدا", speech: "سخن", talk: "گفتار", podcast: "پادکست",
  interview: "گفت‌وگو", lesson: "درس", course: "دوره", tutorial: "آموزش", explainer: "توضیحی",
  demo: "نمونه", example: "مثال", sample: "نمونه", preview: "پیش‌نمایش", trailer: "تریلر",
};

Object.assign(FA_WORDS, { then: "سپس", and: "و", with: "با", to: "به", the: "", of: "", on: "روی", text: "متن", behind: "پشت", before: "پیش", after: "پسِ", from: "از", for: "برای", build: "ساخت", build2: "بساز" });

const POSITIONAL = { bottom: "پایین", top: "بالا", left: "چپ", right: "راست", in: "درون", out: "بیرون", up: "بالا", down: "پایین", behind: "پشت", front: "رو", single: "تکی", dual: "دوگانه", triple: "سه‌گانه", multi: "چندگانه", full: "تمام", half: "نیم", mini: "مینی", micro: "میکرو", mega: "مگا", big: "بزرگ", small: "کوچک" };

const TITLE_OVERRIDES = {
  "assemble-then-type-flyin": "سرهم‌بندی، سپس تایپِ پروازی",
  "ai-stream-response": "پاسخ زندهٔ هوش مصنوعی",
  "aurora-bloom-bg-flip": "شفق و شکوفا، جابه‌جایی پس‌زمینه",
  "basic-3d-scene": "صحنهٔ سه‌بعدی ساده",
  "beat-cut-moves": "کات روی ضرب",
  "canvas-materialize-moves": "ماده‌شدن روی بوم",
  "collab-cursor-moves": "نشانگرهای هم‌کاری",
  "depth-layer-moves": "حرکت لایه‌های عمق",
  "glow-flyline-moves": "خط پرندهٔ درخشان",
  "line-boil": "خط لرزان",
  "chart-live-moves": "نمودار زنده",
  "whoosh-soft": "ووش نرم",
  "ui-click-tick": "تیکِ کلیک رابط",
  "success-chime": "چایم موفقیت",
  "keyboard-typing": "تایپ کیبورد",
  "camera-shutter": "شاتر دوربین",
  "notification-pop": "پاپ نوتیفیکیشن",
  "riser-soft": "رایزر نرم",
  "impact-boom": "کوبش بم",
  "whoosh-deep": "ووش عمیق",
};

/** عنوان فارسیِ خوانا از نام لاتین — برای همهٔ entryها به‌صورت قطعی */
export function faTitle(name) {
  const ov = TITLE_OVERRIDES[String(name).toLowerCase()];
  if (ov) return ov;
  const tokens = String(name).replace(/\.(tsx?|md|mp3|json)$/i, "").split(/[-_.\s]+/).filter(Boolean);
  const core = [], pos = [];
  for (const tk of tokens) {
    const k = tk.toLowerCase();
    if (FA_WORDS[k]) core.push(FA_WORDS[k]);
    else if (POSITIONAL[k]) pos.push(POSITIONAL[k]);
    else if (/^\d+$/.test(k)) continue; // شماره‌ها را حذف کن
    else core.push(tk); // واژهٔ ناشناخته لاتین می‌ماند
  }
  if (!core.length && !pos.length) return String(name);
  const head = core.filter(Boolean).slice(0, 3).reverse().join(" ");
  return pos.length ? `${head} ${pos.slice(0, 1)[0]}` : head;
}

const PHRASES = {
  skeleton: [["صفحه خودش را می‌سازد", "اسکلت، سپس واژه‌ها"], ["از اسکلت تا نسخهٔ نهایی", "دو مرحله، دو زبان حرکت"], ["چیدمان از چهار سو می‌آید", "بعد محتوا سر جایش می‌نشیند"]],
  cardgrid: [["کارت‌ها سر جایشان می‌نشینند", "چیدمان نهایی، فاصله‌های واقعی"], ["هر کارت با کوبش خودش", "شبکه‌ای مرتب، ضرب‌به‌ضرب"], ["آواتارها و برچسب‌ها", "ورود دسته‌جمعی، نرم و دقیق"]],
  transition: [["صحنه عوض می‌شود", "گذر تمیز و تند"], ["از این‌جا به آن‌جا", "بدون یک فریم اضافه"], ["گذر روی ضرب", "پاک و حرفه‌ای"]],
  cameramove: [["یک دوربین، بدون کات", "حرکت پیوستهٔ محور"], ["عمق، پن، زوم", "لایه‌ها با سرعت‌های متفاوت"], ["دوربین نفس می‌کشد", "حرکت نرم و دستی"]],
  cursorui: [["رابط واقعی، کارگردانی‌شده", "کلیک، انتخاب، بازخورد"], ["نشانگر می‌رود و انتخاب می‌کند", "همان تعاملِ آشنای محصول"], ["هر کلیک یک بازخورد", "چیپ، تیک، توست"]],
  chart: [["داده زنده می‌شود", "رشد روی ضرب"], ["اعداد که می‌آیند", "نمودار خودش را می‌بندد"], ["از صفر تا نتیجه", "میله‌ها، خط، نقطهٔ نهایی"]],
  beatgrid: [["کات روی ضرب", "ریتم و پالس"], ["نور با بیت می‌کوبد", "شبکه‌ای زنده از مربع‌ها"], ["ضرب‌بستهٔ سلیولویدی", "فلاش، کوبش، سکون"]],
  brandopen: [["پرشین‌دودل", "موشن، کد، انضباط"], ["برند با یک کوبش باز می‌شود", "کادر، نشان، تگ‌لاین"], ["پایان‌بندی تمیز", "لوگو روی سکون کامل"]],
  particles: [["ذره‌ها و نور", "بافت زندهٔ پس‌زمینه"], ["حرکت آرام، عمق بلند", "بوکه، حباب، شفق"], ["هوای صحنه پر می‌شود", "ذرات با نفسِ آرام"]],
  lowerthird: [["میزبان: سارا محمدی", "برنامهٔ زندهٔ هفتگی"], ["این‌جا حرف اصلی می‌آید", "زیرنویس روی ضربِ گفتار"], ["نقل قول مهم", "برچسب کوچک، جای درست"]],
  steps: [["گام یک: شروع", "توضیح شفاف، جلوهٔ آرام"], ["سه گام تا نتیجه", "هر گام با یک فید"], ["همین‌طور ادامه می‌دهد", "ساختار، سپس جزئیات"]],
  styleloop: [["خط زنده، دوفریمی", "بافت دست‌ساز با کد"], ["سبکِ نقاشیِ زنده", "لرزش خط، نفس رنگ"], ["کاغذ و قلم", "هر فریم کمی متفاوت"]],
  audiopulse: [["افکت صوتی", "برای برش و گذر"], ["صدای رابط", "کلیک، تیک، موفقیت"], ["لحظهٔ صوتی", "روی ضربِ تصویر"]],
  native: [["رندر فارسی کامل شد", "موتور بومی تایپوگرافی"], ["موشن با کد، حرف‌به‌حرف", "اتصال هرگز نمی‌شکند"], ["انضباط ضربی فارسی", "کات روی بیت"], ["عنوان، لحن، سکون", "سه میزان هر صحنه"], ["فارسی، راست‌به‌چپ", "شکل‌دهی کامل هر فریم"]],
};

/** نگاشت نام/برچسب → بایان (نوع صحنه) */
export function planFor(entry) {
  const name = String(entry.name || entry.id || "").toLowerCase();
  const cat = String(entry.category || "");
  const kind = String(entry.kind || "");
  const tags = (entry.tags || []).join(" ").toLowerCase();
  const has = (...ws) => ws.some((w) => name.includes(w));
  // صداها: هیچ ویدیویی لازم نیست
  if (entry.source === "native" && kind !== "audio") return { archetype: "skip", frames: 0 };
  if (kind === "audio" || cat === "صدا و افکت") return { archetype: "audio", frames: 0 };
  // ۲۶ تایپوگرافیِ shotcraft → موتور بومی (رندر واقعی همان افکت)
  const NATIVE_MAP = {
    "typewriter-moves": "typewriter", "blur-slide": "blurslide", "brace-expand": "brace",
    "cel-flash-stomp": "stomp", "countdown-arc-scatter": "countdown", "document-typewriter-reveal": "docwrite",
    "flying-words": "flyingwords", "glitch-cycle": "glitch", "gradient-word-sweep": "sweep",
    "lead-word-zoom-assemble": "leadzoom", "marker-underline-title": "markerline",
    "outline-word-fill": "outlinefill", "paper-title-card": "papercard",
    "pill-chip-slot-cycle-handled": "chipcycle", "pill-slot-cycle": "pillslot", "scramble": "scramble",
    "split-flap-title": "splitflap", "text-column-converge": "converge", "title-demote-to-label": "demote",
    "type-assembly-moves": "assembly", "type-entrance-moves": "blurslide", "type-rhythm-sync": "karaoke",
    "typing-code-block": "codeblock", "vertical-word-roll-blur-cycle": "rollcycle",
    "word-relay-filmstrip": "filmstrip", "word-relay-geometry": "letterdrop",
  };
  for (const [k, eff] of Object.entries(NATIVE_MAP)) {
    if (name === k || name === k.replace(/-/g, "")) return { archetype: "native", effectKey: eff, frames: 150 };
  }
  if (cat === "تایپوگرافی") return { archetype: "native", effectKey: "assembly", frames: 150 };
  if (cat === "ترنزیشن" || has("wipe", "push", "transition", "slam", "iris")) return { archetype: "transition", frames: 105 };
  if (cat === "دوربین" || entry.source === "onetake" || has("camera", "pan", "zoom", "dolly", "orbit", "drift")) return { archetype: "cameramove", frames: entry.source === "onetake" ? 168 : 135 };
  if (cat === "تعامل" || has("cursor", "click", "select", "hover", "carousel", "slider", "toggle", "modal", "toast")) return { archetype: "cursorui", frames: 135 };
  if (cat === "داده و نمودار" || has("chart", "graph", "bar", "gauge", "progress", "stats", "counter")) return { archetype: "chart", frames: 135 };
  if (cat === "ریتم" || has("beat", "rhythm", "pulse", "strobe", "flash")) return { archetype: "beatgrid", frames: 120 };
  if (cat === "شروع و برند" || cat === "پایان" || has("brand", "logo", "intro", "outro", "end", "credits", "frame")) return { archetype: "brandopen", frames: 120 };
  if (has("assemble", "skeleton", "flyin", "build-up", "materialize")) return { archetype: "skeleton", frames: 150 };
  if (cat === "افکت" || has("particle", "bubble", "glow", "bokeh", "aurora", "confetti", "smoke", "spark", "wave", "echo", "bloom")) return { archetype: "particles", frames: 135 };
  if (entry.source === "mg" || has("cel", "boil", "sketch", "paint", "ink", "brush")) return { archetype: "styleloop", frames: 120 };
  if (entry.source === "explainer" || cat === "آموزش و توضیح" || has("step", "lesson", "explain")) return { archetype: "steps", frames: 150 };
  if (entry.source === "talkcraft" || cat === "گفتار و موشن" || has("caption", "lower", "third", "quote", "callout", "name")) return { archetype: "lowerthird", frames: 135 };
  // بقیهٔ «ورود عناصر» و هر چیز نامشخص → اسکلت/کارت
  return { archetype: has("avatar", "profile", "user", "chip", "badge", "list", "menu") ? "cardgrid" : "skeleton", frames: 135 };
}

/** اسپک کامل صحنه برای یک entry کاتالوگ — قطعی از روی id */
export function specFor(entry) {
  const plan = planFor(entry);
  const seed = hashStr(entry.id || entry.name || "x");
  const pal = SHOT_PALETTES[seed % SHOT_PALETTES.length];
  const r = rng(seed);
  const title = entry.titleFa && entry.titleFa !== entry.name ? entry.titleFa : faTitle(entry.name || entry.id || "");
  const lines = PHRASES[plan.archetype] || PHRASES.skeleton;
  const pick = lines[(seed >>> 3) % lines.length];
  const spec = {
    id: entry.id,
    archetype: plan.archetype,
    effectKey: plan.effectKey || null,
    seed,
    frames: plan.frames || 135,
    fps: 30,
    titleFa: title,
    line1: pick[0],
    line2: pick[1],
    accent: pal.accent,
    ink: pal.ink,
    bg: pal.bg,
    panel: pal.panel,
    muted: pal.muted,
    duration: entry.duration || null,
    energy: entry.energy || null,
  };
  if (plan.archetype === "native") {
    spec.text = pick[0];
  }
  return spec;
}

/** اسپک همهٔ entryهای کاتالوگ (ویدیویی‌ها + صداها) */
export function buildSpecs(catalog) {
  return (catalog.entries || []).map(specFor);
}

// ---------------------------------------------------------------- shared chrome
const FA_R = (o) => { ctx2dir(o.ctx); };
const ctx2dir = () => {};
const setFa = (ctx) => { ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; };
const setEn = (ctx) => { ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; };

/** پس‌زمینه + قاب اسپک + عنوان گوشه + مُهر پایین — قالب مشترک همهٔ رندرهای محلی */
function chrome(ctx, o, { showTitle = true } = {}) {
  const { w, h, spec } = o;
  ctx.fillStyle = spec.bg; ctx.fillRect(0, 0, w, h);
  // ویِنت ملایم حاشیه‌ها
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.75);
  vg.addColorStop(0, "rgba(255,255,255,0.03)"); vg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `${spec.accent}33`; ctx.lineWidth = 2;
  ctx.strokeRect(24, 20, w - 48, h - 40);
  if (showTitle && spec.titleFa) {
    setFa(ctx); ctx.font = `600 24px "Vazirmatn"`;
    ctx.fillStyle = spec.ink; ctx.globalAlpha = 0.9;
    ctx.fillText(spec.titleFa, w - 44, 62);
    ctx.globalAlpha = 0.5; setEn(ctx); ctx.font = `400 15px "Vazirmatn"`;
    ctx.fillText(spec.id?.split("/")[1] || "", 44, 64);
    ctx.globalAlpha = 1;
  }
  setEn(ctx); ctx.font = `400 14px "Vazirmatn"`;
  ctx.fillStyle = spec.muted; ctx.globalAlpha = 0.75;
  ctx.fillText("PersianArts · رندر محلی", 44, h - 34);
  ctx.globalAlpha = 1;
}

/** خطِ بزرگ مرکز + خط کوچک زیر آن — پایان مشترک خیلی از بایان‌ها */
function closingLines(ctx, o, y = 0) {
  const { w, h, spec } = o;
  const p = easeOut(clamp01((o.t - 0.06) / 0.3));
  const q = easeOut(clamp01((o.t - 0.2) / 0.3));
  setFa(ctx);
  ctx.font = `700 ${Math.round(h * 0.105)}px "Vazirmatn"`;
  ctx.textAlign = "center";
  ctx.fillStyle = spec.ink; ctx.globalAlpha = p;
  ctx.fillText(spec.line1, w / 2, h / 2 + y + (1 - p) * 24);
  ctx.globalAlpha = 1;
  if (spec.line2) {
    ctx.font = `500 ${Math.round(h * 0.05)}px "Vazirmatn"`;
    ctx.fillStyle = spec.accent; ctx.globalAlpha = q * 0.95;
    ctx.fillText(spec.line2, w / 2, h / 2 + y + h * 0.115 + (1 - q) * 16);
    ctx.globalAlpha = 1;
  }
}

const rrPath = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// ---------------------------------------------------------------- the scene painters
export const SHOT_SCENES = {
  // اسکلت UI از چهار سو می‌آید، بعد متن‌ها
  skeleton(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o);
    const stageW = w * 0.62, x0 = w / 2 - stageW / 2, y0 = h * 0.2;
    const pieces = [];
    pieces.push({ x: x0, y: y0, w: stageW, h: h * 0.16, kind: "card" });
    for (let i = 0; i < 3; i++) pieces.push({ x: x0 + stageW * (0.06 + i * 0.31), y: y0 + h * 0.2, w: stageW * 0.27, h: h * 0.22, kind: "card" });
    for (let i = 0; i < 3; i++) pieces.push({ x: x0 + stageW * 0.06, y: y0 + h * 0.47 + i * h * 0.1, w: stageW * (0.62 - i * 0.16), h: h * 0.045, kind: "bar" });
    pieces.push({ x: x0 + stageW * 0.06, y: y0 + h * 0.78, w: stageW * 0.34, h: h * 0.1, kind: "btn" });
    pieces.forEach((pc, i) => {
      const at = 0.04 + i * 0.045;
      const p = easeBack(clamp01((o.t - at) / 0.24));
      if (p <= 0) return;
      const dx = (r() - 0.5) * w * 0.9 * (1 - p), dy = (r() - 0.5) * h * 0.9 * (1 - p), rot = (r() - 0.5) * 0.6 * (1 - p);
      ctx.save();
      ctx.translate(pc.x + pc.w / 2 + dx, pc.y + pc.h / 2 + dy);
      ctx.rotate(rot); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.translate(-pc.w / 2, -pc.h / 2);
      ctx.globalAlpha = Math.min(1, p * 1.4);
      if (pc.kind === "card") { ctx.fillStyle = spec.panel; rrPath(ctx, 0, 0, pc.w, pc.h, 12); ctx.fill(); ctx.strokeStyle = `${spec.accent}44`; ctx.stroke(); }
      else if (pc.kind === "bar") { ctx.fillStyle = spec.panel; rrPath(ctx, 0, 0, pc.w, pc.h, pc.h / 2); ctx.fill(); ctx.fillStyle = `${spec.ink}22`; rrPath(ctx, 0, 0, pc.w * 0.7, pc.h, pc.h / 2); ctx.fill(); }
      else { ctx.fillStyle = spec.accent; rrPath(ctx, 0, 0, pc.w, pc.h, pc.h / 2); ctx.fill(); }
      ctx.restore();
    });
    // واژه‌ها بعد از اسکلت می‌آیند — 3D-مانند با چرخش
    const wp = easeBack(clamp01((o.t - 0.42) / 0.26));
    if (wp > 0) {
      ctx.save();
      ctx.translate(w / 2, y0 + h * 0.1);
      ctx.rotate((1 - wp) * 0.5); ctx.scale(0.5 + 0.5 * wp, 0.5 + 0.5 * wp);
      ctx.globalAlpha = clamp01(wp * 1.3);
      setFa(ctx); ctx.font = `800 ${Math.round(h * 0.075)}px "Vazirmatn"`; ctx.textAlign = "center";
      ctx.fillStyle = spec.ink; ctx.fillText(spec.line1, 0, 0);
      ctx.restore();
      const sp = easeOut(clamp01((o.t - 0.55) / 0.2));
      if (sp > 0) { setFa(ctx); ctx.font = `500 ${Math.round(h * 0.042)}px "Vazirmatn"`; ctx.textAlign = "center"; ctx.fillStyle = spec.accent; ctx.globalAlpha = sp; ctx.fillText(spec.line2, w / 2, y0 + h * 0.16); ctx.globalAlpha = 1; }
    }
  },

  // شبکهٔ کارت/آواتار/چیپ
  cardgrid(ctx, o) {
    const { w, h, spec } = o;
    chrome(ctx, o);
    const cols = 3, rows = 2, gw = w * 0.72, x0 = w / 2 - gw / 2, y0 = h * 0.24;
    const cw = gw / cols - w * 0.02, chh = h * 0.24;
    for (let i = 0; i < cols * rows; i++) {
      const cx = x0 + (i % cols) * (cw + w * 0.02), cy = y0 + Math.floor(i / cols) * (chh + h * 0.05);
      const p = easeBack(clamp01((o.t - (0.05 + i * 0.05)) / 0.22));
      if (p <= 0) continue;
      ctx.save(); ctx.translate(cx + cw / 2, cy + chh / 2); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p); ctx.translate(-cw / 2, -chh / 2);
      ctx.globalAlpha = Math.min(1, p * 1.5);
      ctx.fillStyle = spec.panel; rrPath(ctx, 0, 0, cw, chh, 14); ctx.fill();
      ctx.strokeStyle = i % 4 === 2 ? `${spec.accent}66` : `${spec.accent}22`; ctx.stroke();
      ctx.fillStyle = `${spec.accent}33`; ctx.beginPath(); ctx.arc(cw - 24, 24, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `${spec.ink}2e`; rrPath(ctx, 14, chh * 0.55, cw * 0.55, 8, 4); ctx.fill();
      rrPath(ctx, 14, chh * 0.55 + 14, cw * 0.4, 8, 4); ctx.fill();
      ctx.fillStyle = `${spec.ink}55`; ctx.beginPath(); ctx.arc(24, 24, 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (o.t > 0.6) {
      ctx.save(); ctx.globalAlpha = easeOut(clamp01((o.t - 0.6) / 0.2));
      setFa(ctx); ctx.font = `600 ${Math.round(h * 0.05)}px "Vazirmatn"`; ctx.textAlign = "center";
      ctx.fillStyle = spec.ink; ctx.fillText(spec.line2 || spec.line1, w / 2, y0 + rows * (chh + h * 0.05) + 8);
      ctx.restore();
    }
  },

  // ترنزیشن: پنل جدید با وایپ/رانش جای قبلی را می‌گیرد
  transition(ctx, o) {
    const { w, h, spec } = o;
    chrome(ctx, o, { showTitle: false });
    const p = easeInOut(clamp01((o.t - 0.12) / 0.42));
    // صحنهٔ قبلی (پنل تیره با خطوط)
    ctx.fillStyle = spec.panel; ctx.fillRect(40, 40, w - 80, h - 80);
    ctx.fillStyle = `${spec.ink}14`;
    for (let i = 0; i < 5; i++) ctx.fillRect(80, 90 + i * (h - 160) / 5, (w - 160) * (0.5 + 0.1 * i), 12);
    // صحنهٔ جدید — از راست رانده می‌شود
    ctx.save();
    ctx.beginPath(); ctx.rect(40, 40, w - 80, h - 80); ctx.clip();
    ctx.translate((1 - p) * (w - 80), 0);
    ctx.fillStyle = spec.accent; ctx.globalAlpha = 0.12; ctx.fillRect(40, 40, w - 80, h - 80); ctx.globalAlpha = 1;
    ctx.fillStyle = `${spec.bg}f0`; ctx.fillRect(40, 40, w - 80, h - 80);
    ctx.fillStyle = spec.accent; ctx.fillRect(40, 40, 10, h - 80);
    setFa(ctx); ctx.font = `700 ${Math.round(h * 0.09)}px "Vazirmatn"`; ctx.textAlign = "center";
    ctx.fillStyle = spec.ink; ctx.fillText(spec.line1, w / 2 + (1 - p) * 40, h / 2 + 8);
    ctx.font = `500 ${Math.round(h * 0.045)}px "Vazirmatn"`;
    ctx.fillStyle = spec.accent; ctx.fillText(spec.line2 || "", w / 2 + (1 - p) * 40, h / 2 + h * 0.1);
    ctx.restore();
    // لبهٔ برش
    if (p > 0 && p < 1) { ctx.fillStyle = spec.accent; ctx.fillRect(40 + (w - 80) * p - 3, 40, 6, h - 80); }
  },

  // حرکت دوربین روی صحنهٔ چندلایه
  cameramove(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    const t = o.t;
    const zoom = 1 + 0.22 * easeInOut(clamp01(t / 0.9));
    const panX = Math.sin(t * Math.PI) * w * 0.07;
    const panY = -Math.cos(t * Math.PI * 0.5) * h * 0.04;
    ctx.save();
    ctx.translate(w / 2 + panX, h / 2 + panY); ctx.scale(zoom, zoom); ctx.translate(-w / 2, -h / 2);
    // لایهٔ دور: تپه‌ها/موج‌ها
    for (let L = 0; L < 3; L++) {
      const par = 0.25 + L * 0.35, speed = (t - 0.5) * w * 0.1 * par;
      ctx.fillStyle = L === 2 ? spec.panel : `${spec.panel}cc`;
      ctx.beginPath(); ctx.moveTo(-w, h);
      for (let x = -w; x <= 2 * w; x += 40) {
        const y = h * (0.52 + L * 0.11) + Math.sin(x / (180 + L * 70) + L * 2 + r() * 0.01) * h * (0.06 - L * 0.012);
        ctx.lineTo(x - speed, y);
      }
      ctx.lineTo(2 * w, h); ctx.closePath(); ctx.fill();
      // ستاره/ذره در لایهٔ دور
      if (L === 0) { ctx.fillStyle = `${spec.ink}66`; for (let s = 0; s < 26; s++) { const sx = r() * w, sy = r() * h * 0.4; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(s * 3 + t * 6)); ctx.fillRect(sx, sy, 2.5, 2.5); } ctx.globalAlpha = 1; }
    }
    // لایهٔ جلو: قاب و نشانگر
    ctx.strokeStyle = `${spec.accent}55`; ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.3, h * 0.3, w * 0.4, h * 0.28);
    ctx.fillStyle = spec.accent;
    ctx.beginPath(); ctx.arc(w * 0.3 + w * 0.4 * easeInOut(t), h * 0.3 + h * 0.28 * 0.5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    setFa(ctx); ctx.font = `600 ${Math.round(h * 0.045)}px "Vazirmatn"`; ctx.textAlign = "center";
    ctx.fillStyle = spec.ink; ctx.globalAlpha = 0.92; ctx.fillText(spec.line1, w / 2, h * 0.16); ctx.globalAlpha = 1;
    // کراس‌هیر دوربین
    ctx.strokeStyle = `${spec.accent}88`; ctx.lineWidth = 1.5;
    const cx = w / 2 + Math.sin(t * Math.PI * 1.2) * w * 0.04, cy = h / 2 + Math.cos(t * Math.PI) * h * 0.03;
    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 26, cy);
    ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 26); ctx.stroke();
  },

  // رابط واقعی + نشانگر
  cursorui(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o);
    // پنجرهٔ محصول
    const wx = w * 0.2, wy = h * 0.2, ww = w * 0.6, wh = h * 0.55;
    ctx.fillStyle = spec.panel; rrPath(ctx, wx, wy, ww, wh, 12); ctx.fill();
    ctx.strokeStyle = `${spec.accent}44`; ctx.stroke();
    ctx.fillStyle = `${spec.bg}cc`; ctx.fillRect(wx, wy, ww, 26);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#ff5f57", "#febc2e", "#28c840"][i]; ctx.beginPath(); ctx.arc(wx + 16 + i * 16, wy + 13, 4.5, 0, Math.PI * 2); ctx.fill(); }
    // چیپ‌های قابل انتخاب
    const chips = ["طراحی", "رندر", "انتشار", "آرشیو"];
    const chipY = wy + 56, chipH = 34;
    const chipXs = []; let acc = wx + 20;
    setFa(ctx); ctx.font = `600 17px "Vazirmatn"`;
    for (const c of chips) { const cw2 = ctx.measureText(c).width + 34; chipXs.push({ c, x: acc, w: cw2 }); acc += cw2 + 10; }
    const pickIdx = Math.min(chips.length - 1, Math.floor(o.t / 0.34));
    chipXs.forEach((c, i) => {
      const on = i === pickIdx && o.t > 0.18;
      ctx.fillStyle = on ? spec.accent : `${spec.accent}18`;
      rrPath(ctx, c.x, chipY, c.w, chipH, chipH / 2); ctx.fill();
      ctx.fillStyle = on ? spec.bg : spec.ink;
      ctx.fillText(c.c, c.x + c.w - 17, chipY + chipH * 0.68);
    });
    // ردیف‌های محتوا
    for (let i = 0; i < 3; i++) {
      const p = easeOut(clamp01((o.t - (0.1 + i * 0.08)) / 0.2));
      if (p <= 0) continue;
      ctx.globalAlpha = p; ctx.fillStyle = `${spec.ink}1f`;
      rrPath(ctx, wx + 20, chipY + chipH + 22 + i * 34, (ww - 40) * (0.85 - i * 0.18), 12, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // نشانگر: از بیرون می‌آید، روی چیپ می‌ایستد، کلیک می‌کند
    const target = chipXs[Math.max(0, pickIdx)];
    const tx = target.x + target.w * 0.35, ty = chipY + chipH * 0.45;
    const move = easeInOut(clamp01(o.t / 0.2));
    const cx = w * 0.86 + (tx - w * 0.86) * move, cy = h * 0.14 + (ty - h * 0.14) * move;
    const clickT = 0.2 + pickIdx * 0.34 + 0.08;
    const clicked = o.t > clickT;
    const ripple = clicked ? clamp01((o.t - clickT) / 0.22) : 0;
    if (ripple > 0 && ripple < 1) {
      ctx.strokeStyle = spec.accent; ctx.globalAlpha = 1 - ripple; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tx, ty, 12 + ripple * 30, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(cx, cy + (clicked && o.t - clickT < 0.06 ? 2 : 0));
    ctx.fillStyle = spec.ink; ctx.strokeStyle = spec.bg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 20); ctx.lineTo(5.5, 15.5); ctx.lineTo(9.5, 23); ctx.lineTo(13, 21.3); ctx.lineTo(9, 13.8); ctx.lineTo(15, 12.5); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  },

  // نمودار زنده
  chart(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o);
    const x0 = w * 0.16, y0 = h * 0.74, gw = w * 0.66, gh = h * 0.42;
    ctx.strokeStyle = `${spec.muted}66`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + gw, y0); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 - gh); ctx.stroke();
    // میله‌ها با ضرب
    const n = 6, bw = gw / n * 0.55;
    for (let i = 0; i < n; i++) {
      const v = 0.35 + r() * 0.6;
      const p = easeOut(clamp01((o.t - (0.1 + i * 0.06)) / 0.3));
      if (p <= 0) continue;
      const bh = gh * v * p;
      const bx = x0 + (i + 0.5) * (gw / n) - bw / 2;
      ctx.fillStyle = i === n - 1 ? spec.accent : `${spec.accent}55`;
      rrPath(ctx, bx, y0 - bh, bw, bh, 6); ctx.fill();
    }
    // خط رشد + نقطهٔ انتها
    const lp = easeOut(clamp01((o.t - 0.2) / 0.55));
    if (lp > 0) {
      ctx.strokeStyle = spec.ink; ctx.lineWidth = 3; ctx.beginPath();
      const pts = Array.from({ length: 7 }, (_, i) => [x0 + (i / 6) * gw, y0 - gh * (0.15 + (i / 6) * (0.45 + r() * 0.12))]);
      const seg = Math.max(1, Math.ceil(lp * 6));
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= seg; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      if (lp > 0.15) { const last = pts[seg]; ctx.fillStyle = spec.accent; ctx.beginPath(); ctx.arc(last[0], last[1], 6, 0, Math.PI * 2); ctx.fill(); }
    }
    // شمارندهٔ بزرگ
    const cp = easeOut(clamp01((o.t - 0.15) / 0.6));
    setFa(ctx); ctx.font = `800 ${Math.round(h * 0.11)}px "Vazirmatn"`; ctx.textAlign = "left";
    ctx.fillStyle = spec.ink; ctx.fillText(toFa(Math.round(cp * 84)) + "٪", x0, h * 0.26);
    ctx.font = `500 ${Math.round(h * 0.04)}px "Vazirmatn"`; ctx.fillStyle = spec.muted;
    ctx.fillText(spec.line1, x0, h * 0.33);
  },

  // ضرب و پالس
  beatgrid(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    const BPM = 96, beatT = (o.t * (spec.frames / 30) * BPM) / 60;
    const cols = 8, rows = 4, gx = w * 0.14, gy = h * 0.2, gw = w * 0.72, gh = h * 0.5;
    const cw = gw / cols, chh = gh / rows;
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols, rw = Math.floor(i / cols);
      const onBeat = (c + rw * 2) % 2 === 0;
      const ph = (beatT - (c * 0.25 + rw * 0.5)) % 4;
      const pulse = onBeat ? Math.exp(-Math.max(0, ph) * 2.4) : Math.exp(-Math.max(0, ph) * 2.4) * 0.35;
      const x = gx + c * cw + cw * 0.14, y = gy + rw * chh + chh * 0.14, s = Math.min(cw, chh) * 0.72 * (0.8 + 0.2 * pulse);
      ctx.fillStyle = onBeat ? spec.accent : `${spec.ink}2e`;
      ctx.globalAlpha = 0.25 + 0.75 * pulse;
      rrPath(ctx, x + (cw - s) / 2, y + (chh - s) / 2, s, s, s * 0.22); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // نوار ضرب
    const barW = w * 0.72, bx = w * 0.14;
    for (let b = 0; b < 8; b++) {
      const bp = Math.max(0, 1 - (beatT - b));
      ctx.fillStyle = b % 4 === 0 ? spec.accent : `${spec.ink}44`;
      ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.min(1, 1 - (beatT - b)));
      ctx.beginPath(); ctx.arc(bx + (b + 0.5) * (barW / 8), h * 0.84, 4 + 4 * bp, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    setFa(ctx); ctx.font = `700 ${Math.round(h * 0.07)}px "Vazirmatn"`; ctx.textAlign = "center";
    ctx.fillStyle = spec.ink; ctx.globalAlpha = 0.9; ctx.fillText(spec.line1, w / 2, h * 0.155); ctx.globalAlpha = 1;
  },

  // برند: کوبش، کادر، نشان
  brandopen(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    const slam = easeOut(clamp01((o.t - 0.06) / 0.14));
    const settle = 1 + Math.max(0, 0.18 * (1 - slam));
    // کادر برند
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(settle, settle);
    ctx.strokeStyle = spec.accent; ctx.lineWidth = 3;
    const fw = w * 0.5, fh = h * 0.3;
    ctx.globalAlpha = slam;
    rrPath(ctx, -fw / 2, -fh / 2, fw, fh, 10); ctx.stroke();
    ctx.fillStyle = spec.ink; setFa(ctx); ctx.textAlign = "center";
    ctx.font = `800 ${Math.round(h * 0.1)}px "Vazirmatn"`;
    ctx.fillText(spec.line1, 0, fh * 0.1);
    ctx.font = `500 ${Math.round(h * 0.042)}px "Vazirmatn"`;
    ctx.fillStyle = spec.accent;
    const tagP = easeOut(clamp01((o.t - 0.3) / 0.2));
    ctx.globalAlpha = tagP; ctx.fillText(spec.line2 || "هنرهای پارسی", 0, fh * 0.42); ctx.globalAlpha = 1;
    ctx.restore();
    // چهار گوشهٔ کادر که با کوبش می‌چسبند
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    corners.forEach(([sx, sy], i) => {
      const p = easeBack(clamp01((o.t - (0.02 + i * 0.03)) / 0.2));
      if (p <= 0) return;
      const cx = w / 2 + sx * (w * 0.25 + 16), cy = h / 2 + sy * (h * 0.15 + 16);
      ctx.strokeStyle = spec.accent; ctx.lineWidth = 3.5; ctx.globalAlpha = p;
      ctx.beginPath();
      ctx.moveTo(cx - sx * 22, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy - sy * 22);
      ctx.stroke(); ctx.globalAlpha = 1;
    });
    // درخشش کوبش
    const flash = 1 - clamp01((o.t - 0.16) / 0.12);
    if (flash > 0.02) { ctx.fillStyle = spec.ink; ctx.globalAlpha = flash * 0.14; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  },

  // ذرات و نور
  particles(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    const n = 46;
    for (let i = 0; i < n; i++) {
      const bx = r() * w, by = r() * h, sp = 0.2 + r() * 0.8, size = 2 + r() * 9;
      const x = (bx + o.t * w * 0.08 * sp) % w;
      const y = (by - o.t * h * 0.16 * sp + h) % h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(i * 2.7 + o.t * Math.PI * 2 * sp));
      const g = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      g.addColorStop(0, `${spec.accent}${Math.round(tw * 180).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${spec.accent}00`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `${spec.ink}${Math.round(tw * 200).toString(16).padStart(2, "0")}`;
      ctx.beginPath(); ctx.arc(x, y, size * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    // موج نورانی مرکز
    const wp = easeInOut(clamp01((o.t - 0.2) / 0.5));
    ctx.save(); ctx.globalAlpha = wp;
    setFa(ctx); ctx.font = `700 ${Math.round(h * 0.085)}px "Vazirmatn"`; ctx.textAlign = "center";
    ctx.fillStyle = spec.ink; ctx.fillText(spec.line1, w / 2, h * 0.48);
    ctx.font = `500 ${Math.round(h * 0.042)}px "Vazirmatn"`; ctx.fillStyle = spec.accent;
    ctx.fillText(spec.line2 || "", w / 2, h * 0.58);
    ctx.restore();
  },

  // زیرنویس/لورثرد گفتار
  lowerthird(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    // پس‌زمینهٔ گفت‌وگو (بلور نرم با شکل گوینده)
    ctx.fillStyle = spec.panel; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(w * 0.78, h * 0.34, w * 0.09, h * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.ellipse(w * 0.78, h * 0.62, w * 0.16, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // نوار لورثرد از راست بیرون می‌آید
    const inP = easeBack(clamp01((o.t - 0.08) / 0.26));
    const outP = easeIn(clamp01((o.t - 0.86) / 0.12));
    const slide = (1 - inP) * w * 0.5 - outP * w * 0.5;
    const barY = h * 0.6, barH = h * 0.17;
    ctx.save(); ctx.translate(-slide, 0);
    ctx.fillStyle = spec.panel; ctx.globalAlpha = 0.96;
    rrPath(ctx, w * 0.08, barY, w * 0.62, barH, 12); ctx.fill();
    ctx.fillStyle = spec.accent;
    rrPath(ctx, w * 0.08 + w * 0.62 - 8, barY, 8, barH, 4); ctx.fill();
    ctx.globalAlpha = 1;
    setFa(ctx);
    ctx.fillStyle = spec.ink; ctx.font = `700 ${Math.round(h * 0.058)}px "Vazirmatn"`;
    ctx.fillText(spec.line1, w * 0.66, barY + barH * 0.42);
    ctx.fillStyle = spec.muted; ctx.font = `500 ${Math.round(h * 0.038)}px "Vazirmatn"`;
    ctx.fillText(spec.line2 || "", w * 0.66, barY + barH * 0.82);
    ctx.restore();
    // موج صدا کوچک کنار نوار
    const sIn = easeOut(clamp01((o.t - 0.2) / 0.2));
    for (let i = 0; i < 9; i++) {
      const amp = Math.abs(Math.sin(i * 1.7 + o.t * Math.PI * 4)) * h * 0.045 * sIn;
      ctx.fillStyle = `${spec.accent}99`;
      rrPath(ctx, w * 0.9 + i * 6 - 24, h * 0.66 - amp / 2, 3.4, Math.max(4, amp), 2); ctx.fill();
    }
  },

  // گام‌های آموزشی
  steps(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o);
    const items = ["اسکلت مسئله", "ساخت گام‌به‌گام", "بازبینی و رندر"];
    const x0 = w * 0.62;
    items.forEach((it, i) => {
      const p = easeOut(clamp01((o.t - (0.08 + i * 0.16)) / 0.2));
      if (p <= 0) return;
      const y = h * (0.26 + i * 0.17);
      ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * 30, 0);
      ctx.fillStyle = i === 2 ? spec.accent : spec.panel;
      ctx.beginPath(); ctx.arc(x0, y, h * 0.045, 0, Math.PI * 2); ctx.fill();
      setFa(ctx); ctx.textAlign = "center"; ctx.fillStyle = i === 2 ? spec.bg : spec.ink;
      ctx.font = `800 ${Math.round(h * 0.045)}px "Vazirmatn"`;
      ctx.fillText(toFa(i + 1), x0, y + h * 0.016);
      ctx.textAlign = "right"; ctx.fillStyle = spec.ink;
      ctx.font = `700 ${Math.round(h * 0.05)}px "Vazirmatn"`;
      ctx.fillText(it, w * 0.55, y + h * 0.017);
      ctx.fillStyle = `${spec.muted}aa`; ctx.font = `500 ${Math.round(h * 0.034)}px "Vazirmatn"`;
      ctx.fillText(i === 0 ? spec.line2 || "" : ["تعریف دقیق و دامنه", "اجرا با انضباط ضربی", "خروجی نهایی تمیز"][i], w * 0.55, y + h * 0.062);
      ctx.restore();
      // خط اتصال
      if (i < 2 && o.t > 0.16 + i * 0.16) {
        ctx.strokeStyle = `${spec.accent}66`; ctx.lineWidth = 2;
        const lp = clamp01((o.t - (0.16 + i * 0.16)) / 0.14);
        ctx.beginPath(); ctx.moveTo(x0, y + h * 0.05); ctx.lineTo(x0, y + h * 0.05 + h * 0.12 * lp); ctx.stroke();
      }
    });
    // پنل پیش‌نمایش
    const pp = easeOut(clamp01((o.t - 0.3) / 0.25));
    if (pp > 0) {
      ctx.save(); ctx.globalAlpha = pp;
      ctx.fillStyle = spec.panel; rrPath(ctx, w * 0.1, h * 0.28, w * 0.32, h * 0.4, 12); ctx.fill();
      ctx.strokeStyle = `${spec.accent}44`; ctx.stroke();
      ctx.fillStyle = `${spec.accent}2e`;
      for (let i = 0; i < 4; i++) { const b = easeOut(clamp01((o.t - (0.4 + i * 0.06)) / 0.2)); rrPath(ctx, w * 0.13 + i * w * 0.066, h * 0.58 - h * 0.22 * b, w * 0.045, h * 0.22 * b, 5); ctx.fill(); }
      ctx.restore();
    }
  },

  // سبک: خط لرزان دوفریمی
  styleloop(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o, { showTitle: false });
    // کاغذ گرم
    ctx.fillStyle = "#f3eee2"; ctx.fillRect(0, 0, w, h);
    const boil = Math.floor(o.t * 30 / 2) % 2; // دوفریمی
    const j = (i) => (rng(spec.seed + i * 97 + boil)() - 0.5) * 3;
    // خطوط لرزان دور یک مرکز
    ctx.strokeStyle = "#2c2a24"; ctx.lineWidth = 3; ctx.lineCap = "round";
    const cx = w / 2, cy = h / 2 + h * 0.02;
    for (let ring = 0; ring < 5; ring++) {
      ctx.beginPath();
      for (let a = 0; a <= 32; a++) {
        const th = (a / 32) * Math.PI * 2;
        const rad = (28 + ring * 26) + (rng(spec.seed + ring * 31 + ((a / 4) | 0) * 13 + boil)() - 0.5) * 4;
        const x = cx + Math.cos(th) * rad * 1.6, y = cy + Math.sin(th) * rad;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    // هاشورهای دستی
    for (let i = 0; i < 14; i++) {
      const x = w * 0.12 + i * 14, y = h * 0.16;
      ctx.beginPath(); ctx.moveTo(x + j(i), y); ctx.lineTo(x - 22 + j(i + 40), y + h * 0.09); ctx.stroke();
    }
    setFa(ctx); ctx.textAlign = "center";
    ctx.fillStyle = "#2c2a24"; ctx.font = `800 ${Math.round(h * 0.085)}px "Vazirmatn"`;
    ctx.fillText(spec.line1, cx, cy + h * 0.24);
    ctx.font = `600 ${Math.round(h * 0.042)}px "Vazirmatn"`; ctx.fillStyle = "#a4552f";
    ctx.fillText(spec.line2 || "", cx, cy + h * 0.31);
    // مُهر لبه
    ctx.fillStyle = "#a4552f"; ctx.font = `700 16px "Vazirmatn"`;
    ctx.textAlign = "left"; ctx.fillText("دوفریمی · با کد", 44, h - 62);
  },

  // پوستر صدا (بدون ویدیو — فقط قاب پوستر/کارت)
  audiopulse(ctx, o) {
    const { w, h, spec } = o, r = rng(spec.seed);
    chrome(ctx, o);
    const n = 34, cy = h / 2;
    for (let i = 0; i < n; i++) {
      const x = w * 0.16 + i * (w * 0.68 / n);
      const amp = (0.2 + 0.8 * Math.abs(Math.sin(i * 1.3 + o.t * Math.PI * 2))) * h * 0.2 * easeOut(clamp01(o.t / 0.4));
      ctx.fillStyle = i % 5 === 2 ? spec.accent : `${spec.ink}66`;
      rrPath(ctx, x, cy - amp, 6, amp * 2, 3); ctx.fill();
    }
    setFa(ctx); ctx.textAlign = "center";
    ctx.fillStyle = spec.ink; ctx.font = `700 ${Math.round(h * 0.07)}px "Vazirmatn"`;
    ctx.fillText(spec.line1, w / 2, h * 0.28);
    ctx.fillStyle = spec.muted; ctx.font = `500 ${Math.round(h * 0.04)}px "Vazirmatn"`;
    ctx.fillText(spec.line2 || "", w / 2, h * 0.36);
  },

  // تایپوگرافی بومی — همان موتور کتابخانه
  native(ctx, o) {
    const { w, h, spec } = o;
    chrome(ctx, o);
    void drawEffectShim;
    drawEffectShim(ctx, { key: spec.effectKey, t: o.t, w, h, size: Math.round(h * 0.24), family: "Vazirmatn", text: spec.text || spec.line1, colors: { bg: spec.bg, ink: spec.ink, accent: spec.accent, muted: spec.muted }, paintBg: false });
  },
};

// effects.js در فیلِم باندل می‌شود؛ اینجا فقط امضای استفاده را نگه می‌داریم
import { drawEffect as drawEffectShim } from "./effects.js";

const easeIn = (t) => Math.pow(clamp01(t), 2.2);

/** عنوان + توضیح فارسی برای کارت‌های کاتالوگ (جایگزین توضیحات چینی) */
export function faBlurb(entry) {
  const spec = specFor(entry);
  const dur = String(entry.duration || "").replace(/约|（|）|含|≥/g, "").replace(/f@30fps/g, " فریم").trim();
  const catMap = { "تعامل": "تعامل رابط", "ترنزیشن": "گذر میان صحنه", "دوربین": "حرکت دوربین", "تایپوگرافی": "تایپوگرافی موشن", "داده و نمودار": "نمایش داده", "ریتم": "ضرب و ریتم", "شروع و برند": "برند و ورود", "پایان": "پایان‌بندی", "افکت": "افکت بصری", "ورود عناصر": "ورود عناصر", "صدا و افکت": "افکت صوتی", "گفتار و موشن": "موشن گفتار", "آموزش و توضیح": "صحنهٔ آموزشی", "حرکت پیوسته": "حرکت پیوسته", "سبک طراحی": "سبک طراحی", "موسیقی و صدا": "موسیقی بومی" };
  const cat = catMap[entry.category] || entry.category || "";
  if (spec.archetype === "audio") return { title: spec.titleFa, blurb: `افکت صوتی ${spec.titleFa} — سنتز محلی روی ضرب ${dur || "کوتاه"}.` };
  return { title: spec.titleFa, blurb: `${spec.titleFa} — ${cat}${spec.line1 ? "؛ " + spec.line1 : ""}${dur ? ` (${dur})` : ""}.` };
}
