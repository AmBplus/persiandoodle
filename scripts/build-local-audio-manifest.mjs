#!/usr/bin/env node
import {readFile, writeFile} from "node:fs/promises";

const manifestPath = "library/data/persian-renders.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const source = JSON.parse(await readFile("library/data/source-audio.json", "utf8"));
manifest.audio = Object.fromEntries(source.tracks.map((track) => [track.id, {
  source: track.source,
  kind: track.kind,
  category: track.category,
  titleFa: track.titleFa ?? track.slug,
  sourceUrl: track.sourceUrl ?? null,
  license: track.license ?? null,
  format: track.slug?.match(/\.[a-z0-9]+$/i)?.[0].slice(1) ?? "mp3",
  duration: track.duration ?? null,
  preview: null,
  licenseStatus: track.license ? "reference-only-until-local-rights-verified" : "needs-attribution-review",
  publicationStatus: "identified",
}]));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote metadata-only local audio manifest: ${Object.keys(manifest.audio).length} tracks`);
