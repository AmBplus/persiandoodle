import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { buildPage } from '../../skills/anidoodle/engine/tools/build-page.mjs';
import { loadFilmModule, prepareFilmSounds, filmFloat32, float32Wav } from '../../skills/anidoodle/engine/tools/audio.mjs';
import { overlay } from '../../skills/anidoodle/engine/tools/overlay.mjs';
import { detect } from '../../skills/anidoodle/engine/tools/detect.mjs';
import { execFileSync } from 'node:child_process';
const root = new URL('../../skills/anidoodle/engine/', import.meta.url).pathname;
process.chdir(root);
const dir = new URL('./', import.meta.url).pathname, pack = process.argv[2], expected = JSON.parse(readFileSync(dir + 'film-baseline.json'));
const fixture = { name: 'S7a-proof-fixture', setup(b) { b.onResolve({ filter: /\/canvas-core\/scoredFilm$/ }, () => ({ path: dir + 'scored-film.ts' })); } };
const plugins = [fixture, overlay], md5 = b => createHash('md5').update(b).digest('hex');
const prefix = 'skills/anidoodle/engine/';
const baselineRevision = 'b0be4f708b2dc7f59dc8704f515c16885ae4e5fb';
const original = new Map(execFileSync('git', ['diff', baselineRevision, '--name-only'], { encoding: 'utf8' }).trim().split('\n').filter(p => p.startsWith(prefix + 'src/') && p.endsWith('.ts')).map(p => [root + p.slice(prefix.length), execFileSync('git', ['show', `${baselineRevision}:${p}`], { encoding: 'utf8' })]));
const beforeSources = { name: 'S7a-original-sources', setup(b) { b.onLoad({ filter: /\.ts$/ }, a => original.has(a.path) ? { contents: original.get(a.path), loader: 'ts' } : undefined); } };
const env = detect();
assert(env.chosen, 'offline browser must be available');
const browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath, args: ['--disable-background-timer-throttling'] });
const rows = [];
try {
  for (const title of ['launchExample', 'scoredFilm']) {
    for (const recorded of [false, true]) {
      process.env.ANIDOODLE_SOUNDS = recorded ? pack : '';
      const { film, music } = await loadFilmModule(title, plugins);
      const usesPack = prepareFilmSounds(film, music), audio = filmFloat32(film), wav = float32Wav(audio), hash = md5(wav);
      const label = `${title}-${recorded ? 'pack' : 'modeled'}`, entry = title === 'scoredFilm' ? dir + 'page-scoredFilm.ts' : 'src/hosts/page-launchExample.ts';
      writeFileSync(dir + label + '.wav', wav);
      if (!recorded || title === 'launchExample') assert.equal(hash, expected[title], `${label}: baseline byte identity`);
      else { assert(usesPack); assert.notEqual(hash, expected[title]); }
      const built = await buildPage({ entry, out: dir + label + '.html', title, plugins: [fixture] });
      const page = await browser.newPage(), errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => errors.push(r.url()));
      page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url()); });
      await page.goto(pathToFileURL(built.out).href + '?adapter=1');
      await page.evaluate(async () => { await window.FILM.ready; window.FILM.seek(0); });
      const played = await page.evaluate(() => window.FILM.audio(48000));
      let reference = audio, proof = 'Node/browser sample identity';
      if (!usesPack) {
        const before = await buildPage({ entry, out: dir + label + '-original.html', title, plugins: [beforeSources, fixture] });
        const oldPage = await browser.newPage(); await oldPage.goto(pathToFileURL(before.out).href + '?adapter=1');
        reference = await oldPage.evaluate(() => window.FILM.audio(48000)); await oldPage.close();
        proof = 'original/current browser byte identity';
      }
      assert.equal(md5(Buffer.from(played.float32, 'base64')), md5(Buffer.from(reference.float32, 'base64')), `${label}: ${proof}`);
      assert.equal(played.frames, audio.frames);
      assert.deepEqual(errors, []); assert.deepEqual(requests, []);
      const smaller = await page.evaluate(() => window.FILM.audio(24000));
      assert.equal(smaller.frames, audio.frames / 2);
      await page.close();
      // Exercise click-to-play at a device rate different from the pinned 48 kHz track.
      const player = await browser.newPage(); player.on('pageerror', e => errors.push(e.message));
      await player.addInitScript(() => {
        const Native = window.AudioContext;
        window.__played__ = null;
        window.AudioContext = class extends Native {
          constructor() { super({ sampleRate: 44100 }); }
          createBuffer(channels, frames, sr) { window.__played__ = { frames, sr }; return super.createBuffer(channels, frames, sr); }
        };
      });
      await player.goto(pathToFileURL(built.out).href); await player.evaluate(async () => { await window.FILM.ready; });
      await player.locator('canvas').click();
      const click = await player.evaluate(() => window.__played__);
      assert(click && click.frames > 0); assert.equal(click.sr, usesPack ? 48000 : 44100);
      assert.deepEqual(errors, []); await player.close();
      rows.push({ label, md5: hash, browserPcmMd5: md5(Buffer.from(played.float32, 'base64')), frames: audio.frames, recorded: usesPack, proof, outsideRequests: requests.length, clickSampleRate: click.sr });
      console.log(`${label}: md5 ${hash}; ${proof} PASS; offline 0 requests; click ${click.sr} Hz PASS`);
    }
  }
  writeFileSync(dir + 'film-proof.json', JSON.stringify(rows, null, 2));
  console.log('FILM PROOF PASS');
} finally { await browser.close(); }
