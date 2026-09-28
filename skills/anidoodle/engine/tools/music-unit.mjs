#!/usr/bin/env node
// Music unit test.   node tools/music-unit.mjs
// Asserts: the approved launch score is bit-identical (md5); a bar that doesn't add up throws, the
// last one too; the stem meter passes the balanced launch mix and catches a sub 9 dB hot that LUFS
// alone passes; a seamless loop; a film's audio is exactly its length; the key check accepts a
// heard tonic and still flags a wrong key; the guards run; and the novelty gate hears a transposed
// copy of a shipped score and a quoted melody, while the shipped pieces stay apart.
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
const SR = 24000;

// 1. The approved launch score: bit-identical.
const LAUNCH3_MD5_48K = "d20789f2344e6fff0d2a380c7c7825d2";
const launch = M.renderPiece(M.launchLofi3(), 48000);
assert.equal(md5(launch), LAUNCH3_MD5_48K, "launchLofi3 audio changed");
{ const tp = M.truePeak([launch.L, launch.R]).dbtp, lu = M.loudness([launch.L, launch.R], 48000).integrated; assert(tp <= -1 && Math.abs(lu + 14) <= 1);
  pass(`launchLofi3 md5 ${LAUNCH3_MD5_48K} (48 kHz), ${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP`); }

// 2. A bar that doesn't add up throws, the last one too: a short final bar is a silent gap nobody wrote.
{ const o = { role: "bass", bpb: 4 };
  assert.throws(() => M.line(0, "C2:3", o), /sums to 3 beats.*"C2:3 r:1"/, "a one-bar C2:3 in 4/4 must throw");
  assert.throws(() => M.line(0, "C2:4 | C2:3", o), /bar 1 sums to 3/);
  assert.equal(M.line(0, "C2:3 r:1", o).length, 1);
  assert.equal(M.line(6, "C2:2", o).length, 1, "a line starting off the barline may fill to it");
  assert.equal(M.line(5, "C5:1", { ...o, hit: true }).length, 1, "a declared hit is one short bar on any beat");
  assert.throws(() => M.line(0, "C5:1 | C5:1", { ...o, hit: true }), /a hit is one bar/);
  for (const [k, f] of Object.entries(M.PIECES)) f(); // every shipped piece still writes its final rests
  pass("notation: a short final bar throws with the rest to write (C2:3 -> C2:3 r:1); hit: true for a sting; every shipped piece parses"); }

// 3. Stems: the balanced launch mix passes; a sub 9 dB hot still masters to -14 LUFS, and only the stem meter sees it.
{ const b = M.measureStems(M.launchLofi3(), SR); assert(b.pass); const w = b.rows.filter((x) => x.offDb !== null).reduce((a, x) => (Math.abs(x.offDb) > Math.abs(a.offDb) ? x : a));
  pass(`stems: the launch mix is within +-3 dB of its targets, worst ${w.id} ${w.offDb.toFixed(1)} dB`);
  const p = M.launchLofi3(), hot = { ...p, parts: p.parts.map((x) => (x.id === "sub" ? { ...x, gainDb: (x.gainDb ?? 0) + 9 } : x)) };
  const r = M.renderPiece(hot, SR), lu = M.loudness([r.L, r.R], SR).integrated, hb = M.measureStems(hot, SR), sub = hb.rows.find((x) => x.id === "sub");
  assert(Math.abs(lu + 14) <= 1 && !hb.pass && sub.offDb > 7, "the stem meter must flag a hot sub that LUFS passes");
  pass(`hot sub: mix ${lu.toFixed(1)} LUFS (passes), stem meter flags sub +${sub.offDb.toFixed(1)} dB`);
  const st = { lead: [new Float32Array([10 ** ((-16.5 + 5) / 20)]), new Float32Array(1)] };
  assert(M.stemBalance(st, { lead: -16.5 }).pass); assert(!M.stemBalance({ lead: [new Float32Array([10 ** ((-16.5 + 7) / 20)]), new Float32Array(1)] }, { lead: -16.5 }).pass);
  pass("stems: the lead may sit +3 dB over tolerance (guards win), not more"); }

// 4. A seamless loop: four bars of the launch groove as a plan.loop piece; the seam is an ordinary sample step.
{ const p = M.launchLofi3(), a = 8 * 4, z = 12 * 4, cut = (ns) => ns.filter((n) => n.t >= a && n.t < z).map((n) => ({ ...n, t: n.t - a, d: Math.min(n.d, z - n.t) }));
  const loop = { ...p, title: "loop", harmony: p.harmony.filter((c) => c.t >= a && c.t < z).map((c) => ({ ...c, t: c.t - a })), plan: { ...p.plan, loop: true, sections: [{ ...p.plan.sections[0], bars: 4 }] }, parts: p.parts.map((x) => ({ ...x, notes: cut(x.notes) })) };
  const lp = M.renderLoop(loop, SR), n = lp.L.length, steps = [];
  for (let i = 1; i < n; i += 3) steps.push(Math.abs(lp.L[i] - lp.L[i - 1])); steps.sort((x, y) => x - y);
  const p999 = steps[Math.floor(steps.length * 0.999)], seam = Math.max(Math.abs(lp.L[0] - lp.L[n - 1]), Math.abs(lp.R[0] - lp.R[n - 1]));
  assert(seam <= p999, `seam ${seam} > ${p999}`); assert.equal(md5(lp), md5(M.renderLoop(loop, SR)));
  pass(`loop: seam step ${seam.toFixed(4)} <= p99.9 ${p999.toFixed(4)}, deterministic`); }

