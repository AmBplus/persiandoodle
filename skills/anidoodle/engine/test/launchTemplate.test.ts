// LAUNCH TEMPLATE TESTS. makeLaunchFilm takes a score composed for the product: a Material (what
// compose.md writes) or a Piece. anidoodle's own pieces are refused by identity, by title and by
// content, so a retitled or transposed copy of our launch score cannot ship as a user's film.
import { makeLaunchFilm } from "../src/canvas-core/launchTemplate";
import { chiptunePlayful, daylightCopy, launchLofi3, launchLofi3Material, type Material } from "../src/canvas-core/music";
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
};
