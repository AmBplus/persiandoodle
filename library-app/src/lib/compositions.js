// ترکیب‌های عملی — چند کامپوننت در یک صحنهٔ واحد، با برش‌های تدوینی و بسترِ صدایی سینت‌شده
// همه‌چیز محلی است: افکت‌ها از effects.js و صدا با WebAudio تولید می‌شود (بدون فایل خارجی).

export const FPS = 30;

// گام هجاز-سول: مینور شرقی با حس ایرانی؛ نت‌ها بر حسب نیم‌پرده از ریشهٔ D
const SCALE = [0, 1, 4, 5, 7, 8, 11]; // D Eb F# G A Bb C#
const ROOT = 146.83; // D3

export const COMPOS = [
  {
    id: "compo/intro-title",
    titleFa: "معرفیِ تیترواژ",
    descFa: "پردهٔ آکولاد باز می‌شود، کلیدواژه با ماژیک برجسته می‌شود و زیرآن یک جمله آرام می‌نشیند — برای ویدیوی معرفی.",
    mood: "calm",
    steps: [
      { key: "brace", text: "استودیو شما", frames: 96 },
      { key: "highlight", text: "قصهٔ برند شما", frames: 110 },
      { key: "reveal", text: "از ایده تا اجرا", frames: 84 },
    ],
  },
  {
    id: "compo/doc-brief",
    titleFa: "بریف سندی",
    descFa: "سند تایپ می‌شود، نقل‌قول ماشینی می‌آید و نتیجه با کوبش می‌نشیند — برای گزارش و گزارش‌گیری.",
    mood: "focus",
    steps: [
      { key: "docwrite", text: "گزارش فصل سوم", frames: 110 },
      { key: "typewriter", text: "خواندنی شد", frames: 96 },
      { key: "stomp", text: "ثبت شد", frames: 70 },
    ],
  },
  {
    id: "compo/launch-board",
    titleFa: "فرود تابلویی",
    descFa: "تابلوی فرودگاه نسخهٔ تازه را اعلام می‌کند، شمارهٔ رشد شمرده می‌شود و برچسب‌ها ردیف می‌شوند — برای لانچ.",
    mood: "upbeat",
    steps: [
      { key: "splitflap", text: "نسخهٔ ۱۴۰۵", frames: 120 },
      { key: "counter", text: "۱۲۰ هزار کاربر", frames: 96 },
      { key: "chipcycle", text: "مسیر ساخت:", frames: 130 },
    ],
  },
  {
    id: "compo/edit-rhythm",
    titleFa: "ریتمِ تدوین",
    descFa: "نوار فیلم فعل‌ها را عوض می‌کند، غلتک عمودی مخاطب را انتخاب می‌کند و واژه‌ها با پاپ می‌نشینند.",
    mood: "upbeat",
    steps: [
      { key: "filmstrip", text: "پژوهش می‌کند", frames: 130 },
      { key: "rollcycle", text: "ساخته‌شده برای", frames: 130 },
      { key: "wordpop", text: "همین امروز", frames: 80 },
    ],
  },
  {
    id: "compo/final-label",
    titleFa: "برچسبِ پایانی",
    descFa: "قرصِ گردان روی جملهٔ نهایی می‌ایستد و تک‌واژهٔ تأکید با پرشدن دورخط می‌درخشد — برای آخر کادر.",
    mood: "calm",
    steps: [
      { key: "pillslot", text: "همه‌چیز در", frames: 130 },
      { key: "outlinefill", text: "یک قاب", frames: 96 },
      { key: "mask", text: "پرشین‌آرتس", frames: 90 },
    ],
  },
  {
    id: "compo/story-open",
    titleFa: "آغازِ روایت",
    descFa: "قلم جمله را می‌نویسد، کلمات از عمق می‌آیند و کادرِ عاشقانه قصه را قاب می‌گیرد — برای شروعِ قصه.",
    mood: "warm",
    steps: [
      { key: "inktrace", text: "با خط، فکر را می‌نویسیم", frames: 130 },
      { key: "flyingwords", text: "قصه از اینجا شروع می‌شود", frames: 120 },
      { key: "reveal", text: "بنویس، زنده شود", frames: 90 },
    ],
  },
];

const CHORDS = {
  calm: [[0, 4, 7], [-3, 2, 5], [-5, 0, 4], [-7, 0, 5]],
  focus: [[0, 3, 7], [-4, 1, 5], [-2, 2, 7], [-5, 0, 3]],
  upbeat: [[0, 4, 7], [5, 9, 12], [2, 7, 11], [-3, 4, 9]],
  warm: [[0, 4, 9], [-3, 4, 7], [-5, 2, 7], [-7, 0, 4]],
};

/** پلنر صدا: در هر برش یک پلاک می‌زند و آکورد بستر عوض می‌شود. همه با WebAudio — بدون فایل. */
export class CompoAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.on = false;
  }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 2400;
    this.master.connect(lp).connect(this.ctx.destination);
  }
  async enable() {
    this.ensure();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.on = true;
    this.master.gain.setTargetAtTime(0.16, this.ctx.currentTime, 0.2);
  }
  disable() {
    this.on = false;
    if (this.ctx) this.master.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15);
  }
  note(freq, t0, dur, type = "triangle", vol = 0.2) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  pluck(t0) {
    this.note(ROOT * 4, t0, 0.22, "triangle", 0.16);
    this.note(ROOT * 6, t0 + 0.03, 0.16, "sine", 0.1);
  }
  /** آکورد بستر برای گام جاری — با هر برش صدا می‌شود */
  pad(chordIdx, mood) {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime + 0.02;
    const ch = (CHORDS[mood] || CHORDS.calm)[chordIdx % 4];
    ch.forEach((semi, i) => {
      this.note(ROOT * Math.pow(2, semi / 12), t0, 1.6, "sine", 0.06 + i * 0.008);
      this.note(ROOT * Math.pow(2, semi / 12) * 2, t0, 1.2, "triangle", 0.018);
    });
  }
  hit(t0) { this.pluck(t0); }
}
