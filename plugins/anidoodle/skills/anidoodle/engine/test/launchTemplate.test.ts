// LAUNCH TEMPLATE TESTS. makeLaunchFilm takes a score written for the product (a Piece).
// anidoodle's own pieces are refused by identity, by title and by content, so a retitled or
// transposed copy of our launch score cannot ship as a user's film.
import { gridScore, makeLaunchFilm } from "../src/canvas-core/launchTemplate";
import { chiptunePlayful, line, renderPiece, launchLofi3, loudness, perform, truePeak, type Piece, type Role } from "../src/canvas-core/music";
import type { Film } from "../src/canvas-core/film";

export const name = "launchTemplate";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const plate: Film = { meta: { title: "plate", W: 1080, H: 1080, fps: 30, bpm: 120, durationFrames: 60 }, assets: { images: {} }, shots: [{ id: "p", start: 0, end: 60, draw: () => {} }] };
  const base = { title: "Tally", asks: [{ prompt: "draw it", plate, label: "l" }], tagline: "t", install: ["npm i tally"], bpm: 120, askBeats: 8, endBeats: 12 };
  const refused = (score: unknown, re = /anidoodle's own/) => { try { makeLaunchFilm({ ...base, score } as never); return false; } catch (e) { return re.test(String((e as Error).message)); } };
  // a product's own score, written by hand in the bar-checked notation: G mixolydian, 120 bpm, `bars` long
  const mine = (bars: number, sting = false) => (): Piece => {
    const L = (t: number, src: string, role: Role, v = 0.7) => line(t, src, { role, v, bpb: 4 });
    const cyc = (k: number, a: string, b: string) => Array.from({ length: bars }, (_, i) => (i % 2 ? b : a)).slice(0, k).join(" | ");
    const mel = ["B4:.5 D5:.5 G5:1 r:.5 F5:.25 E5:.25 D5:1", "r:1 A4:.5 C5:.5 F5:1 E5:.5 C5:.5", "D5:.75 E5:.25 G5:.5 A5:.5 G5:1 r:1", "F5:.5 E5:.5 C5:1 D5:2"];
    const last = bars - 1;
    return {
      title: "Tally, counted", seed: 5, tail: 1.5, harmony: Array.from({ length: bars }, (_, b) => ({ t: b * 4, name: b % 2 ? "F" : "G" })),
      plan: { style: "minimalist", tempo: 120, meter: "4/4", ritard: 0.95, sections: [{ id: "a", bars, mood: "curious", key: "G", mode: "mixolydian", melody: ["ostinato", "hook"], dyn: [0.6, 0.75], ending: "button" }] },
      parts: [
        { id: "ost", inst: "marimba", role: "accomp", gainDb: -4, notes: L(0, cyc(bars, "G3:.5 D4:.5 B4:.5 D4:.5 G3:.5 D4:.5 B4:.5 D4:.5", "F3:.5 C4:.5 A4:.5 C4:.5 F3:.5 C4:.5 A4:.5 C4:.5"), "accomp", 0.55) },
        { id: "lead", inst: "marimba", role: "melody", gainDb: 1, notes: Array.from({ length: bars }, (_, b) => L(b * 4, b === last ? "[G4 B4 D5 G5]:1@1 r:3" : mel[b % 4], "melody", 0.8)).flat() },
        { id: "low", inst: "bass", role: "bass", gainDb: -2, notes: L(0, cyc(bars, "G2:1.5 D3:.5 G2:1 F2:1", "F2:1.5 C3:.5 F2:1 E2:1"), "bass", 0.8) },
        // a sting: one loud drum hit on the last downbeat, the kind of peak that stops a dynamic bed short of -14 LUFS
        ...(sting ? [{ id: "sting", inst: "kick" as const, role: "drum" as const, gainDb: 14, notes: L(last * 4, "C4:1@1 r:3", "drum", 1) }] : []),
      ],
    };
  };
  let film: Film | null = null; try { film = makeLaunchFilm({ ...base, askBeats: 16, score: mine(10) }); } catch (e) { ok(false, `a product's own score is accepted: ${(e as Error).message}`); }
  ok(!!film && typeof film.audio === "function", "a product's own score (a Piece) is accepted");
  ok(refused(launchLofi3), "refuses our launch score by identity");
  ok(refused(chiptunePlayful), "refuses a demo");
  ok(refused(() => ({ ...launchLofi3(), title: "Mine" })), "refuses a retitled copy of our launch score");
  const transposed = (): Piece => { const p = launchLofi3(); return { ...p, title: "Mine, in E flat", parts: p.parts.map((pt) => ({ ...pt, notes: pt.notes.map((n) => (pt.role === "drum" ? n : { ...n, p: n.p + 3 })) })) }; };
  ok(refused(transposed), "refuses a transposed, retitled copy of our launch score (by content)");
  ok(refused(undefined, /required/), "a missing score is an error, never a default");

  // Sync wins over length: a 120 bpm film with a 10-bar score plays the score at EXACTLY 120 bpm,
  // and the film is made whole bars of it by the end-card hold. The bed is that render at one gain
  // (never cut and faded, never re-tempoed), every downbeat on the grid.
  const two = { ...base, asks: [base.asks[0], { prompt: "again", plate, label: "l" }], askBeats: 16, endBeats: 12, score: mine(10) };
  const bedFilm = makeLaunchFilm(two), N = bedFilm.meta.durationFrames, secs = N / bedFilm.meta.fps, SR = 16000, sc = bedFilm.meta.score;
  ok(!!sc && sc.tempo === 120 && sc.grid === true, `the score plays at the film's bpm exactly (${sc?.tempo} bpm, ${sc?.form})`);
  ok(N % 60 === 0, `the film is whole bars of the score (${N} frames = ${N / 60} bars of 60 frames)`);
  const endAt = bedFilm.cut.STARTS[bedFilm.cut.SEGS.length - 1];
  ok(bedFilm.cut.STARTS.every((f) => f % 60 === 0) && endAt === 2 * 16 * 15, `every cut sits on a downbeat (${bedFilm.cut.STARTS.join(", ")}; end card at ${endAt})`);
  const played = gridScore(mine(10), 120, 30, endAt, 12 * 15), perf = perform(played.piece, 120, { expressive: true });
  let worst = 0; for (let b = 0; 4 * b * 0.5 < perf.lastOnset - 3; b++) worst = Math.max(worst, Math.abs(perf.sec(4 * b) - 2 * b));
  ok(worst < 1e-6, `every downbeat before the final ritard lands on its bar, worst ${(worst * 1000).toFixed(3)} ms`);
  ok(played.bars * 60 < N && played.piece.plan.sections.length >= 1, `the score (${played.bars} bars) ends inside the film and rings out on its last frame`);
  const [L, R] = bedFilm.audio!(SR), r = renderPiece(played.piece, SR, { seconds: secs, tempo: 120 });
  let k = 0; for (let i = 0; i < r.L.length; i++) if (Math.abs(r.L[i]) > Math.abs(r.L[k])) k = i;
  const g = L[k] / r.L[k]; let dev = 0; for (let i = 0; i < L.length; i++) dev = Math.max(dev, Math.abs(L[i] - g * r.L[i]));
  ok(L.length === Math.round(secs * SR) && dev < 1e-5, `the bed is that 120 bpm render at one gain, exactly the film's ${secs} s (max deviation ${dev.toExponential(1)})`);
  // a score too short for the film: an error that says which lengths fit, never a tempo change
  let msg = ""; try { makeLaunchFilm({ ...two, score: mine(4) }); } catch (e) { msg = (e as Error).message; }
  ok(/cannot end on a bar.*Write it 10-14 bars long/.test(msg), `a score that cannot fit throws with the fix: ${msg.slice(0, 90)}...${msg.slice(-60)}`);
  const lu = loudness([L, R], SR).integrated, tp = truePeak([L, R]).dbtp;
  ok(tp <= -0.99 && (Math.abs(lu + 14) < 0.3 || tp > -1.05), `bed at -14 LUFS or held by the -1 dBTP ceiling (${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP)`);
  // a dynamic bed stops at the peak ceiling; limit: true lets the limiter take those peaks instead
  const long = { ...two, askBeats: 24, endBeats: 16, score: mine(16, true) }, [cL, cR] = makeLaunchFilm(long).audio!(SR), [lL, lR] = makeLaunchFilm({ ...long, limit: true }).audio!(SR);
  const cu = loudness([cL, cR], SR).integrated, lu2 = loudness([lL, lR], SR).integrated, tp2 = truePeak([lL, lR]).dbtp;
  ok(cu < -14.2 && truePeak([cL, cR]).dbtp > -1.05, `without limit the ceiling wins and says so in the loudness (${cu.toFixed(2)} LUFS)`);
  ok(Math.abs(lu2 + 14) < 0.3 && tp2 <= -1, `limit: true reaches -14 LUFS under -1 dBTP (${lu2.toFixed(2)} LUFS, ${tp2.toFixed(2)} dBTP)`);
  // a claimBar that needs a longer last ask gets a really longer ask, never the same ask slowed down
  // (content played at half speed repeats frames and fails the gate's identical-frame check)
  const solvedFilm = makeLaunchFilm({ ...base, asks: [base.asks[0], { ...base.asks[0], prompt: "and again" }], words: [[{ text: "ONE.", style: "ink" }]], claimBar: 7, score: null } as never) as ReturnType<typeof makeLaunchFilm>;
  const slowed = solvedFilm.cut.SEGS.filter((sg) => sg.kind === "pic" && sg.len > sg.to - sg.from);
  ok(slowed.length === 0 && solvedFilm.cut.STARTS[solvedFilm.cut.STARTS.length - 1] === 7 * 60, `a solved ask is longer, not slower (end card on bar 7 at frame ${solvedFilm.cut.STARTS[solvedFilm.cut.STARTS.length - 1]}, ${slowed.length} slowed segments)`);
};
