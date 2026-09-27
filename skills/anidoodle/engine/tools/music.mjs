#!/usr/bin/env node
// Offline music renderer + meter. Renders a named piece to a 48 kHz 32-bit FLOAT WAV (no PCM16
// clipping on the way) and meters the DECODED file: integrated LUFS (BS.1770-4), LRA (EBU 3342),
// true peak (4x), onsets/s (spectral flux), spectral centroid; plus note-data numbers.
//
// <piece> is YOUR score, a module: path/to/score.ts#exportName (a Material, a Piece, or a function
// returning either); or the name of a shipped demo (listening references, never a film's score).
//
//   node tools/music.mjs vocab [style]              # the style vocabularies: palette, grooves, harmony, melody, arrangement
//   node tools/music.mjs novelty <piece>            # similarity to every shipped piece; FAILS above the threshold or on a reused fragment
//   node tools/music.mjs list                       # shipped demos and fixtures
//   node tools/music.mjs render <piece> <out.wav|out.mp3> [--seconds 45] [--flat] [--tempo 66] [--fit] [--loop] [--stems]
//   node tools/music.mjs stems <piece> [--seconds 45] [--fit]   # each part's stem RMS vs its target, flags > 3 dB off
//     (--fit uses fitScore: the piece's refit, e.g. lofiElectronic adds loop cycles so it still ends on its outro;
//      --loop renders a seamless loop, automatic for a plan.loop piece. LUFS alone once hid a sub 7-10 dB too hot:
//      balance a mix by its stems, then master.)
//   node tools/music.mjs meter <file.wav|file.mp4> [more files]
//   node tools/music.mjs samples <outdir>          # the whole deliverable set + meters.json + .m4a
//   node tools/music.mjs score <piece>                # the text score, bar by bar
//   node tools/music.mjs probe                      # piano realism probes
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const load = async () => {
  const r = await build({ entryPoints: [join(here, "../src/canvas-core/music/index.ts")], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
  return import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
};

/** A piece by demo name, or from a module: "path.ts#export" (default export if no #). Material is composed. */
const getPiece = async (M, ref) => {
  if (!ref) throw new Error("name a piece: path/to/score.ts#export, or a demo (node tools/music.mjs list)");
  const fromDemo = M.DEMOS[ref] ?? M.FIXTURES[ref];
  let v;
  if (fromDemo) v = fromDemo;
  else {
    const [file, exp = "default"] = ref.split("#");
    if (!existsSync(resolve(file))) throw new Error(`no demo or module "${ref}" (demos: node tools/music.mjs list)`);
    const r = await build({ entryPoints: [resolve(file)], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
    const mod = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
    v = mod[exp]; if (v === undefined) throw new Error(`${file} has no export "${exp}" (exports: ${Object.keys(mod).join(", ")})`);
  }
  const make = () => { const x = typeof v === "function" ? v() : v; return x && x.sections && x.chords ? M.composePiece(x) : x; };
  return { make, name: ref, demo: Boolean(fromDemo) };
};

export const writeWavFloat = (path, L, R, sr = SR) => {
  const n = L.length, data = Buffer.alloc(n * 8), h = Buffer.alloc(58);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write("RIFF", 0); h.writeUInt32LE(50 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(18, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.writeUInt16LE(0, 36);
  h.write("fact", 38); h.writeUInt32LE(4, 42); h.writeUInt32LE(n, 46); h.write("data", 50); h.writeUInt32LE(data.length, 54);
  writeFileSync(path, Buffer.concat([h, data]));
};
/** Decode ANY file through ffmpeg to float stereo 48 kHz: we meter what a player would decode. */
export const decode = (path) => {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-vn", "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
  const f = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
};

/** Independent cross-check: ffmpeg's own ebur128 summary (integrated, LRA, true peak). */
const ffmpegEbu = (path) => {
  const out = execFileSync("sh", ["-c", 'ffmpeg -hide_banner -nostats -i "$1" -vn -af ebur128=peak=true -f null - 2>&1', "sh", path], { encoding: "utf8", maxBuffer: 1 << 28 });
  const sum = out.slice(out.lastIndexOf("Summary:"));
  const g = (re) => { const m = re.exec(sum); return m ? Number(m[1]) : NaN; };
  return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) };
};
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");
const noteStats = (M, piece) => {
  const all = piece.parts.flatMap((p) => p.notes.filter((n) => n.role !== "drum"));
  const ps = all.map((n) => n.p), lo = Math.min(...ps), hi = Math.max(...ps);
  return { range: `${M.nameOf(lo)}-${M.nameOf(hi)}`, notes: all.length };
};
const onsetsFromData = (rendered) => {
  const ts = rendered.perf.parts.flatMap((p) => p.keys.map((k) => k.t)).sort((a, b) => a - b); let c = 0, last = -1;
  for (const t of ts) if (t - last > 0.03) { c++; last = t; } return c;
};

const renderOne = (M, spec) => {
  let piece = spec.make ? spec.make() : (M.DEMOS[spec.piece] ?? M.FIXTURES[spec.piece])();
  let tempo = spec.tempo ?? piece.plan.tempo;
  let form;
  if (spec.fit) { const f = M.fitScore(piece, spec.seconds); piece = f.piece; tempo = f.tempo; form = `${f.form}: ${f.piece.plan.sections.map((x) => x.id).join(", ")}`; }
  const opts = { seconds: spec.seconds, tempo };
  if (spec.flat) Object.assign(opts, { expressive: false, piano: M.PIANO_FLAT, flatVelocity: 0.6 });
  const loop = spec.loop || piece.plan.loop, go = () => (loop ? M.renderLoop(piece, SR) : M.renderPiece(piece, SR, opts));
  const t0 = Date.now(), r = go(), ms = Date.now() - t0;
  // determinism: a second render must be bit-identical
  const r2 = go(); let same = true; for (let i = 0; i < r.L.length; i += 7) if (r.L[i] !== r2.L[i] || r.R[i] !== r2.R[i]) { same = false; break; }
  return { r, piece, tempo, ms, deterministic: same, form };
};

const voicing = (M, piece, tempo, seconds, flat) => {
  // melody vs everything else, rendered separately, loudness difference in LU (both unmastered)
  const only = (roles) => ({ ...piece, parts: piece.parts.map((p) => ({ ...p, notes: p.notes.filter((n) => roles.includes(n.role)) })) });
  const base = { seconds, tempo, master: "none", ...(flat ? { expressive: false, piano: M.PIANO_FLAT, flatVelocity: 0.6 } : {}) };
  const a = M.renderPiece(only(["melody"]), SR, base), b = M.renderPiece(only(["accomp", "bass", "inner"]), SR, base);
  return M.loudness([a.L, a.R], SR).integrated - M.loudness([b.L, b.R], SR).integrated;
};

/** Per-note voicing: mean level (dB, from the piano's velocity->level law) of melody keys minus accompaniment keys. */
const noteVoicing = (r, piece) => {
  const lv = (v) => 20 * Math.log10(v < 0.6 ? Math.pow(v, 1.55) : Math.pow(0.6, 1.55) * Math.pow(v / 0.6, 0.9));
  const mel = [], acc = []; r.perf.parts.forEach((p, i) => { if (piece.parts[i].inst !== "piano") return; for (const k of p.keys) (k.role === "melody" ? mel : acc).push(lv(k.v)); });
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length; return mel.length && acc.length ? mean(mel) - mean(acc) : null;
};
const main = async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const M = await load();
  const flag = (k) => args.includes(k), val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
  if (cmd === "list") { console.log("demos (listening references and the novelty corpus, never a film's score):\n  " + Object.keys(M.DEMOS).join("\n  ") + "\nfixtures (tests):\n  " + Object.keys(M.FIXTURES).join("\n  ")); return; }
  if (cmd === "vocab") { printVocab(M, args[0]); return; }
  if (cmd === "calibrate") { calibrate(M); return; }
  if (cmd === "novelty") {
    const pc = await getPiece(M, args[0]), fam = Object.values(M.DEMO_FAMILIES).find((f) => f.includes(args[0])) ?? [args[0]];
    const v = M.novelty(pc.make(), M.DEMOS, fam, val("--threshold", undefined));
    console.log(`novelty: ${args[0]} vs ${v.rows.length} shipped pieces (fail above ${v.threshold}, or on any reused 6-note fragment)`);
    for (const r of v.rows.slice(0, 5)) console.log(`  ${r.name.padEnd(22)} ${r.score.toFixed(3)}  ${r.reusedFragments ? `REUSED ${r.reusedFragments} fragment(s)  ` : ""}${Object.entries(r.by).map(([k, x]) => `${k} ${x}`).join(" ")}`);
    console.log(v.pass ? "novelty PASS" : `novelty FAIL: too close to ${v.worst.name}. Change what the numbers point at (the rhythm of the lead, the groove, the chord colours, the form), not just the key.`);
    if (!v.pass) process.exitCode = 1; return;
  }
  if (cmd === "render") {
    const [name, out] = args, pc = await getPiece(M, name); const { r, tempo, ms, deterministic, piece } = renderOne(M, { make: pc.make, seconds: val("--seconds", undefined), tempo: val("--tempo", undefined), flat: flag("--flat"), fit: flag("--fit") });
    const mp3 = out.endsWith(".mp3"), wav = mp3 ? out.replace(/\.mp3$/, ".wav") : out;
    writeWavFloat(wav, r.L, r.R);
    if (mp3) { execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "256k", out]); unlinkSync(wav); }
    const m = M.measure(decode(out), SR);
    console.log(JSON.stringify({ file: out, tempo, renderMs: ms, deterministic, gainDb: r.gainDb, loopS: r.loopS, problems: M.planProblems(piece), ...m, shortTerm: undefined }, null, 1));
    if (flag("--stems")) printStems(M, piece, tempo, val("--seconds", undefined));
    return;
  }
  if (cmd === "stems") {
    const [name] = args; let piece = (await getPiece(M, name)).make(), tempo = piece.plan.tempo, seconds = val("--seconds", undefined);
    if (flag("--fit")) { const f = M.fitScore(piece, seconds); piece = f.piece; tempo = f.tempo; }
    printStems(M, piece, tempo, seconds); return;
  }
  if (cmd === "meter") { for (const f of args) { const m = M.measure(decode(f), SR), ff = ffmpegEbu(f); console.log(basename(f), `LUFS ${fmt(m.lufs)} (ffmpeg ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ffmpeg ${fmt(ff.LRA)}) TP ${fmt(m.dbtp)} dBTP (ffmpeg ${fmt(ff.TP)}) onsets/s ${fmt(m.onsetsPerS, 2)} centroid ${fmt(m.centroidHz, 0)} Hz (energy-wtd ${fmt(m.centroidEnergyHz, 0)}) dur ${fmt(m.durationS, 2)} lastOnset ${fmt(m.lastOnsetS, 2)}`); } return; }
  if (cmd === "score") { console.log(M.scoreText((await getPiece(M, args[0])).make())); return; }
  if (cmd === "probe") { console.log(JSON.stringify(probe(M), null, 1)); return; }
  if (cmd === "samples") {
    const dir = resolve(args[0]);
    const set = [
      { file: "piano-8s", piece: "pianoPhrase8", seconds: 8, tempo: 66, emotion: "tender" },
      { file: "piano-flat-baseline-8s", piece: "pianoPhrase8", seconds: 8, tempo: 66, flat: true, emotion: "(contrast: MIDI-flat)" },
      { file: "nocturne-45s", piece: "nocturne", seconds: 45, fit: true, emotion: "tender -> swelling -> hush" },
      { file: "sampler-musicbox-joy-8s", piece: "musicBoxJoy", seconds: 8, emotion: "joy" },
      { file: "sampler-minor-piano-melancholy-8s", piece: "minorPianoMelancholy", seconds: 8, emotion: "melancholy" },
      { file: "sampler-cinematic-awe-8s", piece: "cinematicAwe", seconds: 8, emotion: "awe" },
      { file: "sampler-chiptune-playful-8s", piece: "chiptunePlayful", seconds: 8, emotion: "playful" },
      { file: "sampler-lofi-nostalgic-8s", piece: "lofiNostalgic", seconds: 8, emotion: "nostalgic" },
      { file: "sampler-marimba-curious-8s", piece: "marimbaCurious", seconds: 8, emotion: "curious" },
      { file: "sampler-harp-tender-8s", piece: "harpTender", seconds: 8, emotion: "tender (lullaby)" },
      { file: "sampler-guitar-wistful-8s", piece: "guitarWistful", seconds: 8, emotion: "wistful" },
      { file: "sampler-celesta-wonder-8s", piece: "celestaWonder", seconds: 8, emotion: "wonder" },
      { file: "sampler-bells-epiano-hopeful-8s", piece: "bellsHopeful", seconds: 8, emotion: "hopeful" },
      { file: "sampler-drive-electronic-8s", piece: "driveElectronic", seconds: 8, emotion: "drive / energy" },
      { file: "sampler-folk-calm-8s", piece: "folkCalm", seconds: 8, emotion: "calm (pastoral)" },
      { file: "fit-theme-15s", piece: "nocturne", seconds: 15, fit: true, emotion: "tender (auto short form)" },
      { file: "fit-theme-60s", piece: "nocturne", seconds: 60, fit: true, emotion: "tender -> swelling -> hush" },
      { file: "fit-theme-180s", piece: "nocturne", seconds: 180, fit: true, emotion: "tender -> swelling -> hush", m4aOnly: true, noMasking: true },
      { file: "fixtures/ghost-fixture-HATED", piece: "ghostFixture", seconds: 35, emotion: "(hated fixture: must FAIL the ghost guard)" },
    ].filter((s) => !args[1] || s.file.includes(args[1]));
    mkdirSync(join(dir, "fixtures"), { recursive: true });
    const results = [];
    for (const s of set) {
      const { r, piece, tempo, ms, deterministic, form } = renderOne(M, s);
      const g = M.guardReport(r, SR, s.seconds, { masking: !s.noMasking });
      const wav = join(dir, s.file + ".wav"); writeWavFloat(wav, r.L, r.R);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", "192k", join(dir, s.file + ".m4a")]);
      const m = M.measure(decode(wav), SR), ff = ffmpegEbu(wav), mm = M.measure(decode(join(dir, s.file + ".m4a")), SR);
      if (s.m4aOnly) unlinkSync(wav);
      const hasPiano = piece.parts.some((p) => p.inst === "piano" && p.notes.some((n) => n.role === "melody"));
      const res = { file: s.file, emotion: s.emotion, form: form ?? "as written", sections: piece.plan.sections.map((x) => x.id).join(","), guards: g, piece: piece.title, style: piece.plan.style, key: piece.plan.sections.map((x) => `${x.key} ${x.mode} (${Array.isArray(x.mood) ? x.mood.slice(0, 2).join("+") : x.mood})`).join(" / "), meter: piece.plan.meter, tempo: +tempo.toFixed(2), renderMs: ms, deterministic,
        gainDb: +r.gainDb.toFixed(2), master: r.masterMode, lufs: m.lufs, ffmpegLufs: ff.I, lra: m.lra, ffmpegLra: ff.LRA, dbtp: m.dbtp, ffmpegTp: ff.TP, samplePeakDb: m.samplePeakDb, onsetsPerS: m.onsetsPerS, dataOnsetsPerS: onsetsFromData(r) / m.durationS,
        centroidHz: m.centroidHz, centroidEnergyHz: m.centroidEnergyHz, durationS: m.durationS, lastOnsetDetectedS: m.lastOnsetS, lastOnsetDataS: r.perf.lastOnset, ...noteStats(M, piece),
        meanMelodyLeadMs: r.perf.meanLeadMs, voicingNoteDb: hasPiano ? noteVoicing(r, piece) : null, pedalChanges: piece.parts.some((p) => p.inst === "piano") && !s.flat ? r.perf.pedal.length : 0, voicingLU: hasPiano ? voicing(M, piece, tempo, s.seconds, s.flat) : null, m4a: { lufs: mm.lufs, dbtp: mm.dbtp }, problems: M.planProblems(piece),
        shortTerm: m.shortTerm.filter((_, i) => i % 10 === 0).map((x) => +x.toFixed(1)) };
      results.push(res);
      console.log(`${s.file}: LUFS ${fmt(m.lufs)} (ff ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ff ${fmt(ff.LRA)}) TP ${fmt(m.dbtp)} (ff ${fmt(ff.TP)}) onsets/s ${fmt(m.onsetsPerS, 2)} [data ${fmt(res.dataOnsetsPerS, 2)}] centroid ${fmt(m.centroidHz, 0)} Hz range ${res.range} tempo ${fmt(tempo, 1)} voicing ${fmt(res.voicingLU)} LU / per-note ${fmt(res.voicingNoteDb)} dB lead ${fmt(res.meanMelodyLeadMs)} ms render ${ms} ms det ${deterministic} problems ${res.problems.length} | ghost ${g.ghost.pass ? "PASS" : "FAIL"} (${g.ghost.failures}/${g.ghost.windows}) reverb ${g.reverb.pass ? "PASS" : "FAIL"} ${fmt(g.reverb.worstDb)} dB masking ${g.masking ? `${g.masking.pass ? "PASS" : "FAIL"} ${Math.round(g.masking.shareOfBarsClear * 100)}%` : "n/a"} | form ${form ?? "-"}`);
    }
    const ref = join(here, "../../../anidoodle-research/refs/kevin-ngo-piano/film.mp4");
    const refPath = [ref, resolve(process.env.HOME ?? "", "CascadeProjects/Prompts/Claude-Skills/anidoodle-research/refs/kevin-ngo-piano/film.mp4")].find(existsSync);
    let reference = null;
    if (refPath) { const dec = decode(refPath), m = M.measure(dec, SR), ff = ffmpegEbu(refPath), gh = M.ghostCheck(dec, SR); reference = { ghost: { pass: gh.pass, failures: gh.failures, windows: gh.windows.map((w) => ({ from: w.from, onsetsPerBeat: +w.onsetsPerBeat.toFixed(2), sustainedShare: +w.sustainedShare.toFixed(2) })) }, file: "kevin-ngo-piano/film.mp4 (reference, measurement only)", lufs: m.lufs, ffmpegLufs: ff.I, lra: m.lra, ffmpegLra: ff.LRA, dbtp: m.dbtp, onsetsPerS: m.onsetsPerS, centroidHz: m.centroidHz, centroidEnergyHz: m.centroidEnergyHz, durationS: m.durationS, lastOnsetDetectedS: m.lastOnsetS, shortTerm: m.shortTerm.filter((_, i) => i % 10 === 0).map((x) => +x.toFixed(1)) };
      console.log(`REFERENCE ghost ${gh.pass ? "PASS" : "FAIL"}: LUFS ${fmt(m.lufs)} (ff ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ff ${fmt(ff.LRA)}) onsets/s ${fmt(m.onsetsPerS, 2)} centroid ${fmt(m.centroidHz, 0)} (energy ${fmt(m.centroidEnergyHz, 0)})`); }
    const prev = existsSync(join(dir, "meters.json")) && args[1] ? JSON.parse(readFileSync(join(dir, "meters.json"), "utf8")) : null;
    const merged = prev ? { ...prev, results: [...prev.results.filter((x) => !results.some((y) => y.file === x.file)), ...results], reference: reference ?? prev.reference } : { generated: "tools/music.mjs samples", sampleRate: SR, results, reference, probe: probe(M) };
    writeFileSync(join(dir, "meters.json"), JSON.stringify(merged, null, 1));
  }
};

const calibrate = (M) => {
  const trim = {}, fix = {};
  for (const v of Object.values(M.VOCAB)) {
    if (v.calibrated) continue; trim[v.id] = {}; fix[v.id] = {}; M.VOCAB_TARGET_FIX[v.id] = {};
    for (let pass = 0; pass < 3; pass++) {
      M.VOCAB_TRIM[v.id] = trim[v.id];
      const b = M.measureStems(M.composePiece(M.testMaterial(v)), STEM_SR);
      for (const r of b.rows) if (r.offDb !== null && Number.isFinite(r.offDb)) trim[v.id][r.id] = +Math.max(-12, Math.min(12, (trim[v.id][r.id] ?? 0) - r.offDb)).toFixed(1); // capped: past 12 dB the gain is not the problem
      if (pass === 2) { for (const r of b.rows) if (r.offDb !== null && Math.abs(r.offDb) > 1) fix[v.id][r.id] = +r.offDb.toFixed(1);
        console.log(v.id.padEnd(14), b.rows.filter((r) => r.offDb !== null).map((r) => `${r.id} ${r.offDb >= 0 ? "+" : ""}${r.offDb.toFixed(1)}`).join("  ")); }
    }
  }
  const file = join(here, "../src/canvas-core/music/vocabTrim.ts"), head = readFileSync(file, "utf8").split("export const VOCAB_TRIM")[0], j = (x) => JSON.stringify(x, null, 1).replace(/"(\w+)":/g, "$1:");
  writeFileSync(file, `${head}export const VOCAB_TRIM: Record<string, Partial<Record<Slot, number>>> = ${j(trim)};\n/** Where a 12 dB trim could not reach the target (long-decaying plucks read low as active RMS), the target moves to where the voice sits. */\nexport const VOCAB_TARGET_FIX: Record<string, Partial<Record<Slot, number>>> = ${j(fix)};\n`);
  console.log(`wrote ${file}`);
};

const printVocab = (M, id) => {
  if (!id) { for (const v of Object.values(M.VOCAB)) console.log(`${v.id.padEnd(15)} ${v.name}: ${v.atmosphere}\n${"".padEnd(16)}grooves: ${v.grooves.join(", ") || "none (no drums)"} | moods: ${v.moods.join(", ")} | ${v.tempo.join("-")} bpm ${v.meters.join(" ")}`);
    console.log("\ngroove families:"); for (const [k, d] of Object.entries(M.GROOVE_FAMILIES)) console.log(`  ${k.padEnd(10)} ${d}`);
    console.log("\nsection kinds:"); for (const [k, d] of Object.entries(M.KINDS)) console.log(`  ${k.padEnd(10)} ${d.what}`); return; }
  const v = M.VOCAB[id]; if (!v) throw new Error(`no style "${id}" (have: ${Object.keys(M.VOCAB).join(", ")})`);
  console.log(`${v.name} (${v.id}): ${v.atmosphere}\ntempo ${v.tempo.join("-")} bpm, meters ${v.meters.join(" ")}, swing ${v.swing.join("-")}, moods ${v.moods.join(", ")}`);
  console.log("palette (slot: instrument, gain dB, stem target):"); for (const [slot, x] of Object.entries(v.palette)) console.log(`  ${slot.padEnd(8)} ${x.inst.padEnd(10)} ${String(x.gainDb).padStart(5)}  ${v.stemTargets[slot] ?? "-"} dB${Object.keys(v.alternates[slot] ?? {}).length ? `   alternates: ${Object.keys(v.alternates[slot]).join(", ")}` : ""}`);
  console.log(`stem targets ${v.calibrated ? "calibrated on a listened score" : "are starting numbers (uncalibrated: flags are advisory until a human listens)"}`);
  console.log(`grooves: ${v.grooves.map((g) => `${g} (${M.GROOVE_FAMILIES[g]})`).join("\n         ") || "none"}`);
  for (const [k, x] of Object.entries(v.harmony)) console.log(`harmony.${k}: ${Array.isArray(x) ? x.join(", ") : x}`);
  for (const [k, x] of Object.entries(v.melody)) console.log(`melody.${k}: ${x}`);
  for (const [k, x] of Object.entries(v.arrangement)) console.log(`arrangement.${k}: ${x}`);
  console.log(`avoid: ${v.avoid}`);
};

/** Stem balance: each part's unmastered stem RMS (active samples) vs piece.stemTargets. Measured at 24 kHz, as the targets were. */
const STEM_SR = 24000;
const printStems = (M, piece, tempo, seconds) => {
  const b = M.measureStems(piece, STEM_SR, { tempo, seconds });
  console.log(`stem balance: ${piece.title} (unmastered stem RMS over active samples vs target, tolerance +-${b.tolDb} dB)`);
  for (const r of b.rows) console.log(`  ${r.id.padEnd(9)} ${fmt(r.rmsDb).padStart(6)} dB  ${r.targetDb === null ? "(no target)" : `target ${fmt(r.targetDb).padStart(6)}  off ${(r.offDb >= 0 ? "+" : "") + fmt(r.offDb)}  ${r.ok ? "ok" : `FLAG: ${r.offDb > 0 ? "too hot" : "too quiet"}`}`}`);
  if (!Object.keys(piece.stemTargets ?? {}).length) console.log("  (this piece declares no stemTargets)");
  const cal = M.VOCAB[piece.plan.style]?.calibrated !== false;
  console.log(b.pass ? "stems PASS" : `stems ${cal ? "FAIL" : "OFF TARGET (advisory: this style's targets are uncalibrated starting numbers)"}: fix the part gains (Material.levels), then master. LUFS alone once hid a sub 7-10 dB too hot.`);
  if (!b.pass && cal) process.exitCode = 1;
  return b;
};

/** Piano realism probes (ADVISORY 4.1): single notes, matched loudness where it matters. */
const probe = (M) => {
  const note = (p, v, opts, dur = 3) => { const keys = [{ t: 0.05, off: dur, p, v }]; const { L, R } = M.renderPiano(keys, [], SR, Math.round((dur + 0.5) * SR), opts, 1); return [L, R]; };
  const cents = (arr) => arr;
  const vels = [0.15, 0.3, 0.5, 0.7, 0.9];
  const out = {};
  for (const [label, opts] of [["real", M.PIANO_REAL], ["flat", M.PIANO_FLAT]]) {
    const cs = vels.map((v) => M.centroid(note(60, v, opts, 1.5), SR).energyWeighted);
    const ls = vels.map((v) => M.loudness(note(60, v, opts, 1.5), SR).integrated);
    // decay: RMS in 50 ms windows of a held C4 (mf); slope early (0.1-0.6 s) vs late (2-4 s)
    const [L] = note(60, 0.6, opts, 6), w = Math.round(0.05 * SR), env = [];
    for (let a = 0; a + w < L.length; a += w) { let e = 0; for (let i = a; i < a + w; i++) e += L[i] * L[i]; env.push(10 * Math.log10(e / w + 1e-20)); }
    const slope = (t0, t1) => (env[Math.round(t1 / 0.05)] - env[Math.round(t0 / 0.05)]) / (t1 - t0);
    // beating: std-dev of the late envelope after removing the linear trend (dB)
    const late = env.slice(Math.round(2 / 0.05), Math.round(5 / 0.05)), k = late.length, mx = (k - 1) / 2, my = late.reduce((a, b) => a + b, 0) / k;
    let sxy = 0, sxx = 0; late.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; }); const b1 = sxy / sxx;
    const resid = Math.sqrt(late.reduce((a, y, i) => a + (y - (my + b1 * (i - mx))) ** 2, 0) / k);
    const rank = (a) => a.map((x) => a.filter((y) => y < x).length);
    const rc = rank(cs), rv = rank(vels), n = vels.length, d2 = rc.reduce((a, r, i) => a + (r - rv[i]) ** 2, 0), rho = 1 - (6 * d2) / (n * (n * n - 1));
    out[label] = { centroidByVelocityHz: cs.map((x) => Math.round(x)), loudnessByVelocityLUFS: ls.map((x) => +x.toFixed(1)), spearmanCentroidVsVelocity: new Set(cs.map((x) => Math.round(x))).size === 1 ? "n/a (spectrum does not change with velocity)" : +rho.toFixed(2), decayEarlyDbPerS: +slope(0.1, 0.6).toFixed(1), decayLateDbPerS: +slope(2, 4).toFixed(1), lateEnvelopeWobbleDb: +resid.toFixed(2) };
  }
  out.inharmonicityB = Object.fromEntries([28, 40, 48, 60, 72, 84, 96].map((m) => [M.nameOf(m), +M.inharmonicityB(m).toExponential(2)]));
  void cents;
  return out;
};

main().catch((e) => { console.error(e); process.exit(1); });
