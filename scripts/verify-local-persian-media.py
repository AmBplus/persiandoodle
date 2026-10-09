#!/usr/bin/env python3
"""Reject media manifests that point outside the built, locally hosted site."""
import json
import pathlib
import re
import sys

site = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "_site")
library = site / "library"
manifest = json.loads((library / "data/persian-renders.json").read_text(encoding="utf-8"))
catalog = json.loads((library / "data/catalog.json").read_text(encoding="utf-8"))
shots = json.loads((library / "data/shotcraft-full.json").read_text(encoding="utf-8"))
known = {x["id"] for x in catalog["entries"]} | {x["id"] for x in shots["items"]}
errors = []
allowed = re.compile(r"^media/[a-zA-Z0-9_/-]+\.(?:mp4|webm|webp|png|jpg|jpeg|mp3|ogg)$")
def verify(path, label):
    if not isinstance(path,str) or not allowed.fullmatch(path) or ".." in path:
        errors.append(f"{label}: invalid/non-local path: {path!r}")
        return
    target = library / path
    if not target.is_file() or target.stat().st_size == 0:
        errors.append(f"{label}: missing/empty asset {path}")

if manifest.get("schema") != "persiandoodle/persian-renders/v1":
    errors.append("unsupported manifest schema")
source_variant_counts = {x["id"]: len(x["styles"]) for x in shots["items"]}
for model_id, entry in manifest.get("renders",{}).items():
    if model_id not in known: errors.append(f"unknown model: {model_id}")
    for index, variant in enumerate(entry.get("variants",[])):
        if variant is None: continue
        if index >= source_variant_counts.get(model_id, 999999):
            errors.append(f"{model_id}: extra variant {index}")
        if variant.get("status") != "rendered-persian":
            errors.append(f"{model_id}[{index}]: unpublished status cannot enter public manifest")
        for field in ("video","poster","thumbnail","prompt","metadata"):
            if field in ("prompt","metadata"):
                # md and json are not browser media but must be local as well.
                p = variant.get(field)
                if not isinstance(p,str) or not p.startswith("media/") or ".." in p or pathlib.PurePosixPath(p).suffix not in (".md",".json"):
                    errors.append(f"{model_id}[{index}]: invalid {field}")
                elif not (library / p).is_file(): errors.append(f"{model_id}[{index}]: missing {field}: {p}")
            else: verify(variant.get(field), f"{model_id}[{index}].{field}")
for audio_id, audio in manifest.get("audio",{}).items():
    if audio.get("preview"): verify(audio["preview"],audio_id)
if errors:
    print("\n".join(errors),file=sys.stderr)
    sys.exit(1)
print(f"Local Persian media gate passed: {len(manifest.get('renders',{}))} model entries, {len(manifest.get('audio',{}))} audio entries")
