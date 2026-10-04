#!/usr/bin/env node
// Sound pack fetcher: puts the anidoodle-sounds-v1 release on a user's machine. The pack is too
// big for the plugin, so it lives as a separate download of one tar per instrument + rooms +
// an index JSON (built by `tools/soundpack.mjs dist`).
//
//   node tools/soundfetch.mjs list                      # what exists and what is installed, sizes
//   node tools/soundfetch.mjs get piano harp rooms      # download, verify, unpack (or: get all)
//   node tools/soundfetch.mjs where                     # print the sounds directory
//   node tools/soundfetch.mjs verify                    # re-hash everything installed
//   node tools/soundfetch.mjs remove <id>               # uninstall an instrument (or rooms)
//
// Source: ANIDOODLE_SOUNDS_URL or the default release URL below; a file:// URL or a bare local
// directory works too (that is how the unit test runs). The index is fetched first and refused
// unless its sha256 matches the release hash pinned in INDEX_SHA256
// (ANIDOODLE_SOUNDS_INDEX_SHA256 overrides, for testing a different dist), so a tampered index
// or archive never unpacks.
// Install dir: ANIDOODLE_SOUNDS if set, else ~/.anidoodle/sounds. It holds one merged
// manifest.json in the exact pack format of CONTRACT.md, the FLAC files and LICENSES.md.
//
// Safety: an archive downloads to a temp file inside the install dir; size and sha256 are
// checked BEFORE unpacking. Every tar entry must be a regular file named <id>/<file>.flac (or
// manifest.json / LICENSES.md at the archive root): absolute names, "..", links and anything
// else are refused. Unpack stages beside the instrument dir and swaps with rename; the merged
// manifest is rewritten after each instrument, atomically, so a failed or interrupted run
// leaves the previous state intact. Only `get` touches the network - list of a remote source
// reports the installed set without fetching. Node built-ins only; the tar reader is below.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, statSync, copyFileSync, readdirSync, createWriteStream, createReadStream, openSync, closeSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const RELEASE = "anidoodle-sounds-v1";
const INDEX_FILE = `${RELEASE}.json`;
const DEFAULT_URL = "https://github.com/alexgreensh/anidoodle/releases/download/sounds-v1/";
// sha256 of anidoodle-sounds-v1.json for the release, produced by `soundpack.mjs dist` of
// pack-v1; a tampered index is refused before anything downloads.
const INDEX_SHA256 = "558d7fcb9138afa090ccf16b23355edbf8b98f63c26151646bf1721a6969840a";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const sha256File = (f) => sha256(readFileSync(f));

// ---------------------------------------------------------------- paths
export const installRoot = () =>
  process.env.ANIDOODLE_SOUNDS ? resolve(process.env.ANIDOODLE_SOUNDS) : join(homedir(), ".anidoodle", "sounds");
// The resolved install directory, or null when nothing is installed (for tools/sounds.mjs
// callers deciding whether a pack exists at all).
export const soundsDir = () => {
  const d = installRoot();
  return existsSync(join(d, "manifest.json")) ? d : null;
};
const source = () => process.env.ANIDOODLE_SOUNDS_URL || DEFAULT_URL;
const isLocalSrc = (s) => !/^https?:\/\//i.test(s);
const srcFile = (s, name) => (s.startsWith("file://") ? join(fileURLToPath(s), name) : join(s, name));
const srcUrl = (s, name) => `${s.replace(/\/*$/, "")}/${name}`;

