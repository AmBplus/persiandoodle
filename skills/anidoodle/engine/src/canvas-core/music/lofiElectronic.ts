// LO-FI ELECTRONIC, the style as an API. Chill, upbeat, clean electronic built on the lofiKit voices
// (warmPad, softPluck, sub) and the drum kit: a 4-bar chord loop, sections that add and remove
// layers, the kick pumping the pad, a dotted-eighth ping-pong on the hook, tape barely there.
// No electric piano, no vinyl, no bit-crush (Alex: "upbeat, clear, not noisy"). The mix is set by
// measured stem RMS against LOFI_STEM_TARGETS (LUFS alone once hid a sub 7-10 dB too hot).
//
//   const piece = lofiElectronic({ bpm: 96, key: "D", progression: [...4 chords], home: 0,
//     sections: [{ kind: "intro", bars: 2 }, { kind: "hook", bars: 8, stretch: true }, { kind: "outro", bars: 2 }] });
//
// Section kinds and their layers (hook / sparkle flags add the lead and the high plucks anywhere):
//   intro      pad only (the `intro` chords if given)       groove   pad, sub, full drums
//   hook       groove + hook                                half     pad, sub, half-time drums
//   breakdown  pad only, drums and sub out                  drop     groove + hook (the landing)
//   outro      the home chord held, sub on the home root, the home note on the last bar
// Harmony phase: bar `land` (a bar number or a section id; default the last drop, else the first
// bar after the intro) plays progression[home]. `refit(seconds)` adds or removes whole loop cycles
// of the `stretch` section so a film score still ends on its outro, never chopped at the last frame.
import { line, type Note, type Piece, type Part, type Role } from "./plan";
import type { ModeId } from "./theory";
import type { MoodId } from "./tables";
import { perform } from "./perform";

/** One chord of the loop: pad voicing (notation chord), sub root and the walk note into the next bar, optional hook and sparkle bars. */
export type LofiChord = { name: string; pad: string; root: string; walk: string; hook?: string | string[]; sparkle?: string };
export type LofiKind = "intro" | "groove" | "hook" | "half" | "breakdown" | "drop" | "outro";
export type LofiSection = { kind: LofiKind; bars: number; id?: string; hook?: boolean; sparkle?: boolean; stretch?: boolean };
export type LofiDrums = { kick: [string, string]; snare: string; ghost: [string, string]; hats: string; halfKick: string; halfSnare: string; halfHats: string };
export type LofiSpec = {
  title?: string; seed?: number; bpm: number; key: string; mode?: ModeId; mood?: MoodId;
  progression: LofiChord[]; home?: number; land?: number | string; intro?: { name: string; pad: string }[]; outroNote?: string;
  sections: LofiSection[];
  /** a seamless loop: no final ritard, no cadence relax, render it with renderLoop */ loop?: boolean;
  swing?: number; dyn?: [number, number]; tail?: number;
  /** gainDb per part id (pad, lead, sparkle, sub, kick, snare, ghost, hat), set by measuring stems */ levels?: Record<string, number>;
  drums?: Partial<LofiDrums>;
};

/** Stem RMS targets, dBFS over each stem's active samples (unmastered, pre-room). Calibrated on the approved launch score. */
export const LOFI_STEM_TARGETS: Record<string, number> = { kick: -14, snare: -20, hat: -28, sub: -18, pad: -21, lead: -16.5, sparkle: -24 };

const HATS16 = Array.from({ length: 16 }, (_, i) => `C4:.25@${[0.85, 0.35, 0.6, 0.4][i % 4]}`).join(" ");
export const LOFI_DRUMS: LofiDrums = {
  kick: ["C4:1.5 C4:1@.75 C4:1.5@.9", "C4:1.5 C4:.5@.6 C4:.5@.7 C4:1.25@.9 C4:.25@.5"], snare: "r:1 C4:2 C4:1",
  ghost: ["r:3.75 C4:.25@.5", "r:1.75 C4:.25@.45 r:2"], hats: HATS16,
  halfKick: "C4:2 r:2", halfSnare: "r:2 C4:2", halfHats: "C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35",
};

const HOOKED: LofiKind[] = ["hook", "drop"], DRUMMED: LofiKind[] = ["groove", "hook", "drop"], SUBBED: LofiKind[] = ["groove", "hook", "drop", "half"];
const mod = (a: number, m: number) => ((a % m) + m) % m;

