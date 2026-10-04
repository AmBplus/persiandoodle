#!/usr/bin/env node
// Unit test for tools/soundfetch.mjs and `soundpack.mjs dist`: builds a TINY synthetic pack in
// the contract's format (2 instruments x 2 zones + 1 room), dists it, then exercises
// get/list/where/verify/remove against a local dist dir, the refusal paths (corrupt archive,
// path-traversal entry, tampered index) and an interrupted download over a live local http
// server. Needs ffmpeg for the synthetic FLACs. Durable directory required - never /tmp.
//   node tools/soundfetch-unit.mjs <durable-test-dir>
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { writeTar } from "./soundpack.mjs";
import { soundsDir } from "./soundfetch.mjs";

const TOOLS = import.meta.dirname;
const dir = process.argv[2];
if (!dir) throw new Error("name a durable test directory");
const root = resolve(dir);
mkdirSync(root, { recursive: true });
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const SR = 48000;
let pass = 0;
const ok = (name) => console.log(`PASS ${++pass} ${name}`);

// ---------------------------------------------------------------- a tiny pack (contract format)
const pack = join(root, "tiny-pack");
const mkFlac = (file, frames, ch, seed0) => {
  const pcm = Buffer.alloc(frames * ch * 4);
  let seed = seed0;
  for (let i = 0; i < frames * ch; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pcm.writeFloatLE(((seed >>> 0) / 4294967296 - 0.5) * 0.4, i * 4); }
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", String(ch), "-i", "pipe:0",
    "-map_metadata", "-1", "-c:a", "flac", "-sample_fmt", "s32", "-bits_per_raw_sample", "24", file], { input: pcm });
};
const zone = (id, i, midi) => {
  const file = `${id}/z${i}.flac`, p = join(pack, ...file.split("/")), frames = 4800 * (i + 1);
  mkdirSync(dirname(p), { recursive: true });
  mkFlac(p, frames, 2, 11 + i);
  return { file, midi, layer: 1, rr: 1, frames, channels: 2, peakDb: -8, rmsDb: -20, sha256: sha(p) };
};
const inst = (id, title, midis) => ({ title, source: "test", license: "CC0-1.0", kind: "struck", range: [midis[0], midis.at(-1)], layers: 1, damped: true, zones: midis.map((m, i) => zone(id, i, m)) });
const manifest = { pack: "anidoodle-sounds", version: 1, sampleRate: SR, instruments: {
  piano: inst("piano", "Tiny Piano", [60, 62]),
  harp: inst("harp", "Tiny Harp", [55, 57]),
} };
{
  const f = "rooms/test-room.flac", p = join(pack, "rooms", "test-room.flac"), frames = 2400;
  mkdirSync(dirname(p), { recursive: true });
  mkFlac(p, frames, 2, 99);
  manifest.rooms = { "test-room": { title: "Test Room, Nowhere", source: "test", license: "CC-BY-4.0", file: f, channels: 2, frames, rt60: 0.05, sha256: sha(p), directFrames: 120 } };
}
writeFileSync(join(pack, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(pack, "LICENSES.md"), "# Licenses\n\n- Tiny Piano (`piano`), Tiny Harp (`harp`): synthetic test zones, CC0-1.0\n- Test Room, Nowhere (`rooms/test-room.flac`): CC-BY-4.0\n");
ok("tiny synthetic pack: piano, harp, test-room");

// ---------------------------------------------------------------- dist
const dist = join(root, "dist");
execFileSync("node", [join(TOOLS, "soundpack.mjs"), "dist", pack, dist], { stdio: "pipe" });
const indexSha = sha(join(dist, "anidoodle-sounds-v1.json"));
assert(existsSync(join(dist, "anidoodle-sounds-v1-piano.tar")) && existsSync(join(dist, "anidoodle-sounds-v1-rooms.tar")), "dist wrote archives");
ok("dist: archives + index written");

const install = join(root, "install");
rmSync(install, { recursive: true, force: true }); // re-runs start from a clean install
process.env.ANIDOODLE_SOUNDS = install; // the exported soundsDir() resolves through the env
const ENV = { ANIDOODLE_SOUNDS: install, ANIDOODLE_SOUNDS_URL: dist, ANIDOODLE_SOUNDS_INDEX_SHA256: indexSha };
// async spawn: the in-process http server below needs the event loop free to answer
const execFileP = promisify(execFile);
const run = async (args, env = {}) => (await execFileP("node", [join(TOOLS, "soundfetch.mjs"), ...args], { env: { ...process.env, ...ENV, ...env }, encoding: "utf8" })).stdout;
const runFail = async (args, env = {}) => { try { await run(args, env); } catch (e) { return e; } throw new Error(`expected nonzero exit: soundfetch ${args.join(" ")}`); };
const merged = () => JSON.parse(readFileSync(join(install, "manifest.json"), "utf8"));
const noLeftovers = () => assert.deepEqual(readdirSync(install).filter((e) => e.startsWith(".")), [], "no staging/download leftovers");

// ---------------------------------------------------------------- happy path
assert.equal((await run(["where"])).trim(), install, "where prints the resolved install dir");
assert.equal(soundsDir(), null, "soundsDir() null before install");
ok("where + soundsDir() before install");

await run(["get", "piano"]);
assert(existsSync(join(install, "piano", "z0.flac")), "piano flacs unpacked");
assert(existsSync(join(install, "LICENSES.md")), "LICENSES.md written");
assert.deepEqual(Object.keys(merged().instruments), ["piano"]);
assert.equal(soundsDir(), install, "soundsDir() resolves once installed");
noLeftovers();
ok("get piano: unpacked, merged manifest, soundsDir() resolves");

const list1 = await run(["list"]);
assert(list1.includes("anidoodle-sounds-v1-piano.tar") && /piano\.tar.*installed/s.test(list1.replace(/\n/g, " ")) && list1.includes("available"), "list shows installed + available");
ok("list: available vs installed with sizes");

await run(["get", "harp"]);
assert.deepEqual(Object.keys(merged().instruments).sort(), ["harp", "piano"], "second get merged into one manifest");
ok("two instruments in two calls -> one valid merged manifest");

assert((await run(["verify"])).includes("all sha256 match"), "verify passes");
ok("verify: re-hashes everything installed");

await run(["remove", "harp"]);
assert.deepEqual(Object.keys(merged().instruments), ["piano"]);
assert(!existsSync(join(install, "harp")), "harp dir removed");
assert((await run(["verify"])).includes("all sha256 match"), "verify still passes after remove");
ok("remove: manifest updated, files gone, verify still clean");

// ---------------------------------------------------------------- refusal paths
// corrupt archive: same length, different bytes - the sha256 the index pins no longer matches
const distBad = join(root, "dist-corrupt");
rmSync(distBad, { recursive: true, force: true });
execFileSync("cp", ["-R", dist, distBad]);
{
  const f = join(distBad, "anidoodle-sounds-v1-harp.tar");
  const b = readFileSync(f);
  b[b.length >> 1] ^= 0xff;
  writeFileSync(f, b);
}
{
  const e = await runFail(["get", "harp"], { ANIDOODLE_SOUNDS_URL: distBad });
  assert.match(String(e.stderr), /sha256 mismatch/, "corrupt archive refused on hash");
}
assert(!existsSync(join(install, "harp")), "corrupt archive left no files");
assert.deepEqual(Object.keys(merged().instruments), ["piano"]);
noLeftovers();
assert((await run(["verify"])).includes("all sha256 match"));
ok("corrupted archive refused, nothing left behind");

// path traversal: an honest sha256 (the index vouches for it) but an entry that escapes
const distEvil = join(root, "dist-evil");
rmSync(distEvil, { recursive: true, force: true });
execFileSync("cp", ["-R", dist, distEvil]);
{
  writeTar(join(distEvil, "evil.tar"), [
    { name: "../evil.flac", data: Buffer.alloc(64, 1) },
    { name: "manifest.json", data: Buffer.from("{}") },
  ]);
  const index = JSON.parse(readFileSync(join(dist, "anidoodle-sounds-v1.json"), "utf8"));
  const harp = index.archives.find((a) => a.instruments.includes("harp"));
  harp.file = "evil.tar";
  harp.bytes = readFileSync(join(distEvil, "evil.tar")).length;
  harp.sha256 = sha(join(distEvil, "evil.tar"));
  writeFileSync(join(distEvil, "anidoodle-sounds-v1.json"), JSON.stringify(index, null, 2) + "\n");
  const e = await runFail(["get", "harp"], { ANIDOODLE_SOUNDS_URL: distEvil, ANIDOODLE_SOUNDS_INDEX_SHA256: sha(join(distEvil, "anidoodle-sounds-v1.json")) });
  assert.match(String(e.stderr), /unsafe entry|refus/i, "traversal entry refused");
}
assert(!existsSync(join(root, "evil.flac")), "traversal payload never escaped");
assert(!existsSync(join(install, "harp")));
noLeftovers();
ok("path-traversal archive refused after hash check, nothing escaped");

// tampered index: pinned sha256 does not match
{
  const e = await runFail(["get", "harp"], { ANIDOODLE_SOUNDS_INDEX_SHA256: "0".repeat(64) });
  assert.match(String(e.stderr), /tampered index/, "index pin enforced");
}
noLeftovers();
ok("tampered index refused before any download");

// interrupted download: a live http server drops the connection mid-body
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split("?")[0].slice(1));
  const f = join(dist, name);
  if (!name || !existsSync(f)) { res.writeHead(404); return void res.end(); }
  const data = readFileSync(f);
  res.writeHead(200, { "content-length": data.length });
  if (name.includes("harp")) { res.write(data.subarray(0, data.length >> 1)); return void res.socket.destroy(); }
  res.end(data);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  const e = await runFail(["get", "harp"], { ANIDOODLE_SOUNDS_URL: `http://127.0.0.1:${server.address().port}/` });
  assert(e, "interrupted download fails");
} finally {
  server.close();
}
assert.deepEqual(Object.keys(merged().instruments), ["piano"], "old install untouched");
noLeftovers();
assert((await run(["verify"])).includes("all sha256 match"), "previous state still verifies");
ok("interrupted download leaves the old install working");

// ---------------------------------------------------------------- get all to finish
const out = await run(["get", "all"]);
assert(out.includes("already installed"), "piano skipped as already installed");
assert.deepEqual(Object.keys(merged().instruments).sort(), ["harp", "piano"]);
assert(Object.keys(merged().rooms).length === 1, "rooms merged");
assert((await run(["verify"])).includes("all sha256 match"));
const list2 = await run(["list"]);
assert(!list2.includes("available"), "everything installed");
ok("get all: skips installed, installs the rest, merged manifest verifies");

console.log(`\n${pass} checks passed`);
