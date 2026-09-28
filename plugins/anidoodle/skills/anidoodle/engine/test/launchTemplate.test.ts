// LAUNCH TEMPLATE TESTS. makeLaunchFilm takes a score composed for the product: a Material (what
// compose.md writes) or a Piece. anidoodle's own pieces are refused by identity, by title and by
// content, so a retitled or transposed copy of our launch score cannot ship as a user's film.
import { makeLaunchFilm } from "../src/canvas-core/launchTemplate";
import { chiptunePlayful, composePiece, daylightCopy, filmAudio, fitScore, launchLofi3, launchLofi3Material, loudness, perform, truePeak, type Material } from "../src/canvas-core/music";
import type { Film } from "../src/canvas-core/film";

export const name = "launchTemplate";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const plate: Film = { meta: { title: "plate", W: 1080, H: 1080, fps: 30, bpm: 120, durationFrames: 60 }, assets: { images: {} }, shots: [{ id: "p", start: 0, end: 60, draw: () => {} }] };
  const base = { title: "Tally", asks: [{ prompt: "draw it", plate, label: "l" }], tagline: "t", install: ["npm i tally"], bpm: 120, askBeats: 8, endBeats: 12 };
  const refused = (score: unknown, re = /anidoodle's own/) => { try { makeLaunchFilm({ ...base, score } as never); return false; } catch (e) { return re.test(String((e as Error).message)); } };
  const mine = (): Material => ({
    style: "playful", title: "Tally, counted", seed: 5, mood: "curious", bpm: 120, key: "G", mode: "mixolydian",
    chords: { G: { voicing: "[D4 G4 B4]", bass: "G2:1.5 D3:.5 G2:1 F2:1" }, F: { voicing: "[C4 F4 A4]", bass: "F2:1.5 C3:.5 F2:1 E2:1" } },
    motifs: { a: "B4:.5 D5:.5 G5:1 r:.5 F5:.25 E5:.25 D5:1", b: "r:1 A4:.5 C5:.5 F5:1 E5:.5 C5:.5" },
    grooves: { main: { family: "shuffle", density: 0.45, variation: 0.35 } },
    sections: [{ kind: "groove", bars: 4, harmony: ["G", "F"], lead: ["a", "b", "a", "b"], groove: "main", stretch: true }, { kind: "outro", bars: 1, harmony: ["G"], lead: ["a"] }],
  });
  let film: Film | null = null; try { film = makeLaunchFilm({ ...base, score: mine }); } catch (e) { ok(false, `a composed Material is accepted: ${(e as Error).message}`); }
  ok(!!film && typeof film.audio === "function", "a composed Material is accepted as the score");
  ok(refused(launchLofi3), "refuses our launch score by identity");
  ok(refused(launchLofi3Material), "refuses our launch score's material by identity");
  ok(refused(chiptunePlayful), "refuses a demo");
  ok(refused(() => ({ ...launchLofi3(), title: "Mine" })), "refuses a retitled copy of our launch score");
  ok(refused(() => ({ ...launchLofi3Material(), title: "Mine" })), "refuses retitled launch material");
  ok(refused(daylightCopy), "refuses the transposed copy of our launch score (the Daylight fixture)");
  ok(refused(undefined, /required/), "a missing score is an error, never a default");

  // The bed is the score FITTED to the film (fitScore via filmAudio), never the first N seconds cut
  // and faded: it is filmAudio's render exactly, times one gain, and its last note lands so the tail
  // rings out on the last frame.
  const two = { ...base, asks: [base.asks[0], { prompt: "again", plate, label: "l" }], askBeats: 16, endBeats: 12, score: mine };
  const bedFilm = makeLaunchFilm(two), secs = bedFilm.meta.durationFrames / bedFilm.meta.fps, SR = 16000;
  const [L, R] = bedFilm.audio!(SR), [fL] = filmAudio(composePiece(mine()), secs)(SR);
  let k = 0; for (let i = 0; i < fL.length; i++) if (Math.abs(fL[i]) > Math.abs(fL[k])) k = i;
  const g = L[k] / fL[k]; let dev = 0; for (let i = 0; i < L.length; i++) dev = Math.max(dev, Math.abs(L[i] - g * fL[i]));
  ok(L.length === Math.round(secs * SR) && dev < 1e-5, `the bed is filmAudio (fitScore) at one gain, exactly the film's ${secs} s (max deviation ${dev.toExponential(1)})`);
  const sc = bedFilm.meta.score, f = fitScore(composePiece(mine()), secs), end = perform(f.piece, f.tempo, { expressive: true }).lastOnset + f.piece.tail;
  ok(!!sc && sc.form === f.form && Math.abs(sc.tempo - f.tempo) < 1e-9, `meta.score reports the fit (${sc?.tempo.toFixed(1)} bpm, ${sc?.form}) for render to print beside the grid's 120 bpm`);
  ok(f.piece.arrangement?.at(-1)?.kind === "outro" && Math.abs(end - secs) < 0.25, `it ends on its outro: last note + tail = ${end.toFixed(2)} s of ${secs} s`);
  const lu = loudness([L, R], SR).integrated, tp = truePeak([L, R]).dbtp;
  ok(tp <= -0.99 && (Math.abs(lu + 14) < 0.3 || tp > -1.05), `bed at -14 LUFS or held by the -1 dBTP ceiling (${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP)`);
  // a dynamic bed stops at the peak ceiling; limit: true lets the limiter take those peaks instead
  const long = { ...two, askBeats: 24, endBeats: 16 }, [cL, cR] = makeLaunchFilm(long).audio!(SR), [lL, lR] = makeLaunchFilm({ ...long, limit: true }).audio!(SR);
  const cu = loudness([cL, cR], SR).integrated, lu2 = loudness([lL, lR], SR).integrated, tp2 = truePeak([lL, lR]).dbtp;
  ok(cu < -14.5 && truePeak([cL, cR]).dbtp > -1.05, `without limit the ceiling wins and says so in the loudness (${cu.toFixed(2)} LUFS)`);
  ok(Math.abs(lu2 + 14) < 0.3 && tp2 <= -1, `limit: true reaches -14 LUFS under -1 dBTP (${lu2.toFixed(2)} LUFS, ${tp2.toFixed(2)} dBTP)`);
};