/** Where each section starts, in bars. */
export const lofiLayout = (sections: LofiSection[]) => { let b = 0; return sections.map((s, i) => { const from = b; b += s.bars; return { s, id: s.id ?? `${s.kind}${i}`, from, to: b }; }); };

export const lofiElectronic = (spec: LofiSpec): Piece => {
  const lay = lofiLayout(spec.sections), B = lay[lay.length - 1].to, last = B - 1, P = spec.progression, len = P.length, home = spec.home ?? 0;
  const dr = { ...LOFI_DRUMS, ...spec.drums };
  const firstBody = lay.find((x) => x.s.kind !== "intro")?.from ?? 0, drops = lay.filter((x) => x.s.kind === "drop");
  const land = typeof spec.land === "number" ? spec.land : typeof spec.land === "string" ? lay.find((x) => x.id === spec.land)!.from : drops.length ? drops[drops.length - 1].from : firstBody;
  const anchor = spec.land !== undefined || drops.length ? home : 0; // with no landing asked for, the loop starts at its first chord
  const ci = (b: number) => mod(b - land + anchor, len), pass = (b: number) => Math.floor((b - land + anchor) / len);
  const at = (b: number) => lay.find((x) => b >= x.from && b < x.to)!;
  const H = P[home], outroNote = spec.outroNote ?? `${spec.key.replace(/m$/, "")}5`;
  const bars = (role: Role, v: number, fn: (b: number) => string | null, extra: { roll?: number } = {}): Note[] => {
    const out: Note[] = [];
    for (let b = 0; b < B; b++) { const s = fn(b); if (s) out.push(...line(b * 4, s, { role, v, bpb: 4, ...extra })); }
    return out;
  };
  const kind = (b: number) => at(b).s.kind, introIdx = (b: number) => b - at(b).from;
  const introChord = (b: number) => (kind(b) === "intro" && spec.intro?.length ? spec.intro[introIdx(b) % spec.intro.length] : null);
  const hookOn = (b: number) => at(b).s.hook ?? HOOKED.includes(kind(b));
  const pickHook = (c: LofiChord, b: number) => (Array.isArray(c.hook) ? c.hook[mod(pass(b), c.hook.length)] : c.hook) ?? null;

  const pad = bars("accomp", 0.62, (b) => { const ic = introChord(b); return kind(b) === "outro" ? `${H.pad}:4@.75` : ic ? `${ic.pad}:4@.8` : `${P[ci(b)].pad}:4`; }, { roll: 0.03 });
  const sub = bars("bass", 0.85, (b) => (kind(b) === "outro" ? `${H.root}:4` : SUBBED.includes(kind(b)) ? `${P[ci(b)].root}:3 r:.5 ${P[ci(b)].walk}:.5` : null));
  const drum = (full: (b: number) => string | null, half: string | null) => (b: number) => (DRUMMED.includes(kind(b)) ? full(b) : kind(b) === "half" ? half : null);
  const kick = bars("drum", 0.85, drum((b) => dr.kick[b % 2], dr.halfKick));
  const snare = bars("drum", 0.7, drum(() => dr.snare, dr.halfSnare));
  const ghost = bars("drum", 0.5, drum((b) => dr.ghost[b % 2], null));
  const hats = bars("drum", 0.5, drum(() => dr.hats, dr.halfHats));
  const lead = bars("melody", 0.72, (b) => (kind(b) === "outro" ? (b === last ? `${outroNote}:4` : null) : hookOn(b) ? pickHook(P[ci(b)], b) : null));
  const sparkle = bars("color", 0.5, (b) => (at(b).s.sparkle && kind(b) !== "outro" ? P[ci(b)].sparkle ?? null : null));
  const harmony = Array.from({ length: B }, (_, b) => ({ t: b * 4, name: kind(b) === "outro" ? H.name : introChord(b)?.name ?? P[ci(b)].name }));

  const bpm = spec.bpm, DE = (60 / bpm) * 0.75, lv = spec.levels ?? {};
  const g = (id: string, d: number) => lv[id] ?? d;
  const parts: Part[] = [
    { id: "pad", inst: "warmPad", role: "accomp", notes: pad, gainDb: g("pad", -3), opts: { cut: 2600, attack: 0.5, release: 1.4, spread: 0.55 }, send: 0.35 },
    { id: "lead", inst: "softPluck", role: "melody", notes: lead, gainDb: g("lead", 6), opts: { decay: 0.42, bright: 6000, delay: DE, feedback: 0.28, delayMix: 0.24 }, send: 0.25 },
    { id: "sparkle", inst: "softPluck", role: "color", notes: sparkle, gainDb: g("sparkle", 8), opts: { decay: 0.35, bright: 5200, pan: 0.35, delay: DE, feedback: 0.3, delayMix: 0.35 }, send: 0.6 },
    { id: "sub", inst: "sub", role: "bass", notes: sub, gainDb: g("sub", -6), opts: { cut: 150 } },
    { id: "kick", inst: "kick", role: "drum", notes: kick, gainDb: g("kick", 0.5), send: 0.1 },
    { id: "snare", inst: "snare", role: "drum", notes: snare, gainDb: g("snare", 8), send: 0.3 },
    { id: "ghost", inst: "snare", role: "drum", notes: ghost, opts: { rim: true }, gainDb: g("ghost", 4), send: 0.2 },
    { id: "hat", inst: "hat", role: "drum", notes: hats, opts: { pan: 0.25 }, gainDb: g("hat", 20), send: 0.1 },
  ];
  return {
    title: spec.title ?? `lo-fi electronic in ${spec.key}`, seed: spec.seed ?? 2027, tail: spec.tail ?? 3.2, harmony, parts,
    plan: { style: "lofiElectronic", tempo: bpm, meter: "4/4", swing: spec.swing ?? 0.54, ritard: spec.loop ? 1 : 0.92, loop: spec.loop,
      sections: [{ id: "a", bars: B, mood: spec.mood ?? "calm", key: spec.key, mode: spec.mode ?? "major", melody: ["stepwise", "hook"], dyn: spec.dyn ?? [0.62, 0.66], ending: "tail", repeatable: false }] },
    fx: { clean: true, duck: { by: "kick", parts: ["pad", "sparkle"], depth: 0.38, release: 0.24 }, tape: { wowCents: 2.5, wowHz: 0.4, flutterCents: 0, flutterHz: 6, drive: 1.02 } },
    stemTargets: LOFI_STEM_TARGETS,
    arrangement: lay.map((x) => ({ id: x.id, kind: x.s.kind, from: x.from, bars: x.s.bars })),
    refit: spec.loop ? undefined : (seconds: number) => lofiElectronic(refitLofi(spec, seconds)),
  };
};

