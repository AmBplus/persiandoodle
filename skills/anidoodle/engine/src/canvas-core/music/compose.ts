// COMPOSE: the composer's material + a style vocabulary -> a Piece. The composer (the model) writes
// every note: the chord voicings and bass lines, the motifs and lines, the form. The style supplies
// only sound (voices, levels, fx), groove grammars, and the arrangement grammar (which layers a
// section kind lets sound). Nothing is filled in: missing material is an error that says what to
// compose. Workflow and craft: references/music/compose.md. Vocabularies: vocab.ts.
import { line, beatsPerBar, type Note, type Piece, type Part, type Role, type Meter } from "./plan";
import type { ModeId } from "./theory";
import type { MoodId, StyleId } from "./tables";
import { perform } from "./perform";
import { drumBar, type Groove, type Lane } from "./grooves";
import { VOCAB_TRIM, VOCAB_TARGET_FIX } from "./vocabTrim";
import { VOCAB, KINDS, BASE_SLOTS, resolveVoice, moodVoice, moodFx, fullMood, type Slot, type Voice, type SectionKind, type MoodControls } from "./vocab";

/** One chord of YOUR harmony: its voicing (a notation chord) and a one-bar bass line you wrote for it. */
export type ComposedChord = { voicing: string; bass?: string };
/** A line = notation bars, or names of your motifs, joined in order from the section's first bar. */
export type LineSpec = string | string[];
export type ComposedSection = {
  id?: string; kind: SectionKind; bars: number;
  /** chord names per bar (keys of `chords`), cycled to fill the section; a bar may hold two: "Dm9 G13" splits it */
  harmony: string[];
  lead?: LineSpec; counter?: LineSpec; arp?: LineSpec;
  /** override the chords' bass lines for this section (one bar of notation, or one per bar) */ bass?: string | string[];
  /** a key of `grooves`, or null for no drums; default by kind (main / half / build / none) */ groove?: string | null;
  /** chord velocity scale (0..1.2), e.g. 0.8 for a softer intro */ chordVel?: number;
  /** 0..1, scales generated groove density in this section */ energy?: number;
  /** play the section this many times (refit changes it for the stretch section) */ repeat?: number; stretch?: boolean;
};
export type Material = {
  style: StyleId; title: string; seed: number; mood: MoodId; bpm: number; key: string; mode: ModeId; meter?: Meter;
  chords: Record<string, ComposedChord>; motifs?: Record<string, string>; grooves?: Record<string, Groove>;
  sections: ComposedSection[];
  /** swap a slot's voice for one of the style's alternates by name, or give your own Voice */ voices?: Partial<Record<Slot, string | Voice>>;
  /** gainDb per slot, after measuring stems */ levels?: Partial<Record<Slot, number>>;
  moodControls?: MoodControls; swing?: number; dyn?: [number, number]; tail?: number; loop?: boolean;
};

const need = (ok: unknown, msg: string) => { if (!ok) throw new Error(`compose: ${msg} The style supplies sound, never notes: compose it yourself (references/music/compose.md).`); };
const fmt = (x: number) => String(+x.toFixed(4));
const lanes: Lane[] = ["kick", "snare", "ghost", "hat", "perc"];

/** Expand repeats: the sections as played, with their first bar. */
export const layout = (sections: ComposedSection[]) => {
  const out: { s: ComposedSection; id: string; from: number; to: number; pass: number }[] = []; let b = 0;
  sections.forEach((s, i) => { for (let k = 0; k < (s.repeat ?? 1); k++) { out.push({ s, id: s.id ?? `${s.kind}${i}`, from: b, to: b + s.bars, pass: k }); b += s.bars; } });
  return out;
};

