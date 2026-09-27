#!/usr/bin/env node
// Lo-fi electronic unit test: the style API, the approved launch score, the loop and the meters.
//   node tools/music-unit.mjs
// Asserts: launchLofi3 audio unchanged (md5), determinism (same md5 twice), no clipping (true peak
// <= -1 dBTP), loudness -14 LUFS +-1, stem balance within +-3 dB of target, the stem meter catches a
// sub 9 dB hot that LUFS alone passes, a seamless loop seam, and a film fit that ends on its phrase.
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

// 1. The approved launch score is bit-identical to the hand-written v6 it was refactored from.
const LAUNCH3_MD5_48K = "d20789f2344e6fff0d2a380c7c7825d2";
const launch = M.renderPiece(M.launchLofi3(), 48000);
assert.equal(md5(launch), LAUNCH3_MD5_48K, "launchLofi3 audio changed");
pass(`launchLofi3 md5 ${LAUNCH3_MD5_48K} (48 kHz, ${launch.L.length} frames)`);

// 2. Determinism + master: the example loop and arranged piece, the launch score.
const SR = 48000, loopA = M.renderLoop(M.lofiDaylightLoop(), SR), loopB = M.renderLoop(M.lofiDaylightLoop(), SR);
assert.equal(md5(loopA), md5(loopB), "loop render not deterministic");
pass(`lofiDaylightLoop deterministic, md5 ${md5(loopA)} twice`);
const arranged = M.renderPiece(M.lofiDaylight(), SR);
assert.equal(md5(arranged), md5(M.renderPiece(M.lofiDaylight(), SR)), "arranged render not deterministic");
pass(`lofiDaylight deterministic, md5 ${md5(arranged)} twice`);
for (const [name, r] of [["launchLofi3", launch], ["lofiDaylightLoop", loopA], ["lofiDaylight", arranged]]) {
  const tp = M.truePeak([r.L, r.R]).dbtp, lu = M.loudness([r.L, r.R], SR).integrated;
  assert(tp <= -1, `${name}: true peak ${tp.toFixed(2)} dBTP > -1`);
  assert(Math.abs(lu + 14) <= 1, `${name}: ${lu.toFixed(2)} LUFS, want -14 +-1`);
  pass(`${name}: ${lu.toFixed(2)} LUFS, true peak ${tp.toFixed(2)} dBTP`);
}

// 3. Stem balance: every part within 3 dB of its target (24 kHz, as the targets were measured).
for (const name of ["launchLofi3", "lofiDaylightLoop", "lofiDaylight"]) {
  const b = M.measureStems(M.PIECES[name](), 24000);
  assert(b.pass, `${name}: stems off target: ${b.rows.filter((r) => !r.ok).map((r) => `${r.id} ${r.offDb.toFixed(1)}`).join(", ")}`);
  const worst = b.rows.filter((r) => r.offDb !== null).reduce((a, r) => (Math.abs(r.offDb) > Math.abs(a.offDb) ? r : a));
  pass(`${name}: stems within +-3 dB (worst ${worst.id} ${worst.offDb >= 0 ? "+" : ""}${worst.offDb.toFixed(1)} dB)`);
}

// 4. The lesson: a sub 9 dB hot still masters to -14 LUFS; only the stem meter sees it.
{ const hot = M.lofiElectronic({ ...M.lofiDaylightLoopSpec(), levels: { ...M.lofiDaylightLoopSpec().levels, sub: 3 } });
  const r = M.renderLoop(hot, 24000), lu = M.loudness([r.L, r.R], 24000).integrated, b = M.measureStems(hot, 24000), sub = b.rows.find((x) => x.id === "sub");
  assert(Math.abs(lu + 14) <= 1 && !b.pass && !sub.ok && sub.offDb > 7, "the stem meter must flag a hot sub that LUFS passes");
  pass(`hot sub: mix ${lu.toFixed(1)} LUFS (passes), stem meter flags sub +${sub.offDb.toFixed(1)} dB`); }

// 5. The loop seam: the jump from the last sample to the first is an ordinary step, not a click.
{ const n = loopA.L.length, steps = []; for (let i = 1; i < n; i += 3) steps.push(Math.abs(loopA.L[i] - loopA.L[i - 1])); steps.sort((a, b) => a - b);
  const p999 = steps[Math.floor(steps.length * 0.999)], seam = Math.max(Math.abs(loopA.L[0] - loopA.L[n - 1]), Math.abs(loopA.R[0] - loopA.R[n - 1]));
  assert.equal(n, Math.round(30 * SR), "96 bpm x 12 bars = 30 s exactly"); assert(seam <= p999, `seam step ${seam} > p99.9 ${p999}`);
  pass(`loop seam step ${seam.toFixed(4)} <= p99.9 step ${p999.toFixed(4)}; length ${n / SR} s`); }

// 6. Style API: landing, film fit ends on the phrase, no ePiano, bar-checked notation.
{ const p3 = M.launchLofi3(); assert.equal(p3.harmony[26].name, "Cmaj9", "bar 26 (the claim) must land on Cmaj9"); assert.equal(p3.plan.style, "lofiElectronic");
  const d = M.lofiDaylight(), drop = d.arrangement.find((a) => a.kind === "drop"); assert.equal(d.harmony[drop.from].name, "Dmaj9", "the drop lands home");
  pass("landing: launch bar 26 = Cmaj9, Daylight drop = Dmaj9"); }
for (const secs of [45, 60, 95]) {
  const f = M.fitScore(M.lofiDaylight(), secs), perf = M.perform(f.piece, f.tempo, { expressive: true }), p = f.piece, lastBar = p.harmony[p.harmony.length - 1];
  const leadNotes = p.parts.find((x) => x.id === "lead").notes, final = leadNotes[leadNotes.length - 1];
  assert.equal(lastBar.name, "Dmaj9"); assert.equal(M.nameOf(final.p), "D5"); assert.equal(f.form, "full");
  assert(Math.abs(perf.lastOnset - (secs - p.tail)) < 0.05, `fit ${secs}: last onset ${perf.lastOnset} vs ${secs - p.tail}`);
  assert(f.tempo >= 96 * 0.9 && f.tempo <= 96 * 1.1, `fit ${secs}: tempo ${f.tempo}`);
  pass(`fit ${secs} s: ${p.plan.sections[0].bars} bars at ${f.tempo.toFixed(1)} bpm, last note D5 on Dmaj9 at ${perf.lastOnset.toFixed(2)} s`);
}
{ const a = M.filmAudio(M.lofiDaylight(), 40)(16000); assert.equal(a[0].length, 40 * 16000); pass("filmAudio: exactly the film's length"); }
for (const name of ["launchLofi3", "lofiDaylightLoop", "lofiDaylight"]) assert(!M.PIECES[name]().parts.some((p) => ["ePiano", "vinyl"].includes(p.inst)), `${name}: no ePiano, no vinyl`);
assert.throws(() => M.lofiElectronic({ ...M.lofiDaylightLoopSpec(), progression: [{ ...M.DAYLIGHT_PROGRESSION[0], hook: "D5:5" }, ...M.DAYLIGHT_PROGRESSION.slice(1)] }), /beats/);
assert.deepEqual(M.planProblems(M.lofiDaylight()), []); assert.deepEqual(M.planProblems(M.lofiDaylightLoop()), []);
pass("no ePiano/vinyl; a wrong bar throws; planProblems clean");
console.log(`music unit: ${ok.length} checks PASS in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