/**
 * The same arrangement for a film `seconds` long: the `stretch` section (default the longest hook,
 * groove or drop section) gains or loses whole loop cycles so, at the written bpm, the last onset
 * lands nearest `seconds - tail`. fitToDuration then trims the tempo by the remaining few percent.
 * Harmony stays in phase because only whole cycles move; a numeric `land` after the stretch moves with it.
 */
export const refitLofi = (spec: LofiSpec, seconds: number): LofiSpec => {
  const secs = spec.sections, len = spec.progression.length, want = seconds - (spec.tail ?? 3.2);
  let si = secs.findIndex((s) => s.stretch);
  if (si < 0) secs.forEach((s, i) => { if (["hook", "groove", "drop"].includes(s.kind) && (si < 0 || s.bars > secs[si].bars)) si = i; });
  if (si < 0 || want <= 0) return spec;
  const from = lofiLayout(secs)[si].from, b0 = secs[si].bars;
  let best: { spec: LofiSpec; cost: number } | null = null;
  for (let k = -Math.floor((b0 - 1) / len); k <= 64; k++) {
    const bars = b0 + k * len; if (bars < 1) continue;
    const land = typeof spec.land === "number" && spec.land >= from + b0 ? spec.land + k * len : spec.land;
    const s2: LofiSpec = { ...spec, land, sections: secs.map((s, i) => (i === si ? { ...s, bars } : s)) };
    const p = lofiElectronic({ ...s2 }), t = perform(p, spec.bpm, { expressive: true }).lastOnset, tempo = spec.bpm * (t / want);
    const cost = Math.abs(Math.log(tempo / spec.bpm));
    if (!best || cost < best.cost) best = { spec: s2, cost };
    if (tempo > spec.bpm * 1.3) break;
  }
  return best!.spec;
};
