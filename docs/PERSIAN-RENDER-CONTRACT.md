# PersianDoodle: self-hosted Persian render contract

This is an enforceable delivery requirement, not a reference-only showcase.

- Preserve all distinct source models and variants in the inventory. Never silently merge or substitute variants.
- Original videos, posters and audio URLs are INTERNAL REFERENCES only; the public player MUST NOT play source URLs.
- Each public variant needs its own original Persian reconstruction with Persian RTL text rendered correctly, motion-specific fidelity, independent video, poster, thumbnail, prompt, metadata and editable scene/config.
- Keep final public media beneath `library/media/<source>/<model>/v<index>/` and reference it from `library/data/persian-renders.json` using project-relative `media/...` paths.
- Do not mark a variant `rendered-persian`, `verified`, or `published` until its media exists and is verified. `identified`, `analyzed`, `in-progress`, and `needs-fix` variants remain searchable but have no playable fallback.
- Reuse valid project-owned media; produce missing scene art when necessary, optimize WebP imagery and H.264 MP4 previews, and retain high-quality source compositions for future rendering.
- Preserve internal reference prompt links for research only. Audio previews also require a project-owned local asset.
- CI validates the complete inventory, manifest entries, and deployed files before publication. An inventory with zero published variants is an honest state, not a completed product.

Current state: source inventory and local-only manifest gate are in place; native batch reconstruction of the variants remains to be carried out.
