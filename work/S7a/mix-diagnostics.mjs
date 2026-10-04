// Historical experiment. Requires withdrawn mix exports; not runnable on the delivered part 1 code.
import { build } from '../../skills/anidoodle/engine/node_modules/esbuild/lib/main.js';
import { loadBanks, soundIds } from '../../skills/anidoodle/engine/tools/sounds.mjs';
import { writeFileSync } from 'node:fs';
const root = new URL('../../skills/anidoodle/engine/', import.meta.url).pathname;
const js = (await build({ stdin: { contents: 'export * from "./src/canvas-core/music/index"; export { recordedEq } from "./src/canvas-core/music/mixProfiles";', resolveDir: root }, bundle: true, write: false, format: 'esm' })).outputFiles[0].text;
const M = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const p = M.nocturne(); loadBanks(M, process.argv[2], soundIds(p));
const r = M.renderPiece(p, 48000), pl = M.maskingPlan(p, { seconds: r.L.length / 48000, perf: r.perf });
const bands = Object.fromEntries(pl.roles.map(role => [role, M.roleBandDb(p, 48000, pl.opts(role), pl.spans)]));
const rows = pl.spans.map((_, bar) => ({ bar, melody: bands.melody[bar], masker: Math.max(...pl.roles.filter(x => x !== 'melody').map(role => bands[role][bar])), margin: bands.melody[bar] - Math.max(...pl.roles.filter(x => x !== 'melody').map(role => bands[role][bar])) }));
console.table(rows);
const selected = [];
for (const role of ['full', 'bass', 'accomp']) {
  const keys = role === 'full' ? r.perf.parts[1].keys : r.perf.parts[1].keys.filter(k => k.role === role), bank = M.bankFor('piano');
  const zones = M.sampleZones(bank, keys.slice().sort((a,b)=> a.t-b.t || a.p-b.p), p.seed + 1, r.perf.pedal), spectra = zones.map(z => bank.trim.find(t=>t.file===z.zone.file));
  const median = xs => xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];
  const excess = median(spectra.map(t=>t.bandExcessDb)), fraction = median(spectra.map(t=>t.bandFractionDb));
  selected.push({ role, notes: keys.length, excess, fraction, eq: M.recordedEq({}, 'accomp', excess, fraction) });
}
console.log(JSON.stringify(selected));
writeFileSync(new URL('mix-diagnostics.json', import.meta.url), JSON.stringify({ rows, selected }, null, 2));
