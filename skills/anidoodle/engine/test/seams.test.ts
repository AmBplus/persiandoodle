// SEAM TESTS. src/canvas-core/seams.ts is arithmetic, so the claim it makes (motion carries across
// the cut at one speed, in one direction, and comes to rest exactly) is held to numbers here.
//   node tools/test.mjs seams
import { checkSeam, checkSeamPlan, easeIn, easeOut, entryDistance, exitSpeed, matchedMove, matchedZoom, speedCeiling, velocityAt } from "../src/canvas-core/seams";
import type { P } from "../src/canvas-core/core";

export const name = "seams";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  const CUT = 100;

  // 1. the two curves are mirror images, and the helpers invert each other
  ok([0, 0.2, 0.5, 0.9, 1].every((t) => near(easeOut(t), 1 - easeIn(1 - t))) && easeIn(0) === 0 && easeOut(1) === 1, "easeOut is easeIn mirrored; both run 0 to 1");
  ok(near(entryDistance(exitSpeed(300, 24), 24), 300), "an entry as long as its exit travels the same distance");
  ok(exitSpeed(300, 12) > exitSpeed(300, 24), "a shorter exit over the same distance leaves faster");

  // 2. a matched move: one speed on both sides of the cut, in one direction, at rest at both ends
  for (const dir of [0, Math.PI, 0.6, -Math.PI / 2]) {
    const m = matchedMove({ dir, exitDist: 260, exitF: 12, entryF: 40 });
    // one continuous path for the test: the incoming shot's rest is wherever the outgoing one left off, plus the entry
    const pos = (f: number): P => { if (f <= CUT) return m.out(f, CUT); const e = m.in(f, CUT), end = m.out(CUT, CUT); return [end[0] + e[0] + m.entryDist * Math.cos(dir), end[1] + e[1] + m.entryDist * Math.sin(dir)]; };
    const a = velocityAt(pos, CUT), b = velocityAt(pos, CUT + 1), va = Math.hypot(a[0], a[1]), vb = Math.hypot(b[0], b[1]);
    ok(near(va, m.speed, 1e-6) && near(vb, m.speed, 1e-6), `dir ${dir.toFixed(2)}: ${va.toFixed(2)} px a frame into the cut, ${vb.toFixed(2)} out of it`);
    ok(near(Math.atan2(a[1], a[0]), Math.atan2(b[1], b[0]), 1e-6), `dir ${dir.toFixed(2)}: the direction of travel is the same on both sides`);
    ok(checkSeam(a, b, { W: 1920, fps: 30 }).length === 0, `dir ${dir.toFixed(2)}: checkSeam has nothing to say`);
    const s = m.out(CUT - 12, CUT), e = m.in(CUT + 40, CUT), late = m.in(CUT + 400, CUT), early = m.out(0, CUT);
    ok(near(Math.hypot(s[0], s[1]), 0) && near(Math.hypot(early[0], early[1]), 0) && near(Math.hypot(e[0], e[1]), 0) && near(Math.hypot(late[0], late[1]), 0), `dir ${dir.toFixed(2)}: at rest before the exit and from the end of the entry on`);
    const last = velocityAt((f) => m.in(f, CUT), CUT + 40); ok(Math.hypot(last[0], last[1]) < m.speed * 0.01, `dir ${dir.toFixed(2)}: it lands with no speed left`);
  }
  let mono = true; { const m = matchedMove({ exitDist: 260, exitF: 12, entryF: 40 }); for (let f = CUT - 12; f < CUT + 40; f++) if (f !== CUT && (f < CUT ? m.out(f + 1, CUT)[0] < m.out(f, CUT)[0] : m.in(f + 1, CUT)[0] < m.in(f, CUT)[0])) mono = false; }
  ok(mono, "neither side ever travels backwards");
  ok(throws(() => matchedMove({ exitDist: 100, exitF: 1, entryF: 20 })) && throws(() => matchedMove({ exitDist: 100, exitF: 10, entryF: 0 })), "a one-frame exit or a zero-frame entry is refused");

  // 3. a matched zoom: the same rate of growth on both sides, in log space, landing on 1
  const z = matchedZoom({ push: 1.2, exitF: 6, entryF: 15 });
  ok(near(z.out(CUT - 6, CUT), 1) && near(z.out(CUT, CUT), 1.2) && near(z.in(CUT, CUT), z.from) && near(z.in(CUT + 15, CUT), 1) && near(z.in(CUT + 99, CUT), 1), "zoom: 1 before, the push at the cut, `from` after it, 1 at rest");
  const rOut = Math.log(z.out(CUT, CUT) / z.out(CUT - 1, CUT)), rIn = Math.log(z.in(CUT + 1, CUT) / z.in(CUT, CUT));
  ok(near(rOut, z.rate, 1e-9) && near(rIn, z.rate, 1e-9), `zoom: growing ${(100 * (Math.exp(rOut) - 1)).toFixed(1)}% a frame into the cut and ${(100 * (Math.exp(rIn) - 1)).toFixed(1)}% out of it`);
  ok(z.from > 0.4 && z.from < 1, `zoom: the incoming shot opens at ${z.from.toFixed(2)} of its size, inside what a scene can be drawn at`);
  ok(throws(() => matchedZoom({ push: 0.9, exitF: 6, entryF: 15 })) && throws(() => matchedZoom({ exitF: 1, entryF: 15 })), "a push of 1 or less, or a one-frame exit, is refused");

  // 4. checkSeam names each way a cut between moving shots goes wrong
  const o = { W: 1920, fps: 30 }, has = (f: { msg: string }[], s: string) => f.some((x) => x.msg.includes(s));
  ok(checkSeam([0, 0], [0.2, 0], o).length === 0, "two shots at rest: nothing to match");
  ok(has(checkSeam([40, 0], [0, 0], o), "at rest") && has(checkSeam([0, 0], [40, 0], o), "at rest"), "one side at rest, one moving: flagged");
  ok(has(checkSeam([40, 0], [-40, 0], o), "turns") && has(checkSeam([40, 0], [0, 40], o), "turns"), "a reversal or a right-angle turn: flagged");
  ok(has(checkSeam([40, 0], [20, 0], o), "drops") && has(checkSeam([40, 0], [80, 0], o), "jumps") && checkSeam([40, 0], [46, 0], o).length === 0, "half or double the speed is flagged; 15% off is not");
  ok(near(speedCeiling(1920, 60), 80) && has(checkSeam([200, 0], [200, 0], o), "past what blur"), "the ceiling is 2.5 widths a second (80 px a frame at 1920 and 60 fps), and a move past it is flagged");

  // 5. the seam plan: a designed seam twice, the signature three times, cuts as often as wanted
  const p = (type: string, n: number, x: object = {}) => Array.from({ length: n }, () => ({ type, ...x }));
  ok(checkSeamPlan([...p("iris", 2), ...p("matched cut", 6, { cut: true }), ...p("ink bloom", 3, { signature: true })]).length === 0, "two irises, six cuts and the signature three times pass");
  ok(has(checkSeamPlan(p("iris", 3)), '"iris" is used 3 times') && has(checkSeamPlan(p("ink bloom", 4, { signature: true })), "4 times"), "a third iris and a fourth signature are flagged");
  ok(has(checkSeamPlan([...p("bloom", 1, { signature: true }), ...p("wipe", 1, { signature: true })]), "2 signature moves"), "two signature moves are flagged");
};
