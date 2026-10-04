// Host-side sound packs: verify the pinned FLAC bytes, decode once, then hand PCM to the engine.
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export const soundIds = (piece) => piece.legacy ? [] : [...new Set(piece.parts.filter((p) => p.notes.length && p.opts?.sampled !== false).map((p) => typeof p.opts?.variant === "string" && p.opts.variant ? `${p.inst}.${p.opts.variant}` : p.inst))];
const decodeFlac = (root, id, zone) => {
  if (typeof zone.file !== "string" || isAbsolute(zone.file) || !zone.file.endsWith(".flac")) throw new Error(`${id}: invalid FLAC path`);
  const file = realpathSync(resolve(root, zone.file)); if (!file.startsWith(root + sep)) throw new Error(`${id}: zone escapes pack: ${zone.file}`);
  const bytes = readFileSync(file), sha = createHash("sha256").update(bytes).digest("hex");
  if (typeof zone.sha256 !== "string" || sha !== zone.sha256.toLowerCase()) throw new Error(`${id}: sha256 mismatch: ${zone.file}`);
  // Count frames so ffprobe consumes the complete verified buffer rather than closing stdin early.
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-f", "flac", "-i", "pipe:0", "-count_frames", "-show_streams", "-of", "json"], { input: bytes, encoding: "utf8", maxBuffer: 1 << 20 })).streams;
  if (info.length !== 1 || info[0].codec_name !== "flac" || Number(info[0].sample_rate) !== 48000 || Number(info[0].bits_per_raw_sample) !== 24 || info[0].channels !== zone.channels || ![1, 2].includes(zone.channels)) throw new Error(`${id}: expected 48 kHz 24-bit FLAC with ${zone.channels} channels: ${zone.file}`);
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-f", "flac", "-i", "pipe:0", "-vn", "-f", "f32le", "-acodec", "pcm_f32le", "-ar", "48000", "pipe:1"], { input: bytes, maxBuffer: 1 << 28 });
  if (!Number.isInteger(zone.frames) || zone.frames < 1 || pcm.length !== zone.frames * zone.channels * 4) throw new Error(`${id}: frame count mismatch: ${zone.file}`);
  const channels = Array.from({ length: zone.channels }, () => new Float32Array(zone.frames));
  for (let i = 0; i < zone.frames; i++) for (let c = 0; c < zone.channels; c++) { const v = pcm.readFloatLE((i * zone.channels + c) * 4); if (!Number.isFinite(v)) throw new Error(`${id}: non-finite PCM: ${zone.file}`); channels[c][i] = v; }
  return channels;
};
export const loadBanks = (M, dir, ids) => {
  if (!dir) return;
  const root = realpathSync(dir), manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
  if (manifest.pack !== "anidoodle-sounds" || manifest.version !== 1 || manifest.sampleRate !== 48000 || !manifest.instruments || typeof manifest.instruments !== "object" || Array.isArray(manifest.instruments)) throw new Error(`invalid sound pack manifest: ${dir}`);
  for (const id of ids) {
    if (!Object.hasOwn(manifest.instruments, id)) continue;
    const entry = manifest.instruments[id]; if (!entry) continue;
    const [inst, ...variant] = id.split("."); if (M.bankFor(inst, variant.join(".") || undefined)) continue;
    if (!Array.isArray(entry.zones) || !entry.zones.length) throw new Error(`${id}: empty sample bank`);
    // Validate the playable metadata before starting ffmpeg, including future sustained zones.
    if (entry.kind === "sustained") throw new Error(`${id}: ${entry.zones.some((z) => !z.loop) ? "sustained zone without a loop" : "sustained banks are not supported in pack version 1"}`);
    const zones = entry.zones.map((zone) => ({ zone, channels: decodeFlac(root, id, zone) }));
    M.registerBank(id, { entry, zones });
    const calibrated = M.calibrateBank(id);
    console.log(`calibration ${id}: median trim ${calibrated.trim[0].medianDb.toFixed(2)} dB; zone | layer | measured dB | modeled dB | requested dB | applied dB | deviation dB`);
    for (const t of calibrated.trim) console.log(`  ${t.file} | ${t.layer} | ${t.measuredDb.toFixed(2)} | ${t.modeledDb.toFixed(2)} | ${t.requestedDb.toFixed(2)} | ${t.correctionDb.toFixed(2)} | ${(t.correctionDb - t.medianDb).toFixed(2)}${Math.abs(t.correctionDb) > 9 ? " | FLAG applied >9 dB (includes instrument trim)" : ""}${Math.abs(t.requestedDb - t.medianDb) > 9 ? " | FLAG >9 dB deviation: capped, inspect zone/reference" : ""}${t.boostLimited ? " | prefer louder layer" : ""}`);
  }
  if (manifest.rooms !== undefined && (!manifest.rooms || typeof manifest.rooms !== "object" || Array.isArray(manifest.rooms))) throw new Error("invalid sound pack rooms");
  for (const [id, entry] of Object.entries(manifest.rooms ?? {})) {
    if (M.roomFor(id)?.sha256 === entry.sha256?.toLowerCase() && M.roomFor(id)?.rt60 === entry.rt60 && M.roomFor(id)?.L.length === entry.frames && (M.roomFor(id)?.directFrames ?? 0) === (entry.directFrames ?? 0)) continue;
    const channels = decodeFlac(root, `room ${id}`, entry);
    M.registerRoom(id, { L: channels[0], R: channels[entry.channels - 1], rt60: entry.rt60, sha256: entry.sha256, directFrames: entry.directFrames });
  }
};
export const printSounds = (M, piece) => {
  const recorded = [], modeled = [];
  for (const p of piece.parts) {
    const b = !piece.legacy && p.opts?.sampled !== false && M.bankFor(p.inst, typeof p.opts?.variant === "string" ? p.opts.variant : undefined);
    (b ? recorded : modeled).push(`${p.id} (${b ? b.id + (b.entry.sparse ? `, sparse, max shift ${b.entry.maxShift} semitones` : "") : p.inst})`);
  }
  console.log(`voices   recordings: ${recorded.join(", ") || "none"}; modeled: ${modeled.join(", ") || "none"}`);
};
export const codeBuiltNotice = () => console.log('audio: using code-built instruments; run node tools/soundfetch.mjs get all to install recordings, or set ANIDOODLE_SOUNDS=<pack-dir>');
