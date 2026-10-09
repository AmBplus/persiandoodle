# PersianDoodle: Persian typography and Urdu Nastaliq

## Sources and redistribution

The originals are committed at `skills/anidoodle/engine/assets/fonts/` (and mirrored inside `plugins/anidoodle/skills/anidoodle/engine/assets/fonts/`), **with individual original licenses** in `licenses/`. The list is intentionally curated; "all fonts on the internet" is neither legally auditable nor practical for an offline film exporter.

| Canvas family | File | Original repository | Best use | License |
|---|---|---|---|---|
| Vazirmatn | Vazirmatn-Variable.ttf | [rastikerdar/vazirmatn](https://github.com/rastikerdar/vazirmatn) | legible UI, body and titles | OFL-1.1 |
| Vazirmatn RD | Vazirmatn-RD-Regular.ttf | [rastikerdar/vazirmatn](https://github.com/rastikerdar/vazirmatn) | rounded, approachable | OFL-1.1 |
| Shabnam | Shabnam-Regular.ttf | [rastikerdar/shabnam-font](https://github.com/rastikerdar/shabnam-font) | softer explanatory graphics | upstream license in tree |
| Sahel | Sahel-Variable.ttf | [rastikerdar/sahel-font](https://github.com/rastikerdar/sahel-font) | concise titles | upstream license in tree |
| Samim | Samim-Regular.ttf | [rastikerdar/samim-font](https://github.com/rastikerdar/samim-font) | readable captions | upstream license in tree |
| Gandom | Gandom-Regular.ttf | [rastikerdar/gandom-font](https://github.com/rastikerdar/gandom-font) | personable editorial type | upstream license in tree |
| Tanha | Tanha-Regular.ttf | [rastikerdar/tanha-font](https://github.com/rastikerdar/tanha-font) | distinctive headings | author PD + Bitstream Vera + Roboto notices |
| Parastoo | Parastoo-Regular.ttf | [rastikerdar/parastoo-font](https://github.com/rastikerdar/parastoo-font) | classic display/body | upstream license in tree |
| Nahid | Nahid-Regular.ttf | [rastikerdar/nahid-font](https://github.com/rastikerdar/nahid-font) | distinctive single weight | author PD + Bitstream Vera + Roboto notices |
| Vazir Code | Vazir-Code-Regular.ttf | [rastikerdar/vazir-code-font](https://github.com/rastikerdar/vazir-code-font) | technology/code graphics | author PD + Bitstream Vera notices |
| Estedad | Estedad-Variable.ttf | [aminabedi68/Estedad](https://github.com/aminabedi68/Estedad) | expressive editorial headlines | OFL-1.1 |
| Lalezar | Lalezar-Regular.ttf | [BornaIz/Lalezar](https://github.com/BornaIz/Lalezar) | posters and short bold headlines | OFL-1.1 |
| Amiri | Amiri-Regular.ttf | [google/fonts: amiri](https://github.com/google/fonts/tree/main/ofl/amiri) | book typography and classical Naskh | OFL-1.1 |
| Aref Ruqaa | ArefRuqaa-Regular.ttf | [google/fonts: arefruqaa](https://github.com/google/fonts/tree/main/ofl/arefruqaa) | Ruqaa-style expressive lettering | OFL-1.1 |
| Katibeh | Katibeh-Regular.ttf | [google/fonts: katibeh](https://github.com/google/fonts/tree/main/ofl/katibeh) | calligraphic historical poster | OFL-1.1 |
| Markazi Text | MarkaziText-Variable.ttf | [google/fonts: markazitext](https://github.com/google/fonts/tree/main/ofl/markazitext) | literary Arabic/Persian text | OFL-1.1 |
| Lemonada | Lemonada-Variable.ttf | [google/fonts: lemonada](https://github.com/google/fonts/tree/main/ofl/lemonada) | contemporary Naskh/Diwani display | OFL-1.1 |
| Noto Kufi Arabic | NotoKufiArabic-Variable.ttf | [google/fonts: notokufiarabic](https://github.com/google/fonts/tree/main/ofl/notokufiarabic) | Kufic geometric headlines | OFL-1.1 |
| Noto Naskh Arabic | NotoNaskhArabic-Variable.ttf | [google/fonts: notonaskharabic](https://github.com/google/fonts/tree/main/ofl/notonaskharabic) | neutral traditional Naskh | OFL-1.1 |
| Baloo Bhaijaan 2 | BalooBhaijaan2-Variable.ttf | [google/fonts: baloobhaijaan2](https://github.com/google/fonts/tree/main/ofl/baloobhaijaan2) | playful rounded headlines | OFL-1.1 |
| Reem Kufi | ReemKufi-Variable.ttf | [google/fonts: reemkufi](https://github.com/google/fonts/tree/main/ofl/reemkufi) | contemporary geometric Kufi | OFL-1.1 |
| Scheherazade New | ScheherazadeNew-Regular.ttf | [google/fonts: scheherazadenew](https://github.com/google/fonts/tree/main/ofl/scheherazadenew) | dense religious and literary text, verify Persian styling | OFL-1.1 |
| Lateef | Lateef-Regular.ttf | [google/fonts: lateef](https://github.com/google/fonts/tree/main/ofl/lateef) | lightweight elegant Naskh | OFL-1.1 |
| Gulzar | Gulzar-Regular.ttf | [googlefonts/Gulzar](https://github.com/googlefonts/Gulzar) | Urdu Nastaliq and Persian feasibility study | OFL-1.1 |
| Noto Nastaliq Urdu | NotoNastaliqUrdu-Variable.ttf | [google/fonts](https://github.com/google/fonts/tree/main/ofl/notonastaliqurdu) | alternate Urdu Nastaliq, variable weight comparison | OFL-1.1 |

Do not import commercial IRANSans, IRANYekan, Dana, Peyda, Kalameh or similar fonts without a clear redistribution license. Modifications to fonts covered by reserved font names must be renamed before redistribution. Preserve author and upstream licenses. The Bitstream-based fonts do not all use OFL; read their separate licenses.

## How to use

From the canonical `skills/anidoodle/engine/` (the plugin copy is mirrored):

```ts
import { drawPersianTrace } from "./src/canvas-core/persianTrace";

// Inside your Film shot.draw(ctx, local, env):
drawPersianTrace(ctx, env, {
  text: "می‌توانیم روی طرح‌های ۱۴۰۵ کار کنیم",
  family: "Vazirmatn",
  x: 1110, y: 240, size: 56,
  progress: Math.min(1, local / 56),
  pen: true,
});
```

Add the chosen face to `film.assets.fonts` using a local path relative to the engine directory. `tools/build-page.mjs` embeds its bytes into the offline HTML; `src/hosts/page.ts` registers every `FontFace` and waits for it before frame 0. Family names in `film.assets.fonts` must match `drawPersianTrace.family`.

For the complete demonstration:

```sh
cd skills/anidoodle/engine
npm install
node tools/persian-qa.mjs
# outputs 25 font samples + 20 pen-trace samples + the Persian demo MP4
# additional interactive HTML: node tools/build-page.mjs persianGallery
```

## Correct text shaping and animation

- Canvas renders each complete logical string with `direction="rtl"`, `textAlign="right"`. The ink/type reveal clips the **already shaped full string**; never split and paint one character at a time.
- `normalizeIranianPersian` converts Arabic kaf/yeh glyph codes to Iranian forms while retaining ZWNJ and punctuation. Disable this normalization for genuine Urdu examples (`normalize: false`).
- `persianDigits` is opt-in. Mixed Persian/Latin runs rely on the browser's Unicode bidirectional layout.
- `ink` simulates an RTL ink sweep with a traveling nib. `type` reveals in grapheme-sized steps without breaking contextual shaping.
- `drawPersianTrace(ctx, env, opts)` traces a cached one-pixel skeleton extracted from the browser-shaped full text and places a nib on real glyph interior paths. The line broadens near the end, then resolves to the original font. This draws lines rather than sweeping a rectangular reveal.
- It is **not a true handwritten calligrapher's stroke-order model**; without real centreline metadata for each glyph and GSUB/GPOS-aware stroke topology, stroke/mark sequencing remains an approximation. `drawPersianText` remains available for lightweight reveal.
- Always check actual glyphs at 0/25/50/75/100%, including `می‌روم`, `ی`, `ک`, `۰۱۲۳۴۵۶۷۸۹`, joining, RTL/LTR and punctuation. Large vertical metrics and diagonal baselines need room.

## Urdu font adaptation backlog

Gulzar and Noto Nastaliq Urdu are preserved unchanged as licensed upstream fonts. It is a useful Nastaliq comparison, but Urdu line-height, dots, glyph alternates and typography are not a drop-in Iranian Persian design. Next stages: fontTools cmap/GSUB/GPOS audit, Iranian native visual review of ی/ک/ه/ۀ/ة/ZWNJ, Persian numerals, punctuation, multiple weights and collision tests. Only after review should a *renamed derivative* be produced under the permitted license.

## QA status

The source code, 25 original font binaries and test/gallery generator are committed. A GitHub Actions job at `.github/workflows/persian-qa.yml` can render a 25-frame contact sheet. Run the commands above to verify full browser rendering in the target system. The first 14-font test completed all 13 unit checks and captured 16 reproducible browser frames. Actual frames were inspected and compared, including Urdu Nastaliq. The expanded 25-font gallery and 4-scene Persian handwritten film render in GitHub Actions. Native Iranian calligrapher review and font-specific stroke reconstruction remain future quality upgrades.
