#!/usr/bin/env node
// Music unit test: styles are vocabularies, the composer writes the notes.
//   node tools/music-unit.mjs
// Asserts: the approved launch score is bit-identical as composed material (md5); neutral mood is the
// calibrated palette exactly; missing material is an error, never a default; every groove family
// parses in every meter and varies with the seed; every style vocabulary composes, renders (true peak
// <= -1 dBTP, loudness at its master target) and meets its stem targets; the stem meter catches a sub
// 9 dB hot that LUFS alone passes; a seamless loop; a film fit that ends on its phrase; the score
// scaffold is empty; and the novelty gate hears the copy Alex heard (Daylight vs the launch score).
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { join } from "node:path";

const src = join(import.meta.dirname, "../src/canvas-core/music/index.ts");
const js = (await build({ entryPoints: [src], bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const md5 = (r) => { const h = createHash("md5"); h.update(Buffer.from(r.L.buffer, r.L.byteOffset, r.L.byteLength)); h.update(Buffer.from(r.R.buffer, r.R.byteOffset, r.R.byteLength)); return h.digest("hex"); };
const ok = []; const t0 = Date.now();
const pass = (s) => { ok.push(s); console.log(`  ok  ${s}`); };

// 1. The approved launch score, now composed material on the lo-fi electronic vocabulary: bit-identical.
const LAUNCH3_MD5_48K = "d20789f2344e6fff0d2a380c7c7825d2";
const launch = M.renderPiece(M.launchLofi3(), 48000);
assert.equal(md5(launch), LAUNCH3_MD5_48K, "launchLofi3 audio changed");
{ const tp = M.truePeak([launch.L, launch.R]).dbtp, lu = M.loudness([launch.L, launch.R], 48000).integrated; assert(tp <= -1 && Math.abs(lu + 14) <= 1);
  pass(`launchLofi3 md5 ${LAUNCH3_MD5_48K} (48 kHz), ${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP`); }

// 2. Mood controls: all at 0.5 = the calibrated palette exactly; moved, the sound changes.
const SR = 24000, launchMd5_24 = md5(M.renderPiece(M.launchLofi3(), SR));
assert.equal(md5(M.renderPiece(M.composePiece({ ...M.launchLofi3Material(), moodControls: { energy: 0.5, warmth: 0.5, brightness: 0.5, tension: 0.5, space: 0.5 } }), SR)), launchMd5_24, "neutral mood must be identity");
assert.notEqual(md5(M.renderPiece(M.composePiece({ ...M.launchLofi3Material(), moodControls: { warmth: 0.9, space: 0.8 } }), SR)), launchMd5_24);
pass("mood controls: 0.5 on all five = identical audio; warmth/space moved = different audio");

// 3. No defaults: missing material is an error that says what to compose.
const base = M.launchLofi3Material();
for (const [what, m] of [
  ["harmony", { ...base, sections: base.sections.map((s, i) => (i === 1 ? { ...s, harmony: [] } : s)) }],
  ["melody", { ...base, sections: base.sections.map((s) => ({ ...s, lead: undefined })) }],
  ["chord voicing", { ...base, chords: { Dm9: base.chords.Dm9 } }],
  ["groove", { ...base, grooves: {} }],
  ["form", { ...base, sections: [] }],
  ["seed/mood", { ...base, mood: undefined }],
]) assert.throws(() => M.composePiece(m), /compose/, `missing ${what} must throw`);
{ const sjs = (await build({ entryPoints: [join(import.meta.dirname, "../src/canvas-core/score.ts")], bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
  const S = await import("data:text/javascript;base64," + Buffer.from(sjs).toString("base64")); assert.throws(() => S.filmScore(S.scoreSkeleton(), 30, 300), /skeleton/); }
pass("missing harmony, melody, voicing, groove, form, mood: each throws; the score scaffold is empty and refuses to play");

// 4. Groove families: every family parses in every meter, deterministic, and the seed varies the bars.
{ const meters = ["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8"]; let n = 0;
  for (const family of Object.keys(M.GROOVE_FAMILIES)) for (const meter of meters) for (let b = 0; b < 4; b++) {
    const g = { family, density: 0.8, variation: 0.8, fill: true }, bar = M.grooveBar(g, meter, 7, b, b, 4), again = M.grooveBar(g, meter, 7, b, b, 4);
    assert.deepEqual(bar, again); for (const x of Object.values(bar)) if (x) { M.line(0, x, { role: "drum", bpb: M.beatsPerBar(meter) }); n++; }
  }
  const bars = (seed) => Array.from({ length: 8 }, (_, b) => JSON.stringify(M.grooveBar({ family: "bounce", density: 0.7, variation: 0.8 }, "4/4", seed, b, b, 8)));
  assert.notDeepEqual(bars(1), bars(2)); assert(new Set(bars(1)).size > 1);
  pass(`${Object.keys(M.GROOVE_FAMILIES).length} groove families x ${meters.length} meters: ${n} bars parse, deterministic, seed-varied`); }

// 5. Every style vocabulary: a neutral test signal composes, renders, masters and meets its stem targets.
for (const v of Object.values(M.VOCAB)) {
  const p = M.composePiece(M.testMaterial(v, { bars: 4 })), r = M.renderPiece(p, SR), tp = M.truePeak([r.L, r.R]).dbtp, lu = M.loudness([r.L, r.R], SR).integrated;
  const target = M.STYLES[v.id].master === "dense" ? -14 : -16, b = M.measureStems(p, SR);
  assert(tp <= -1, `${v.id}: ${tp} dBTP`); assert(lu <= target + 1 && lu >= target - 6, `${v.id}: ${lu} LUFS vs ${target}`);
  if (!v.calibrated) assert(b.pass, `${v.id}: stems ${b.rows.filter((x) => !x.ok).map((x) => `${x.id} ${x.offDb.toFixed(1)}`).join(", ")}`);
  assert(!p.parts.some((x) => ["ePiano", "vinyl"].includes(x.inst)) || v.id === "lofi", `${v.id}: ePiano/vinyl only in the dusty lofi style`);
}
pass(`${Object.keys(M.VOCAB).length} style vocabularies compose, render (true peak <= -1 dBTP), master; uncalibrated palettes meet their stem targets on the test signal`);

{ const b = M.measureStems(M.launchLofi3(), SR); assert(b.pass); const w = b.rows.filter((x) => x.offDb !== null).reduce((a, x) => (Math.abs(x.offDb) > Math.abs(a.offDb) ? x : a));
  pass(`lofiElectronic (calibrated on the listened launch score): stems within +-3 dB, worst ${w.id} ${w.offDb.toFixed(1)} dB`); }

// 6. The lesson: a sub 9 dB hot still masters to -14 LUFS; only the stem meter sees it.
{ const hot = M.composePiece({ ...base, levels: { bass: 9 } }), r = M.renderPiece(hot, SR), lu = M.loudness([r.L, r.R], SR).integrated, b = M.measureStems(hot, SR), sub = b.rows.find((x) => x.id === "bass");
  assert(Math.abs(lu + 14) <= 1 && !b.pass && sub.offDb > 7, "the stem meter must flag a hot sub that LUFS passes");
  pass(`hot sub: mix ${lu.toFixed(1)} LUFS (passes), stem meter flags bass +${sub.offDb.toFixed(1)} dB`); }

// 7. A seamless loop (composer's material, loop: true): the seam is an ordinary sample step.
{ const lp = M.renderLoop(M.composePiece(M.testMaterial(M.VOCAB.lofiElectronic, { loop: true })), SR), n = lp.L.length, steps = [];
  for (let i = 1; i < n; i += 3) steps.push(Math.abs(lp.L[i] - lp.L[i - 1])); steps.sort((a, b) => a - b);
  const p999 = steps[Math.floor(steps.length * 0.999)], seam = Math.max(Math.abs(lp.L[0] - lp.L[n - 1]), Math.abs(lp.R[0] - lp.R[n - 1]));
  assert(seam <= p999, `seam ${seam} > ${p999}`); assert.equal(md5(lp), md5(M.renderLoop(M.composePiece(M.testMaterial(M.VOCAB.lofiElectronic, { loop: true })), SR)));
  pass(`loop: seam step ${seam.toFixed(4)} <= p99.9 ${p999.toFixed(4)}, deterministic`); }

// 8. Film fit: the composition is re-formed (stretch section repeated or dropped) and ends on its phrase.
for (const secs of [70, 90, 110]) {
  const f = M.fitScore(M.launchLofi3(), secs), perf = M.perform(f.piece, f.tempo, { expressive: true }), p = f.piece;
  assert.equal(p.harmony[p.harmony.length - 1].name, "Cmaj9"); assert.equal(f.form, "full");
  assert(Math.abs(perf.lastOnset - (secs - p.tail)) < 0.05); assert(f.tempo >= 90 * 0.88 && f.tempo <= 90 * 1.12);
  pass(`fit ${secs} s: ${p.plan.sections[0].bars} bars at ${f.tempo.toFixed(1)} bpm, last onset ${perf.lastOnset.toFixed(2)} s on Cmaj9`);
}
{ const a = M.filmAudio(M.launchLofi3(), 40)(16000); assert.equal(a[0].length, 40 * 16000); pass("filmAudio: exactly the film's length"); }

// 9. Composer-facing fixes (from the blind composer's report).
{ const t = M.testMaterial(M.VOCAB.playful, { bars: 4 }), sec = t.sections[0];
  const once = M.composePiece({ ...t, sections: [{ ...sec, lead: sec.lead.slice(0, 2) }] });
  assert(once.warnings.some((w) => /plays once/.test(w)), "a short line must warn");
  const looped = M.composePiece({ ...t, sections: [{ ...sec, lead: sec.lead.slice(0, 2), loopLines: true }] });
  assert.equal(looped.warnings.length, 0); assert.equal(looped.parts.find((p) => p.id === "lead").notes.length, 2 * once.parts.find((p) => p.id === "lead").notes.length);
  pass("lines: a short line warns; loopLines repeats it to fill the section");
  const lv = (x) => M.composePiece({ ...t, levels: x }).parts.find((p) => p.id === "lead").gainDb;
  assert(Math.abs(lv({ lead: 2 }) - lv({}) - 2) < 1e-9); pass("levels: a dB offset on top of the calibrated gain");
  const vsum = (en) => M.composePiece({ ...t, sections: [{ ...sec, energy: en }] }).parts.flatMap((p) => p.notes).reduce((a, n) => a + n.v, 0);
  assert(vsum(0.2) < vsum(0.5) && vsum(0.8) > vsum(0.5)); pass("section energy scales the dynamics of every part");
  const lit = { main: { kick: ["C4:4", "r:2 C4:2"] } }, mk = (from) => M.composePiece({ ...t, grooves: lit, sections: [{ kind: "hook", bars: from, harmony: ["c0"], lead: sec.lead.slice(0, from) }, { kind: "hook", bars: 2, harmony: ["c0"], lead: sec.lead.slice(0, 2) }] });
  const kicks = (p, bar) => p.parts.find((x) => x.id === "kick").notes.filter((n) => n.t >= bar * 4 && n.t < bar * 4 + 4).map((n) => n.t - bar * 4);
  assert.deepEqual(kicks(mk(1), 1), [0]); assert.deepEqual(kicks(mk(2), 2), [0]); pass("written grooves cycle from each section's first bar");
  const orch = (key, tonic) => M.composePiece(M.testMaterial(M.VOCAB.orchestral, { bars: 2, key, tonic })).parts.find((p) => p.id === "perc").opts.pitch % 12;
  assert.equal(orch("C", 0), 0); assert.equal(orch("D", 2), 2); pass("timpani in a drum lane is tuned to the key");
  const mod = M.composePiece({ ...t, sections: [sec, { ...sec, key: "D" }] }); assert.deepEqual(mod.plan.sections.map((x) => x.key), ["C", "D"]); pass("per-section key: the key check reads each key region");
  // the blind composer's case: Db lydian whose notes lean on Ab (the same pitch set as Ab major), tonic ~12 % of note time
  const lp = (key, mode, src) => ({ title: "k", seed: 1, tail: 1, harmony: [], plan: { style: "ambient", tempo: 70, meter: "4/4", sections: [{ id: "a", bars: 5, mood: "awe", key, mode, melody: ["stepwise"], dyn: [0.5, 0.5] }] }, parts: [{ id: "m", inst: "fmBell", role: "melody", notes: M.line(0, src, { role: "melody", bpb: 4 }) }] });
  const src = "Db4:2 Ab4:2 | Ab4:2 Eb4:2 | Eb4:1 F4:2 G4:1 | G4:1 Bb4:2 C5:1 | C5:1 Eb5:1 r:2";
  assert(M.detectMode(M.line(0, src, { role: "melody", bpb: 4 }), ["lydian", "major", "aeolian", "dorian", "mixolydian"])[0].tonic !== "Db", "fixture must fool the raw detector");
  assert.deepEqual(M.planProblems(lp("Db", "lydian", src)), []); assert(M.planProblems(lp("E", "major", src)).length > 0);
  pass("Db lydian leaning on Ab is accepted (scale fits, tonic heard); a wrong key is still flagged");
  const st = { lead: [new Float32Array([0.3 * 10 ** ((-16.5 + 5) / 20) / 0.3]), new Float32Array(1)] };
  assert(M.stemBalance(st, { lead: -16.5 }).pass); assert(!M.stemBalance({ lead: [new Float32Array([10 ** ((-16.5 + 7) / 20)]), new Float32Array(1)] }, { lead: -16.5 }).pass); pass("stems: the lead may sit +3 dB over tolerance (guards win), not more");
  const w = M.composePiece(M.testMaterial(M.VOCAB.world, { bars: 4 })), wr = M.renderPiece(w, SR), g = M.guardReport(wr, SR, wr.L.length / SR);
  assert(Number.isFinite(g.lufs) && g.ghost.windows > 0); pass(`guards run on a 7/8 score (${g.ghost.windows} windows)`); }

// 10. Novelty: the copy Alex heard scores as a copy; the shipped demos stay apart; a reused fragment fails.
{ const d = M.novelty(M.daylightCopy(), M.DEMOS);
  assert(!d.pass && d.worst.name.startsWith("launchLofi") && d.worst.score > 0.6, `daylight copy scored ${d.worst.score} vs ${d.worst.name}`);
  pass(`novelty: Daylight vs ${d.worst.name} = ${d.worst.score} (threshold ${d.threshold}): FAIL, as Alex heard it`);
  let worst = { score: 0 };
  for (const n of Object.keys(M.DEMOS)) { const fam = Object.values(M.DEMO_FAMILIES).find((f) => f.includes(n)) ?? [n], v = M.novelty(M.DEMOS[n](), M.DEMOS, fam); assert(v.pass, `${n} vs ${v.worst.name} ${v.worst.score}`); if (v.worst.score > worst.score) worst = { ...v.worst, of: n }; }
  pass(`novelty: every demo vs every other demo passes (closest: ${worst.of} vs ${worst.name} ${worst.score})`);
  const quoted = M.composePiece({ ...M.testMaterial(M.VOCAB.playful, { bars: 4 }), sections: [{ kind: "hook", bars: 2, harmony: ["c0"], groove: null, lead: ["G5:1 B5:.5 C6:.5 B5:1 G5:1", "E5:1 G5:.5 A5:.5 G5:1 E5:1"] }] });
  const src = M.composePiece({ ...M.testMaterial(M.VOCAB.playful, { bars: 4 }), sections: [{ kind: "hook", bars: 2, harmony: ["c0"], groove: null, lead: ["D5:1 F#5:.5 G5:.5 F#5:1 D5:1", "B4:1 D5:.5 E5:.5 D5:1 B4:1"] }] });
  const r = M.novelty(quoted, { src: () => src }); assert(!r.pass && r.rows[0].reusedFragments > 0, "a transposed quote must be caught");
  pass(`novelty: a transposed 6-note quote of a shipped line fails (${r.rows[0].reusedFragments} reused fragments)`); }

console.log(`music unit: ${ok.length} checks PASS in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
