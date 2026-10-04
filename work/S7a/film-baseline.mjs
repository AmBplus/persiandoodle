import { build } from '../../skills/anidoodle/engine/node_modules/esbuild/lib/main.js';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { float32Wav } from '../../skills/anidoodle/engine/tools/audio.mjs';
const films = { launchExample: './skills/anidoodle/engine/src/canvas-core/launchExample.ts', scoredFilm: './work/S7a/scored-film.ts' }, hashes = {};
for (const [name, file] of Object.entries(films)) {
  const js = (await build({ stdin: { contents: `export { ${name} as film } from ${JSON.stringify(file)};`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm' })).outputFiles[0].text;
  const { film } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  const [L, R] = film.audio(48000), pcm = new Float32Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { pcm[i * 2] = L[i]; pcm[i * 2 + 1] = R[i]; }
  const wav = float32Wav({ sampleRate: 48000, frames: L.length, float32: Buffer.from(pcm.buffer).toString('base64') });
  writeFileSync(new URL(`${name}-before.wav`, import.meta.url), wav);
  hashes[name] = createHash('md5').update(wav).digest('hex');
  console.log(`${name}: ${film.meta.durationFrames / film.meta.fps}s md5 ${hashes[name]}`);
}
writeFileSync(new URL('film-baseline.json', import.meta.url), JSON.stringify(hashes, null, 2));