// Leftovers of an interrupted run: partial downloads, staging dirs, swapped-out dirs, temp
// manifests. Swept at the start of every command so a later run always starts clean.
const sweep = (root) => {
  if (!existsSync(root)) return;
  for (const e of readdirSync(root))
    if (/^\.(dl|unpack|old|tmp)-/.test(e)) rmSync(join(root, e), { recursive: true, force: true });
};
const atomicWrite = (file, data) => {
  const tmp = join(dirname(file), `.tmp-${basename(file)}-${process.pid}`);
  writeFileSync(tmp, data);
  renameSync(tmp, file);
};
const readMerged = (root) => {
  const f = join(root, "manifest.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};

// ---------------------------------------------------------------- the index
const loadIndex = async () => {
  const src = source(), pin = process.env.ANIDOODLE_SOUNDS_INDEX_SHA256 || INDEX_SHA256;
  if (!pin) throw new Error("no index sha256 is pinned for this release (ANIDOODLE_SOUNDS_INDEX_SHA256 overrides for a test dist)");
  let buf;
  if (isLocalSrc(src)) buf = readFileSync(srcFile(src, INDEX_FILE));
  else {
    const res = await fetch(srcUrl(src, INDEX_FILE));
    if (!res.ok) throw new Error(`index fetch failed: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const sha = sha256(buf);
  if (sha !== pin) throw new Error(`refusing a tampered index: sha256 ${sha}, pinned ${pin}`);
  const index = JSON.parse(buf.toString("utf8"));
  if (index.release !== RELEASE || index.pack !== "anidoodle-sounds" || index.version !== 1 || !Array.isArray(index.archives))
    throw new Error(`${INDEX_FILE} is not an ${RELEASE} index`);
  return index;
};

// ---------------------------------------------------------------- download
const download = async (src, name, tmp) => {
  if (isLocalSrc(src)) {
    const f = srcFile(src, name);
    if (!existsSync(f)) throw new Error(`${name}: not in ${src}`);
    copyFileSync(f, tmp);
    return;
  }
  const res = await fetch(srcUrl(src, name));
  if (!res.ok || !res.body) throw new Error(`${name}: download failed, HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
};

// ---------------------------------------------------------------- tar reader
// Minimal ustar reader: our dist writes regular files only, mtime 0, no links - anything else
// is refused. Entry names must be <top>/<file>.flac two segments deep, or manifest.json /
// LICENSES.md at the root: no absolute paths, no "..", no backslashes, no empty segments.
const octal = (h, at, len) => {
  const s = h.subarray(at, at + len).toString("latin1").replace(/\0[\s\S]*$/, "").trim();
  if (!/^[0-7]+$/.test(s)) throw new Error("tar: malformed numeric field");
  return parseInt(s, 8);
};
const cstr = (h, at, len) => h.subarray(at, at + len).toString("latin1").replace(/\0[\s\S]*$/, "");
const safeEntry = (name, top) => {
  const seg = name.split("/");
  if (!name || name.length > 255 || name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.includes("\\")) return false;
  if (seg.some((s) => s === "" || s === "." || s === "..")) return false;
  if (seg.length === 1) return name === "manifest.json" || name === "LICENSES.md";
  return seg.length === 2 && seg[0] === top && seg[1].length > 0 && seg[1].endsWith(".flac");
};
const untar = (file, stage, top) => {
  const fd = openSync(file, "r");
  try {
    const hdr = Buffer.alloc(512);
    let pos = 0;
    for (;;) {
      let got = 0;
      while (got < 512) {
        const n = readSync(fd, hdr, got, 512 - got, pos + got);
        if (n === 0) break;
        got += n;
      }
      if (got === 0) break;
      if (got < 512) throw new Error(`${file}: truncated tar header at ${pos}`);
      if (hdr.every((b) => b === 0)) break; // end-of-archive zero block
      if (cstr(hdr, 257, 6) !== "ustar") throw new Error(`${file}: not a ustar archive at ${pos}`);
      const name = (() => { const p = cstr(hdr, 345, 155), n = cstr(hdr, 0, 100); return p ? `${p}/${n}` : n; })();
      const size = octal(hdr, 124, 12);
      const type = hdr[156];
      if (type !== 0x30 && type !== 0) throw new Error(`${file}: entry ${name} is a link or non-file (type ${String.fromCharCode(type || 0x30)})`);
      if (!safeEntry(name, top)) throw new Error(`${file}: refusing unsafe entry name ${JSON.stringify(name)}`);
      const data = Buffer.alloc(size);
      let dgot = 0;
      while (dgot < size) {
        const n = readSync(fd, data, dgot, size - dgot, pos + 512 + dgot);
        if (n === 0) throw new Error(`${file}: truncated entry ${name}`);
        dgot += n;
      }
      const out = join(stage, ...name.split("/"));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, data);
      pos += 512 + size + ((512 - (size % 512)) % 512);
    }
  } finally {
    closeSync(fd);
  }
};

// ---------------------------------------------------------------- install
// The staged tree must be exactly the fragment's declared files, each hashing to the manifest's
// sha256; the archive's own manifest.json must be the same fragment the index carries, and its
// LICENSES.md the index's text. A mismatch means dist and index disagree - refuse.
const checkStage = (stage, top, frag, licenses) => {
  for (const e of readdirSync(stage)) if (e !== top && e !== "manifest.json" && e !== "LICENSES.md") throw new Error(`unexpected archive entry ${e}`);
  const sm = join(stage, "manifest.json"), sl = join(stage, "LICENSES.md");
  if (!existsSync(sm) || readFileSync(sm, "utf8") !== JSON.stringify(frag, null, 2) + "\n") throw new Error("archive manifest.json does not match the index fragment");
  if (!existsSync(sl) || readFileSync(sl, "utf8") !== licenses) throw new Error("archive LICENSES.md does not match the index");
  const want = new Map();
  for (const inst of Object.values(frag.instruments ?? {})) for (const z of inst.zones) want.set(z.file, z.sha256);
  for (const r of Object.values(frag.rooms ?? {})) want.set(r.file, r.sha256);
  const topDir = join(stage, top);
  const staged = existsSync(topDir) ? readdirSync(topDir).map((f) => `${top}/${f}`) : [];
  for (const f of staged) if (!want.has(f)) throw new Error(`${f}: not declared in the manifest fragment`);
  for (const [f, sha] of want) {
    const p = join(stage, ...f.split("/"));
    if (!existsSync(p)) throw new Error(`${f}: missing from the archive`);
    if (sha256File(p) !== sha) throw new Error(`${f}: sha256 mismatch inside the archive`);
  }
};
// Stage sits beside the destination; swap by rename. A crash mid-swap can strand the old dir as
// .old-* (swept next run) but never leaves a half-written instrument under its real name.
const swap = (root, stage, top) => {
  const dest = join(root, top), aside = join(root, `.old-${top}-${process.pid}`);
  if (existsSync(dest)) renameSync(dest, aside);
  try {
    renameSync(join(stage, top), dest);
  } catch (e) {
    if (existsSync(aside) && !existsSync(dest)) renameSync(aside, dest);
    throw e;
  }
  if (existsSync(aside)) rmSync(aside, { recursive: true, force: true });
};
const mergeManifest = (root, frag) => {
  const m = readMerged(root) ?? { pack: "anidoodle-sounds", version: 1, sampleRate: 48000, instruments: {}, rooms: {} };
  Object.assign(m.instruments, frag.instruments ?? {});
  Object.assign(m.rooms, frag.rooms ?? {});
  atomicWrite(join(root, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
};
const archiveInstalled = (m, a) =>
  !!m && a.instruments.every((i) => m.instruments?.[i]) && (!a.rooms?.length || Object.keys(m.rooms ?? {}).length > 0);

const installArchive = async (a, root, index) => {
  const src = source();
  const tmp = join(root, `.dl-${a.file}-${process.pid}`);
  const stage = join(root, `.unpack-${a.file}-${process.pid}`);
  const top = a.instruments[0] ?? "rooms";
  try {
    process.stdout.write(`${a.file}: downloading ${(a.bytes / 1e6).toFixed(1)} MB... `);
    await download(src, a.file, tmp);
    const sz = statSync(tmp).size;
    if (sz !== a.bytes) throw new Error(`\n${a.file}: ${sz} bytes, index says ${a.bytes} - refusing`);
    if (sha256File(tmp) !== a.sha256) throw new Error(`\n${a.file}: sha256 mismatch - refusing a tampered archive`);
    mkdirSync(stage);
    untar(tmp, stage, top);
    checkStage(stage, top, a.manifest, index.licenses);
    swap(root, stage, top);
    mergeManifest(root, a.manifest);
    console.log("installed");
  } finally {
    rmSync(tmp, { force: true });
    rmSync(stage, { recursive: true, force: true });
  }
};

// ---------------------------------------------------------------- commands
const cmdGet = async (ids) => {
  const root = installRoot();
  mkdirSync(root, { recursive: true });
  sweep(root);
  const index = await loadIndex();
  const byId = new Map();
  for (const a of index.archives) {
    for (const id of a.instruments) byId.set(id, a);
    if (a.rooms?.length) byId.set("rooms", a);
  }
  const wanted = ids.length === 1 && ids[0] === "all" ? [...byId.keys()] : ids;
  const unknown = wanted.filter((w) => !byId.has(w));
  if (unknown.length) throw new Error(`unknown sound id ${unknown.join(", ")} (the index has: ${[...byId.keys()].join(", ")})`);
  const m = readMerged(root);
  for (const a of new Set(wanted.map((w) => byId.get(w)))) {
    if (archiveInstalled(m, a)) { console.log(`${a.file}: already installed (remove first to reinstall)`); continue; }
    await installArchive(a, root, index);
  }
  atomicWrite(join(root, "LICENSES.md"), index.licenses);
};

const sizeOf = (root, files) => files.reduce((s, rel) => { try { return s + statSync(join(root, ...rel.split("/"))).size; } catch { return s; } }, 0);
const printInstalled = (m, root) => {
  console.log(`${"id".padEnd(20)} ${"zones".padStart(5)} ${"MB".padStart(8)}`);
  for (const [id, inst] of Object.entries(m.instruments ?? {}))
    console.log(`${id.padEnd(20)} ${String(inst.zones.length).padStart(5)} ${(sizeOf(root, inst.zones.map((z) => z.file)) / 1e6).toFixed(1).padStart(8)}`);
  const rooms = Object.entries(m.rooms ?? {});
  if (rooms.length)
    console.log(`${"rooms".padEnd(20)} ${String(rooms.length).padStart(5)} ${(sizeOf(root, rooms.map(([, r]) => r.file)) / 1e6).toFixed(1).padStart(8)}`);
};

const cmdList = async () => {
  const root = installRoot();
  sweep(root);
  const m = readMerged(root);
  const src = source();
  console.log(`install: ${root}${m ? "" : " (nothing installed)"}`);
  if (isLocalSrc(src)) {
    // a local or file:// source is read from disk - no network involved - so the index's
    // available set can be shown beside the installed state
    const index = await loadIndex();
    console.log(`source:  ${src}\n`);
    console.log(`${"archive".padEnd(44)} ${"MB".padStart(8)}  ${"holds".padEnd(22)} status`);
    for (const a of index.archives) {
      const holds = a.instruments.concat(a.rooms?.length ? ["rooms"] : []).join(", ");
      console.log(`${a.file.padEnd(44)} ${(a.bytes / 1e6).toFixed(1).padStart(8)}  ${holds.padEnd(22)} ${archiveInstalled(m, a) ? "installed" : "available"}`);
    }
  } else {
    // never downloads without being asked: only get touches the network, so a remote source
    // reports the installed set from the merged manifest alone
    console.log(`source:  ${src} (remote index is fetched by get only)`);
    if (m) { console.log(); printInstalled(m, root); }
  }
};

const cmdVerify = () => {
  const root = soundsDir();
  if (!root) { console.error("nothing installed"); process.exit(1); }
  const m = readMerged(root);
  const bad = [];
  let n = 0;
  const check = (rel, want) => {
    const f = join(root, ...rel.split("/"));
    if (!existsSync(f)) { bad.push(`${rel}: missing`); return; }
    n++;
    if (sha256File(f) !== want) bad.push(`${rel}: sha256 mismatch`);
  };
  for (const inst of Object.values(m.instruments ?? {})) for (const z of inst.zones) check(z.file, z.sha256);
  for (const r of Object.values(m.rooms ?? {})) check(r.file, r.sha256);
  if (!existsSync(join(root, "LICENSES.md"))) bad.push("LICENSES.md missing");
  if (bad.length) { for (const b of bad) console.error(`FAIL ${b}`); console.error(`verify: ${bad.length} failure${bad.length > 1 ? "s" : ""}`); process.exit(1); }
  console.log(`verify: ${n} installed files, all sha256 match`);
};

const cmdRemove = (id) => {
  const root = installRoot();
  sweep(root);
  const m = readMerged(root);
  if (!m) { console.error("nothing installed"); process.exit(1); }
  let top = null;
  if (id === "rooms" && Object.keys(m.rooms ?? {}).length) { m.rooms = {}; top = "rooms"; }
  else if (m.instruments?.[id]) { delete m.instruments[id]; top = id; }
  if (!top) { console.error(`${id}: not installed`); process.exit(1); }
  // manifest first: it must never claim files that are already gone; a leftover dir is just
  // unclaimed disk a later get overwrites
  atomicWrite(join(root, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  rmSync(join(root, top), { recursive: true, force: true });
  console.log(`removed ${id}`);
};

// ---------------------------------------------------------------- main
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) (async () => {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "list" && !args.length) await cmdList();
  else if (cmd === "get" && args.length) await cmdGet(args);
  else if (cmd === "where" && !args.length) console.log(installRoot());
  else if (cmd === "verify" && !args.length) cmdVerify();
  else if (cmd === "remove" && args.length === 1) cmdRemove(args[0]);
  else {
    console.error("usage: node tools/soundfetch.mjs list | get <id...|all> | where | verify | remove <id>");
    process.exit(2);
  }
})().catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