export const composePiece = (m: Material): Piece => {
  const V = VOCAB[m.style]; need(V, `no vocabulary for style "${m.style}" (have: ${Object.keys(VOCAB).join(", ")}).`);
  const vocab = V!, meter = m.meter ?? vocab.meters[0], bpb = beatsPerBar(meter);
  need(m.title && Number.isFinite(m.seed) && m.mood, "a piece needs its own title, seed and mood.");
  need(m.sections?.length, "no form: write the sections (kind, bars, harmony, lines).");
  need(m.chords && Object.keys(m.chords).length, "no harmony: write your chords (voicing + bass line per chord).");
  const lay = layout(m.sections), B = lay[lay.length - 1].to;
  need(m.sections.some((s) => s.lead), "no melody: at least one section needs a lead line (your own motif).");
  const motif = (x: string) => m.motifs?.[x] ?? x;
  const lineOf = (spec: LineSpec) => (Array.isArray(spec) ? spec : [spec]).map(motif).join(" | ");

  // ---- harmony per bar (a bar may split into chords: "A B" = two halves)
  const chordAt: string[][] = [];
  for (const x of lay) {
    need(x.s.harmony?.length, `section "${x.id}" has no harmony: write the chord names for its bars.`);
    for (let i = 0; i < x.s.bars; i++) { const names = x.s.harmony[i % x.s.harmony.length].trim().split(/\s+/); for (const n of names) need(m.chords[n], `chord "${n}" (section "${x.id}") has no voicing: add chords["${n}"] = { voicing: "[...]", bass: "..." }.`); chordAt.push(names); }
  }
  const harmony = chordAt.flatMap((names, b) => names.map((name, j) => ({ t: b * bpb + (j * bpb) / names.length, name })));
  const at = (b: number) => lay.find((x) => b >= x.from && b < x.to)!;

  // ---- notes
  const notes: Partial<Record<Slot, Note[]>> = {};
  const push = (slot: Slot, ns: Note[]) => { (notes[slot] ??= []).push(...ns); };
  const vel: Record<Slot, number> = { chords: 0.62, lead: 0.72, counter: 0.5, bass: 0.85, arp: 0.55, kick: 0.85, snare: 0.7, ghost: 0.5, hat: 0.5, perc: 0.45 };
  const role = (slot: Slot): Role => (slot === "chords" || slot === "arp" ? "accomp" : slot === "lead" ? "melody" : slot === "counter" ? "color" : slot === "bass" ? "bass" : "drum");
  for (let b = 0; b < B; b++) {
    const x = at(b), cv = x.s.chordVel, names = chordAt[b], d = bpb / names.length;
    const src = names.map((n) => `${m.chords[n].voicing}:${fmt(d)}${cv !== undefined ? `@${fmt(cv)}` : ""}`).join(" ");
    push("chords", line(b * bpb, src, { role: "accomp", v: vel.chords, bpb, roll: 0.03 }));
    if (KINDS[x.s.kind].bass) {
      const ov = x.s.bass, bl = ov !== undefined ? (Array.isArray(ov) ? ov[(b - x.from) % ov.length] : ov) : names.length === 1 ? m.chords[names[0]].bass : undefined;
      need(bl !== undefined, names.length > 1 ? `bar ${b} splits into ${names.join(" + ")}: give section "${x.id}" a bass override for it.` : `chord "${names[0]}" (section "${x.id}") has no bass line: add chords["${names[0]}"].bass (one bar), or a section bass override.`);
      if (bl) push("bass", line(b * bpb, bl, { role: "bass", v: vel.bass, bpb }));
    }
    // drums
    const def = KINDS[x.s.kind].drums, gname = x.s.groove === undefined ? def : x.s.groove;
    if (gname) {
      const g = m.grooves?.[gname];
      need(g, `section "${x.id}" (${x.s.kind}) needs a groove "${gname}": add grooves["${gname}"] = { family: one of ${vocab.grooves.join(", ")}, density, variation } or write it (kick/snare/ghost/hat bars), or set groove: null.`);
      const bar = drumBar(g!, meter, m.seed, b, b - x.from, x.s.bars, x.s.energy ?? 0.5);
      for (const ln of lanes) if (bar[ln]) push(ln, line(b * bpb, bar[ln]!, { role: "drum", v: vel[ln], bpb }));
    }
  }
  for (const x of lay) for (const slot of ["lead", "counter", "arp"] as Slot[]) {
    const spec = x.s[slot as "lead" | "counter" | "arp"]; if (!spec) continue;
    const ns = line(x.from * bpb, lineOf(spec), { role: role(slot), v: vel[slot], bpb });
    need(ns.every((n) => n.t < x.to * bpb - 1e-9), `the ${slot} line of section "${x.id}" is longer than its ${x.s.bars} bars.`);
    push(slot, ns);
  }

  // ---- parts from the palette (+ alternates, levels, mood)
  const mood = m.moodControls ? fullMood(m.moodControls) : null, targets: Record<string, number> = {};
  const slots = [...BASE_SLOTS, ...(["arp", "perc"] as Slot[]).filter((s) => notes[s]?.length)];
  const parts: Part[] = [];
  for (const slot of slots) {
    const pick = m.voices?.[slot];
    const FALLBACK: Partial<Record<Slot, Slot>> = { perc: "hat", ghost: "snare", snare: "ghost", hat: "perc" }; // a drum lane without its own voice borrows its neighbour's
    let v = typeof pick === "object" ? pick : typeof pick === "string" ? vocab.alternates[slot]?.[pick] : vocab.palette[slot] ?? (notes[slot]?.length && FALLBACK[slot] ? vocab.palette[FALLBACK[slot]!] : undefined);
    need(typeof pick !== "string" || v, `style ${vocab.id} has no "${pick}" voice for ${slot} (have: ${Object.keys(vocab.alternates[slot] ?? {}).join(", ") || "none"}).`);
    if (!v) { if (slot === "chords") continue; /* a style without a chord voice (chiptune): the harmony still labels bars and feeds the bass */ need(!notes[slot]?.length, `style ${vocab.id} has no ${slot} voice, but your ${slot} has notes: pick a groove family or slot this style has.`); continue; }
    v = resolveVoice(v, m.bpm);
    let dGain = 0; if (mood) { const r = moodVoice(slot, v, mood); v = r.voice; dGain = r.dGain; }
    const lv = m.levels?.[slot];
    const trim = pick !== undefined ? 0 : VOCAB_TRIM[vocab.id]?.[slot] ?? 0, gainDb = lv !== undefined ? lv : trim ? v.gainDb + trim : v.gainDb;
    if (vocab.stemTargets[slot] !== undefined) targets[slot] = vocab.stemTargets[slot] + dGain + (pick === undefined ? VOCAB_TARGET_FIX[vocab.id]?.[slot] ?? 0 : 0); // a mood that lifts the hats lifts their target too
    const p: Part = { id: slot, inst: v.inst, role: v.role, notes: notes[slot] ?? [], gainDb };
    if (v.opts) p.opts = v.opts; if (v.send !== undefined) p.send = v.send; if (v.pan !== undefined) p.pan = v.pan;
    parts.push(p);
  }
  const e = mood ? mood.energy - 0.5 : 0, dyn = m.dyn ?? [0.62, 0.66];
  const piece: Piece = {
    title: m.title, seed: m.seed, tail: m.tail ?? 3.2, harmony, parts,
    plan: { style: m.style, tempo: m.bpm, meter, swing: m.swing ?? vocab.swing[0], ritard: m.loop ? 1 : 0.92, loop: m.loop,
      sections: [{ id: "a", bars: B, mood: m.mood, key: m.key, mode: m.mode, melody: ["stepwise", "hook"], dyn: mood ? [dyn[0] + e * 0.2, dyn[1] + e * 0.2] : dyn, ending: "tail", repeatable: false }] },
    fx: mood ? moodFx(vocab.fx, mood) : vocab.fx, stemTargets: targets,
    arrangement: lay.map((x) => ({ id: x.id, kind: x.s.kind, from: x.from, bars: x.s.bars })),
    refit: m.loop ? undefined : (seconds: number) => composePiece(refitMaterial(m, seconds)),
  };
  return piece;
};

