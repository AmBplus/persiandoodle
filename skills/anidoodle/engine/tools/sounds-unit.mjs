#!/usr/bin/env node
// Loader regression: ffprobe can close stdin early on a large FLAC. No real pack required.
//   node tools/sounds-unit.mjs <durable-test-dir>
import { build } from "esbuild";
import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadBanks } from "./sounds.mjs";

const dir = process.argv[2]; if (!dir) throw new Error("name a durable test directory");
const root = resolve(dir); mkdirSync(root, { recursive: true });
const frames = 48000 * 12, pcm = Buffer.alloc(frames * 8); let seed = 7;
for (let i = 0; i < frames * 2; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pcm.writeFloatLE(((seed >>> 0) / 4294967296 - 0.5) * 0.5, i * 4); }
const file = join(root, "large.flac");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", "48000", "-ac", "2", "-i", "pipe:0", "-c:a", "flac", "-sample_fmt", "s32", "-bits_per_raw_sample", "24", file], { input: pcm });
const bytes = readFileSync(file); assert(bytes.length > 2 * 1024 * 1024, "fixture must exceed the stdin pipe buffer by megabytes");
const zone = { file: "large.flac", midi: 60, layer: 1, rr: 1, frames, channels: 2, peakDb: -12, rmsDb: -17, sha256: createHash("sha256").update(bytes).digest("hex") };
const entry = { title: "Synthetic stereo", source: "test", license: "CC0-1.0", kind: "struck", range: [60, 60], layers: 1, normalized: true, damped: false, zones: [zone] };
const manifest = { pack: "anidoodle-sounds", version: 1, sampleRate: 48000, instruments: { piano: entry } };
manifest.rooms = { test: { title: "Synthetic IR", source: "test", license: "CC0-1.0", file: "large.flac", channels: 2, frames, rt60: 0.5, sha256: zone.sha256 } };
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
const js = (await build({ entryPoints: [join(import.meta.dirname, "../src/canvas-core/music/index.ts")], bundle: true, write: false, platform: "neutral", format: "esm" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
loadBanks(M, root, ["piano"]);
const bank = M.bankFor("piano"); assert(bank); assert.equal(bank.zones[0].channels.length, 2);
for (const c of bank.zones[0].channels) { assert.equal(c.length, frames); assert(c.every(Number.isFinite)); }
console.log(`PASS large FLAC: ${bytes.length} bytes, ${frames} stereo frames loaded without EPIPE`);
assert.equal(M.roomFor("test").L.length, frames); assert.equal(M.roomFor("test").R.length, frames); assert.equal(M.roomFor("test").sha256, zone.sha256);
M.clearBanks(); M.clearRooms(); loadBanks(M, root, []); assert(M.roomFor("test")); assert.equal(M.bankFor("piano"), undefined);
console.log("PASS rooms load as stereo float even when no sampled instrument is requested");
M.clearRooms(); const originalRoom = { ...manifest.rooms.test };
for (const [field, value, re] of [["sha256", "0".repeat(64), /sha256 mismatch/], ["frames", frames - 1, /frame count mismatch/], ["channels", 1, /expected 48 kHz/], ["file", file, /invalid FLAC path/]]) {
  manifest.rooms.test = { ...originalRoom, [field]: value }; writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
  assert.throws(() => loadBanks(M, root, []), re); assert.equal(M.roomFor("test"), undefined);
}
console.log("PASS corrupt room hash, frame count, channels and absolute path rejected before registration");
manifest.rooms = {};
M.clearBanks(); zone.sha256 = "0".repeat(64); writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
assert.throws(() => loadBanks(M, root, ["piano"]), /sha256 mismatch/); assert.equal(M.bankFor("piano"), undefined);
console.log("PASS corrupt large FLAC hash: rejected before registration");
let failures = 0;
const check = (label, fn) => { try { fn(); console.log(`PASS ${label}`); } catch (e) { failures++; console.error(`FAIL ${label}: ${e.message}`); } };
zone.sha256 = originalRoom.sha256; manifest.rooms = {}; writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
const isolatedHome = join(root, 'default-home'), install = join(isolatedHome, '.anidoodle', 'sounds'); mkdirSync(install, { recursive: true });
writeFileSync(join(install, 'large.flac'), bytes);
writeFileSync(join(install, 'manifest.json'), JSON.stringify({ ...manifest, rooms: {}, instruments: { piano: { ...entry, range: [21, 108] } } }));
const preload = join(root, 'home.cjs');
writeFileSync(preload, "require('node:os').homedir=()=>process.env.ANIDOODLE_TEST_HOME; require('node:module').syncBuiltinESMExports();");
const env = { ...process.env, ANIDOODLE_TEST_HOME: isolatedHome }; delete env.ANIDOODLE_SOUNDS;
check('music CLI discovers a default install with env and --sounds unset', () => {
  const result = spawnSync(process.execPath, ['--require', preload, 'tools/music.mjs', 'check', 'nocturne', '--seconds', '1'], { env: { ...env, ANIDOODLE_THREADS: '1' }, encoding: 'utf8', maxBuffer: 1<<24 });
  assert.notEqual(result.status, null, result.stderr); assert.match(result.stdout, /calibration piano:/);
});
check('film audio discovers and plays a default install with env unset', () => {
  const script = join(root, 'default-film.mjs');
  const audioUrl = new URL('./audio.mjs', import.meta.url).href;
  writeFileSync(script, `import assert from 'node:assert/strict'; import {prepareFilmSounds,filmFloat32} from ${JSON.stringify(audioUrl)}; const M=await import(${JSON.stringify('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))}); const film={audio:M.filmAudio(M.nocturne(),1)}; assert.equal(prepareFilmSounds(film,M),true); assert.equal(filmFloat32(film).frames,48000); console.log('DEFAULT FILM RECORDINGS PASS');`);
  const out = execFileSync(process.execPath, ['--require', preload, script], { env, encoding: 'utf8', maxBuffer: 1<<24 });
  assert.match(out, /DEFAULT FILM RECORDINGS PASS/);
});
if (failures) process.exitCode = 1;
else console.log('SOUNDS LOADER REVIEW PASS');
