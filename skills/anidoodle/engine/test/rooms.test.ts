// Recorded responses change the room, never the dry mix. Missing packs retain the old spaces.
import { registerRoom, roomFor, clearRooms, reverb, type Space } from "../src/canvas-core/music/mixReverb";
import { renderPiece, voiceJobs, voiceJobKey, runVoiceJob } from "../src/canvas-core/music/render";
import { nocturne } from "../src/canvas-core/music/pieces/nocturne";
import { rng } from "../src/canvas-core/core";
export const name = "recorded rooms";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const same = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((v, i) => v === b[i]);
  const throws = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  clearRooms();
  try {
    const L = new Float32Array(9600), R = new Float32Array(9600); L[0] = 0.6; R[0] = 0.5; L[3840] = 0.4; R[4320] = -0.4;
    const p = nocturne(), roomPiece = { ...p, plan: { ...p.plan, space: { ...p.plan.space, room: "test" } } }, o = { seconds: 0.7, master: "none" as const, stems: true }, before = renderPiece(p, 48000, o), missing = renderPiece(roomPiece, 48000, o), jobs = voiceJobs(roomPiece, 48000, o);
    ok(same(before.L, missing.L) && same(before.R, missing.R), "unregistered room falls back bit for bit");
    registerRoom("test", { L, R, rt60: 0.2, sha256: "a".repeat(64) });
    const recorded = renderPiece(roomPiece, 48000, o), again = renderPiece(roomPiece, 48000, o);
    ok(same(before.dry[0], recorded.dry[0]) && same(before.dry[1], recorded.dry[1]) && Object.keys(before.stems).every((id) => same(before.stems[id][0], recorded.stems[id][0])), "registered room leaves dry mix and stems untouched");
    ok(!same(before.wet[0], recorded.wet[0]) && same(recorded.L, again.L) && same(recorded.R, again.R), "recorded wet signal changes and is deterministic");
    const registeredJobs = voiceJobs(roomPiece, 48000, o);
    ok(registeredJobs.every((j, i) => voiceJobKey(j) !== voiceJobKey(jobs[i]) && j.roomHashes?.[0][1] === "a".repeat(64)), "room sha256 pins voice and guard job keys");
    const cache = new Map(), cached = renderPiece(roomPiece, 48000, { ...o, cache });
    ok(same(cached.L, recorded.L) && same(renderPiece(roomPiece, 48000, { ...o, cache }).L, recorded.L), "room renders are identical through cache hits");
    const low = renderPiece(roomPiece, 24000, o);
    ok(low.L.length === 16800 && low.L.every(Number.isFinite) && low.R.every(Number.isFinite) && same(low.L, renderPiece(roomPiece, 24000, o).L), "24 kHz recorded room renders finite and deterministically");
    const s: Space = { kind: "conv", room: "test", rt60: 1, er: 0.4, late: 0.2, hp: 100, lp: 7000, predelayMs: 20 }, impulse = new Float32Array(24000); impulse[0] = 1;
    const wet = reverb(impulse, impulse, 48000, s, rng(1)), lateOnly = reverb(impulse, impulse, 48000, { ...s, er: 0 }, rng(1)), earlyOnly = reverb(impulse, impulse, 48000, { ...s, late: 0 }, rng(1));
    ok(wet[0].slice(0, 960).every((x) => Math.abs(x) < 1e-7) && wet[2].slice(0, 960 + 1920).every((x) => Math.abs(x) < 1e-7), "predelay and 40 ms early/late split keep their timing");
    ok(same(wet[2], lateOnly[2]) && earlyOnly[2].every((x) => x === 0) && !same(earlyOnly[0], wet[0]), "er and late independently control the recorded reflections and tail");
    registerRoom("test", { L: Float32Array.from(L, (x) => -x), R, rt60: 0.2, sha256: "b".repeat(64) });
    ok(voiceJobKey(voiceJobs(roomPiece, 48000, o)[0]) !== voiceJobKey(registeredJobs[0]) && throws(() => runVoiceJob(registeredJobs[0])) && !same(renderPiece(roomPiece, 48000, { ...o, cache }).L, cached.L), "replacing a room invalidates jobs and cache identity");
    ok(throws(() => registerRoom("bad", { L, R: new Float32Array(1), rt60: 0.2, sha256: "c".repeat(64) })) && !roomFor("bad"), "invalid room PCM is rejected before registration");
    clearRooms();
    for (const kind of ["conv", "plate", "fdn"] as const) {
      const a = reverb(impulse, impulse, 48000, { ...s, kind, room: undefined }, rng(3)), b = reverb(impulse, impulse, 48000, { ...s, kind }, rng(3));
      ok(a.every((c, i) => same(c, b[i])), `${kind}: missing room preserves every wet channel bit for bit`);
    }
  } finally { clearRooms(); }
};