/** lofiElectronic(material): composePiece in the lo-fi electronic vocabulary. */
export const lofiElectronic = (m: Omit<Material, "style">): Piece => composePiece({ ...m, style: "lofiElectronic" } as Material);

/**
 * The same composition for a film `seconds` long: the `stretch` section (default the longest
 * groove/hook/verse/drop) is played more or fewer times (0 = dropped), whichever puts the last
 * onset nearest `seconds - tail` at the written tempo. fitToDuration then trims the tempo.
 */
export const refitMaterial = (m: Material, seconds: number): Material => {
  const secs = m.sections, want = seconds - (m.tail ?? 3.2);
  let si = secs.findIndex((s) => s.stretch);
  if (si < 0) secs.forEach((s, i) => { if (["groove", "hook", "verse", "drop"].includes(s.kind) && (si < 0 || s.bars * (s.repeat ?? 1) > secs[si].bars * (secs[si].repeat ?? 1))) si = i; });
  if (si < 0 || want <= 0) return m;
  let best: { m: Material; cost: number } | null = null;
  for (let r = 0; r <= 64; r++) {
    const m2: Material = { ...m, sections: secs.map((s, i) => (i === si ? { ...s, repeat: r } : s)).filter((s) => (s.repeat ?? 1) > 0) };
    if (!m2.sections.some((s) => s.lead)) continue;
    const t = perform(composePiece(m2), m.bpm, { expressive: true }).lastOnset, tempo = m.bpm * (t / want), cost = Math.abs(Math.log(tempo / m.bpm));
    if (!best || cost < best.cost) best = { m: m2, cost };
    if (tempo > m.bpm * 1.3) break;
  }
  return best ? best.m : m;
};
