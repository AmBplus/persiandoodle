// THE ONE GENERATED PAGE. Playwright, the HTML player and (Phase 5) Hyperframes all drive this
// same page through window.FILM. Everything host-specific (DOM, clocks, asset decoding, Web
// Audio) lives HERE; the art core never sees it.
import type { Ctx, Env, Layer } from "../canvas-core/core";
import { Film, renderFrame, validate } from "../canvas-core/film";

declare global { interface Window { FILM: unknown; __ASSETS__?: Record<string, string> } }

export const mountFilm = (film: Film) => {
  const canvas = document.getElementById("film") as HTMLCanvasElement, images = new Map<string, CanvasImageSource>();
  let env: Env, ctx: Ctx, current = 0;
  // Safari before 16.4 has no 2D OffscreenCanvas: fall back to a detached <canvas>. The core cannot tell the difference.
  const opts = film.meta.raster === "cpu" ? { willReadFrequently: true } : undefined;   // see Film.meta.raster
  const surface = (w: number, h: number): Layer => { const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }); return { canvas: c, ctx: c.getContext("2d", opts) as unknown as Ctx } as Layer; };
  const mount = (scale = 1) => { canvas.width = Math.round(film.meta.W * scale); canvas.height = Math.round(film.meta.H * scale); ctx = canvas.getContext("2d", opts) as CanvasRenderingContext2D; env = { W: film.meta.W, H: film.meta.H, scale, cache: new Map(), canvas: surface, image: (n) => images.get(n) }; return film.meta; };
  // contract rule 4: every asset is loaded AND decoded before frame 0, or the film refuses to start
  const ready = (async () => {
    const problems = validate(film); if (problems.length) throw new Error("timeline: " + problems.join("; "));
    await Promise.all(Object.entries(film.assets.images).map(async ([name, url]) => { const img = new Image(); img.src = window.__ASSETS__?.[name] ?? url; await img.decode(); images.set(name, img); }));
    mount(1); return film.meta;
  })();
  const seek = (frame: number) => { const t0 = performance.now(); const shot = renderFrame(film, ctx, frame, env); ctx.getImageData(0, 0, 1, 1); current = frame; return { shot, ms: performance.now() - t0 }; }; // getImageData forces the deferred raster so the timing is real
  const hash = () => { const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
  const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  // MOTION BLUR. One output frame as the average of subframes spread over a one-frame shutter
  // centred on it, confined to its own shot so nothing bleeds across a cut. The average is taken
  // in LINEAR light: blur is light integration, and averaging in sRGB darkens every moving edge.
  // It is also ALPHA-WEIGHTED (premultiplied): a transparent subframe carries no colour, so a
  // sticker's moving edge fades out instead of picking up a dark fringe from the zero RGB that
  // canvas keeps under alpha 0. Opaque pixels take exactly the unweighted path.
  // STEPPED ART (meta.step > 1, or onTwos) holds each drawing for `step` frames, so the shutter
  // would straddle two drawings and smear a pose into its neighbour: such films are not blurred.
  // hosts may keep time; the core never does.
  const toLin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const s = i / 255; toLin[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
  const fromLin = (l: number) => { const v = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(v * 255))); };
  const blur = (frame: number, samples: number) => {
    const n = Math.max(0, Math.min(film.meta.durationFrames - 1, Math.round(frame))), shot = film.shots.find((s) => n >= s.start && n < s.end);
    if (!shot || samples < 2 || (film.meta.step ?? (film.meta.onTwos ? 2 : 1)) > 1) { const r = seek(n); return { shot: r.shot, ms: r.ms }; }
    const t0 = performance.now(), w = canvas.width, h = canvas.height, acc = new Float64Array(w * h * 4);
    for (let i = 0; i < samples; i++) {
      const t = Math.min(shot.end - 1, Math.max(shot.start, n + (i + 0.5) / samples - 0.5));
      renderFrame(film, ctx, t, env);
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let p = 0; p < d.length; p += 4) { const a = d[p + 3], k = a / 255; acc[p] += toLin[d[p]] * k; acc[p + 1] += toLin[d[p + 1]] * k; acc[p + 2] += toLin[d[p + 2]] * k; acc[p + 3] += a; }
    }
    const img = ctx.createImageData(w, h), o = img.data, inv = 1 / samples, full = 255 * samples;
    for (let p = 0; p < o.length; p += 4) {
      const A = acc[p + 3]; if (A === 0) continue; // nothing was ever drawn here: stays transparent black
      const c = A === full ? inv : 255 / A; // premultiplied average, un-premultiplied by the mean alpha
      o[p] = fromLin(acc[p] * c); o[p + 1] = fromLin(acc[p + 1] * c); o[p + 2] = fromLin(acc[p + 2] * c); o[p + 3] = Math.round(A * inv);
    }
    ctx.putImageData(img, 0, 0); current = n;
    return { shot: shot.id, ms: performance.now() - t0 };
  };
  const audio = (sr: number) => { if (!film.audio) return null; const [L, R] = film.audio(sr); if (L.length !== R.length) throw new Error("audio channels have different lengths"); const pcm = new Float32Array(L.length * 2); for (let i = 0; i < L.length; i++) { pcm[i * 2] = L[i]; pcm[i * 2 + 1] = R[i]; } return { sampleRate: sr, frames: L.length, float32: b64(new Uint8Array(pcm.buffer)) }; };
  const warm = () => film.shots.forEach((s) => { seek(s.start); seek(s.start + ((s.end - s.start) >> 1)); }); // first + middle frame of every shot: builds tiles, pre-allocates the layer pool
  window.FILM = { meta: { ...film.meta, shots: film.shots.map(({ id, start, end }) => ({ id, start, end })) }, ready, mount, seek, hash, audio, warm, blur, png: () => canvas.toDataURL("image/png").slice(22), frame: () => current };

  // ---- the player: click or space to play, arrows to step, ?frame=N to open on a frame
  ready.then(() => {
    const q = new URLSearchParams(location.search); if (q.has("adapter")) return; // a backend is driving: stay still
    seek(Number(q.get("frame") ?? 0));
    let playing = false, ac: AudioContext | null = null, t0 = 0, f0 = 0, node: AudioBufferSourceNode | null = null;
    const stop = () => { playing = false; node?.stop(); node = null; };
    const play = () => {
      ac ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); playing = true; f0 = current >= film.meta.durationFrames - 1 ? 0 : current; t0 = ac.currentTime;
      if (film.audio) { const [L, R] = film.audio(ac.sampleRate), buf = ac.createBuffer(2, L.length, ac.sampleRate); buf.getChannelData(0).set(L); buf.getChannelData(1).set(R); node = ac.createBufferSource(); node.buffer = buf; node.connect(ac.destination); node.start(0, f0 / film.meta.fps); }
      const tick = () => { if (!playing) return; const f = f0 + Math.floor((ac!.currentTime - t0) * film.meta.fps); if (f >= film.meta.durationFrames) { seek(film.meta.durationFrames - 1); stop(); return; } if (f !== current) seek(f); requestAnimationFrame(tick); }; tick();
    };
    const toggle = () => (playing ? stop() : play());
    canvas.addEventListener("click", toggle);
    addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); toggle(); } if (e.key === "ArrowRight") { stop(); seek(Math.min(film.meta.durationFrames - 1, current + 1)); } if (e.key === "ArrowLeft") { stop(); seek(Math.max(0, current - 1)); } });
  });
};
