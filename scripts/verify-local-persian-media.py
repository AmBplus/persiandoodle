#!/usr/bin/env python3
"""Validate the complete source inventory and any locally published media."""
import json
import pathlib
import re
import sys

site = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "_site")
library = site / "library"
manifest = json.loads((library / "data/persian-renders.json").read_text(encoding="utf-8"))
catalog = json.loads((library / "data/catalog.json").read_text(encoding="utf-8"))
shots = json.loads((library / "data/shotcraft-full.json").read_text(encoding="utf-8"))
visual_kinds = {"shot", "motion", "style", "explainer"}
catalog_visual = {x["id"]: x for x in catalog["entries"] if x.get("kind") in visual_kinds}
shot_variant_counts = {x["id"]: len(x["styles"]) for x in shots["items"]}
expected_ids = set(catalog_visual)
known_ids = expected_ids | set(shot_variant_counts)
errors = []
media_path = re.compile(r"^media/[a-zA-Z0-9_./-]+\.(?:mp4|webm|webp|png|jpg|jpeg|mp3|ogg)$")
document_path = re.compile(r"^media/[a-zA-Z0-9_./-]+\.(?:md|json)$")
statuses = {"identified", "analyzed", "in-progress", "rendered-persian", "verified", "published", "needs-fix"}
public_statuses = {"rendered-persian", "verified", "published"}
max_video_bytes = 2_000_000

def check_path(path, label, pattern):
    if not isinstance(path, str) or not pattern.fullmatch(path) or ".." in path:
        errors.append(f"{label}: invalid/non-local path: {path!r}")
        return
    target = library / path
    if not target.is_file() or target.stat().st_size == 0:
        errors.append(f"{label}: missing/empty asset {path}")

def check_media(path, label):
    check_path(path, label, media_path)
    if isinstance(path, str) and path.lower().endswith(".mp4"):
        target = library / path
        if target.is_file() and target.stat().st_size > max_video_bytes:
            errors.append(f"{label}: MP4 exceeds web size budget ({target.stat().st_size} > {max_video_bytes} bytes)")

def check_document(path, label):
    check_path(path, label, document_path)

if manifest.get("schema") != "persiandoodle/persian-renders/v1":
    errors.append("unsupported manifest schema")
actual_ids = set(manifest.get("renders", {}))
for model_id in sorted(expected_ids - actual_ids):
    errors.append(f"missing inventory model: {model_id}")
for model_id in sorted(actual_ids - known_ids):
    errors.append(f"unknown model: {model_id}")

for model_id, entry in manifest.get("renders",{}).items():
    if entry.get("status") not in statuses:
        errors.append(f"{model_id}: unsupported model status {entry.get('status')!r}")
    expected_count = shot_variant_counts.get(model_id, 1)
    variants = entry.get("variants", [])
    if len(variants) != expected_count:
        errors.append(f"{model_id}: expected {expected_count} variant slots, got {len(variants)}")
    seen_keys = set()
    for index, variant in enumerate(variants):
        if not isinstance(variant, dict):
            errors.append(f"{model_id}[{index}]: variant is not an object")
            continue
        key = variant.get("key")
        if not isinstance(key, str) or not key:
            errors.append(f"{model_id}[{index}]: missing variant key")
        elif key in seen_keys:
            errors.append(f"{model_id}[{index}]: duplicate variant key {key}")
        seen_keys.add(key)
        status = variant.get("status")
        if status not in statuses:
            errors.append(f"{model_id}[{index}]: unsupported status {status!r}")
        fields = ("video", "poster", "thumbnail", "prompt", "metadata", "scene")
        if status in public_statuses:
            for field in fields:
                value = variant.get(field)
                if field in ("prompt", "metadata", "scene"):
                    check_document(value, f"{model_id}[{index}].{field}")
                else:
                    check_media(value, f"{model_id}[{index}].{field}")
        else:
            for field in fields:
                if variant.get(field) is not None:
                    errors.append(f"{model_id}[{index}]: non-public variant has media field {field}")
for audio_id, audio in manifest.get("audio",{}).items():
    if audio.get("preview"): check_media(audio["preview"], audio_id)
if errors:
    print("\n".join(errors),file=sys.stderr)
    sys.exit(1)
print(f"Local Persian media gate passed: {len(actual_ids)} complete model inventories, {sum(len(x.get('variants', [])) for x in manifest.get('renders', {}).values())} variant slots, {len(manifest.get('audio', {}))} audio entries")
