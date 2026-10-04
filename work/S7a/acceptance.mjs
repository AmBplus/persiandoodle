import { build } from '../../skills/anidoodle/engine/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadBanks, soundIds, printSounds } from '../../skills/anidoodle/engine/tools/sounds.mjs';
const root = new URL('../../skills/anidoodle/engine/', import.meta.url).pathname;
const js = (await build({ entryPoints: [root + 'src/canvas-core/music/index.ts'], bundle: true, write: false, format: 'esm' })).outputFiles[0].text;
const M = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const dir = new URL('./', import.meta.url), mode = process.argv[2], pack = process.argv[3], names = ['marimbaCurious', 'harpTender', 'nocturne'];
const hash = (r) => createHash('md5').update(Buffer.from(r.L.buffer)).update(Buffer.from(r.R.buffer)).digest('hex');
const modeled = {};
for (const name of names) {
  const p = M.DEMOS[name](), r = M.renderPiece(p, 48000, { stems: true });
  modeled[name] = { md5: hash(r), stems: M.measureStems(p, 24000).rows, postEq: p.parts.map(pt => {
    const s = M.renderPiece(p, 24000, { master: 'none', only: q => q.id === pt.id });
    return { id: pt.id, rmsDb: M.stemRms(s.dry[0], s.dry[1], 24000) };
  }) };
  console.log(`modeled ${name} md5 ${modeled[name].md5}`);
}
if (mode === 'baseline') {
  writeFileSync(new URL('baseline.json', dir), JSON.stringify(modeled, null, 2));
  console.log('baseline captured');
} else {
  const before = JSON.parse(readFileSync(new URL('baseline.json', dir)));
  for (const name of names) if (before[name].md5 !== modeled[name].md5) throw new Error(`${name}: no-pack bytes changed`);
  console.log('no-pack byte identity PASS (all three pieces)');
}
if (pack) {
  loadBanks(M, pack, [...new Set(names.flatMap(name => soundIds(M.DEMOS[name]())))]);
  const results = [];
  for (const name of names) {
    const p = M.DEMOS[name](), r = M.renderPiece(p, 48000, { stems: true }), masking = M.maskingCheck(p, 48000, { seconds: r.L.length / 48000, perf: r.perf });
    printSounds(M, p);
    const stems = M.measureStems(p, 24000).rows, postEq = p.parts.map(pt => {
      const s = M.renderPiece(p, 24000, { master: 'none', only: q => q.id === pt.id });
      return { id: pt.id, rmsDb: M.stemRms(s.dry[0], s.dry[1], 24000) };
    });
    const lead = p.parts.find(pt => pt.role === 'melody').id;
    const balance = (model, sample) => sample.map(row => ({ id: row.id, errorDb:
      row.rmsDb - sample.find(x => x.id === lead).rmsDb - (model.find(x => x.id === row.id).rmsDb - model.find(x => x.id === lead).rmsDb) }));
    const preBalance = balance(modeled[name].stems, stems), postBalance = balance(modeled[name].postEq, postEq);
    const worst = Math.max(...preBalance.concat(postBalance).map(x => Math.abs(x.errorDb)));
    const pass = masking.pass && worst <= 2.5;
    results.push({ name, masking, worstBalanceDb: worst, preBalance, postBalance, pass });
    console.log(`${name}: masking ${masking.pass ? 'PASS' : 'FAIL'} ${100 * masking.shareOfBarsClear}% worst ${masking.worstMarginDb.toFixed(3)} dB; balance ${worst.toFixed(3)} dB ${worst <= 2.5 ? 'PASS' : 'FAIL'}`);
  }
  writeFileSync(new URL(`${mode}-pack.json`, dir), JSON.stringify(results, null, 2));
  if (mode !== 'baseline' && results.some(x => !x.pass)) process.exitCode = 1;
}
