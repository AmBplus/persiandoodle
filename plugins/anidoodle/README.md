# anidoodle

**Hand-drawn art, written as code.**

anidoodle makes illustrations, drawing timelapses, films of any length, explainers, infographics and interactive web animations in 31 hand-made styles, with original music composed and synthesized in code. Ask for a picture in plain words, match a style from your own image, recreate a photo in any style, keep a character consistent across scenes, or learn step by step how a drawing is built.

Every mark is a function and every note is arithmetic, so the same source redraws the same picture on every machine, at every size. There are no generated image assets and no image model calls.

## What it runs

- The skill writes and runs local Node.js scripts from its `engine/` folder (Node 20 or newer).
- The first render in a new project runs `npm install` for the engine's open-source dependencies (esbuild, playwright-core, typescript, and Remotion for some video work) and downloads a Chromium build with `npx playwright-core install chromium`. Moving pictures also use your local `ffmpeg`.
- Nothing else leaves your machine: no telemetry, no accounts, no API keys, and the rendered pages and bundles are checked for network calls.

## Links

- Source, gallery and full docs: https://github.com/alexgreensh/anidoodle
- License: Apache-2.0, by Alex Greenshpun
