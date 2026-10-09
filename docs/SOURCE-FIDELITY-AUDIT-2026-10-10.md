# 2026-10-10 Source fidelity audit

- Verified access: AmBplus/persiandoodle (write/admin).
- Source inventory retained: 157 Shotcraft source cards / 214 variants, 15 MG, 108 Talkcraft, 45 Explainer, 24 OneTake.
- Withdrawn: 406 previously published synthetic video previews + associated posters/thumbnails/prompts/scenes.
- Root problem: same five-family motion generator applied to unrelated visual categories, 3s generic render substituted for detailed 5.2s Shotcraft, 10s MG etc.
- Provenance: each variant has its own `library/entries/<source>/<model>/vN/origin.json` containing exact source URL and `localization.fa.json` identifying on-screen-text-only replacement (pending actual source-by-source transcription).
- Native engine and source indexes preserved, no forced deletion of other project assets.
- NOT DONE: verified faithful Persian renders, frame-by-frame comparison, audio recreation, deployed browser QA. Do not mark these completed without evidence.
- Gate: raw prompt content must be preserved verbatim and linked to its author/version; no generic style prompt may be labeled original.
