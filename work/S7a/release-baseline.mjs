import { build } from '../../skills/anidoodle/engine/node_modules/esbuild/lib/main.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const prefix = 'skills/anidoodle/engine/', root = new URL('../../', import.meta.url).pathname;
const revision = execFileSync('git', ['rev-parse', 'release/0.6'], { encoding: 'utf8' }).trim();
const originalSources = { name: 'release-source', setup(b) { b.onLoad({ filter: /\.ts$/ }, a => ({ contents: execFileSync('git', ['show', `${revision}:${a.path.slice(root.length)}`], { encoding: 'utf8' }), loader: 'ts' })); } };
const js = (await build({ entryPoints: [root + prefix + 'src/canvas-core/music/index.ts'], plugins: [originalSources], bundle: true, format: 'esm', write: false })).outputFiles[0].text;
const M = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const before = JSON.parse(readFileSync(new URL('baseline.json', import.meta.url))), rows = [];
for (const name of ['marimbaCurious', 'harpTender', 'nocturne']) {
  const r = M.renderPiece(M.DEMOS[name](), 48000), md5 = createHash('md5').update(Buffer.from(r.L.buffer)).update(Buffer.from(r.R.buffer)).digest('hex');
  assert.equal(md5, before[name].md5, `${name}: release-derived baseline`);
  rows.push({ name, md5 }); console.log(`release/0.6 ${name}: ${md5} MATCH`);
}
writeFileSync(new URL('release-baseline.json', import.meta.url), JSON.stringify({ revision, rows }, null, 2));
console.log('RELEASE BASELINE PASS');
