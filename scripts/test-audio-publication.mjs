#!/usr/bin/env node
import {readFile} from "node:fs/promises";
const manifest = JSON.parse(await readFile("library/data/persian-renders.json", "utf8"));
const tracks = Object.values(manifest.audio ?? {});
const assert = (value, message) => { if (!value) throw new Error(message); };
assert(tracks.length === 154, `audio inventory changed: ${tracks.length}`);
assert(tracks.filter((track) => track.kind === "music").length === 5, "music inventory changed");
assert(tracks.filter((track) => track.kind === "sfx").length === 149, "SFX inventory changed");
assert(tracks.every((track) => track.preview === null && track.publicationStatus === "identified"), "unverified audio was exposed as local playback");
console.log("PASS: 5 music and 149 SFX remain indexed without foreign or unverified public playback");
