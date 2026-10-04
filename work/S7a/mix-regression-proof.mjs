import { build } from '../../skills/anidoodle/engine/node_modules/esbuild/lib/main.js';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const engine = new URL('../../skills/anidoodle/engine/', import.meta.url).pathname;
for (const mode of ['current', 'without-support-eq', 'without-guard-context']) {
  const plugins = [{ name: mode, setup(b) {
    b.onLoad({ filter: /(?:mixProfiles|guards)\.ts$/ }, ({ path }) => {
      let contents = readFileSync(path, 'utf8');
      if (mode === 'without-support-eq' && path.endsWith('/mixProfiles.ts'))
        contents = contents.replace('if (role !== "bass" && role !== "accomp") return e;', 'return e;');
      if (mode === 'without-guard-context' && path.endsWith('/guards.ts'))
        contents = contents.replace(', mixKeys: perf.parts.map(p => p.keys)', '');
      return { contents, loader: 'ts' };
    });
  } }];
  const js = (await build({ entryPoints: [engine + 'test/recordedMix.test.ts'], bundle: true, format: 'esm', write: false, plugins })).outputFiles[0].text;
  const test = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64') + '#' + mode);
  const failed = [];
  test.run((pass, label) => { if (!pass) failed.push(label); });
  console.log(`${mode}: ${failed.length} failures${failed.length ? '\n  ' + failed.join('\n  ') : ''}`);
  assert.equal(failed.length, mode === 'current' ? 0 : 1);
}
console.log('MIX REGRESSION PROOF PASS');