// 5. A film's audio is exactly the film's length.
{ const a = M.filmAudio(M.launchLofi3(), 40)(16000); assert.equal(a[0].length, 40 * 16000); pass("filmAudio: exactly the film's length"); }

// 6. The key check: Db lydian whose notes lean on Ab (the same pitch set as Ab major), tonic ~12 % of note time, is accepted; a wrong key is flagged.
{ const lp = (key, mode, src) => ({ title: "k", seed: 1, tail: 1, harmony: [], plan: { style: "ambient", tempo: 70, meter: "4/4", sections: [{ id: "a", bars: 5, mood: "awe", key, mode, melody: ["stepwise"], dyn: [0.5, 0.5] }] }, parts: [{ id: "m", inst: "fmBell", role: "melody", notes: M.line(0, src, { role: "melody", bpb: 4 }) }] });
  const src = "Db4:2 Ab4:2 | Ab4:2 Eb4:2 | Eb4:1 F4:2 G4:1 | G4:1 Bb4:2 C5:1 | C5:1 Eb5:1 r:2";
  assert(M.detectMode(M.line(0, src, { role: "melody", bpb: 4 }), ["lydian", "major", "aeolian", "dorian", "mixolydian"])[0].tonic !== "Db", "fixture must fool the raw detector");
  assert.deepEqual(M.planProblems(lp("Db", "lydian", src)), []); assert(M.planProblems(lp("E", "major", src)).length > 0);
  for (const [k, f] of Object.entries(M.SHIPPED)) assert.deepEqual(M.planProblems(f()), [], `${k}: ${M.planProblems(f()).join("; ")}`);
  pass("key check: Db lydian leaning on Ab is accepted (scale fits, tonic heard); a wrong key is flagged; every shipped piece passes"); }

// 7. The guards run on a shipped piece.
{ const r = M.renderPiece(M.folkCalm(), SR), g = M.guardReport(r, SR, r.L.length / SR);
  assert(Number.isFinite(g.lufs) && g.ghost.windows > 0); pass(`guards run (${g.ghost.windows} ghost windows, ${g.lufs.toFixed(1)} LUFS)`); }

// 8. Novelty: a transposed copy of a shipped score fails; the shipped pieces stay apart; a quoted 6-note line fails.
{ const p = M.launchLofi3(), copy = { ...p, title: "copy", parts: p.parts.map((x) => ({ ...x, notes: x.notes.map((n) => (x.role === "drum" ? n : { ...n, p: n.p + 2 })) })) };
  const d = M.novelty(copy, M.SHIPPED);
  assert(!d.pass && d.worst.name.startsWith("launchLofi") && d.worst.score > 0.6, `transposed copy scored ${d.worst.score} vs ${d.worst.name}`);
  pass(`novelty: a transposed copy vs ${d.worst.name} = ${d.worst.score} (threshold ${d.threshold}): FAIL`);
  let worst = { score: 0 };
  for (const n of Object.keys(M.SHIPPED)) { const fam = Object.values(M.PIECE_FAMILIES).find((f) => f.includes(n)) ?? [n], v = M.novelty(M.SHIPPED[n](), M.SHIPPED, fam); assert(v.pass, `${n} vs ${v.worst.name} ${v.worst.score}`); if (v.worst.score > worst.score) worst = { ...v.worst, of: n }; }
  pass(`novelty: every shipped piece vs every other passes (closest: ${worst.of} vs ${worst.name} ${worst.score})`);
  const mel = (title, key, src) => ({ title, seed: 1, tail: 1, harmony: [{ t: 0, name: key }], plan: { style: "minimalist", tempo: 110, meter: "4/4", sections: [{ id: "a", bars: 2, mood: "curious", key, mode: "major", melody: ["hook"], dyn: [0.6, 0.6] }] }, parts: [{ id: "m", inst: "marimba", role: "melody", notes: M.line(0, src, { role: "melody", bpb: 4 }) }] });
  const quoted = mel("quote", "C", "G5:1 B5:.5 C6:.5 B5:1 G5:1 | E5:1 G5:.5 A5:.5 G5:1 E5:1"), orig = mel("src", "G", "D5:1 F#5:.5 G5:.5 F#5:1 D5:1 | B4:1 D5:.5 E5:.5 D5:1 B4:1");
  const r = M.novelty(quoted, { src: () => orig }); assert(!r.pass && r.rows[0].reusedFragments > 0, "a transposed quote must be caught");
  pass(`novelty: a transposed 6-note quote of a shipped line fails (${r.rows[0].reusedFragments} reused fragments)`); }

console.log(`music unit: ${ok.length} checks PASS in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
