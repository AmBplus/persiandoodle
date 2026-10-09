# PersianDoodle: self-hosted Persian render contract

This is an enforceable delivery requirement, not a reference-only showcase.

- Preserve all distinct source models and variants in the inventory. Never silently merge or substitute variants.
- Original videos, posters and audio URLs are INTERNAL REFERENCES only; the public player MUST NOT play source URLs.
- Each public variant needs its own original Persian reconstruction with Persian RTL text rendered correctly, motion-specific fidelity, independent video, poster, thumbnail, prompt and metadata.
- Keep final public media beneath `library/media/<source>/<model>/v<index>/` and reference it from `library/data/persian-renders.json` using project-relative `media/...` paths.
- Do not mark a variant `rendered-persian` until its media exists and is verified. No unverified fallback to upstream media.
- Reuse valid project-owned media; produce missing scene art when necessary, optimize WebP imagery and H.264 MP4 previews, and retain high-quality source compositions for future rendering.
- Preserve internal reference prompt links for research only. Audio previews also require a project-owned local asset.
- CI validates manifest entries and deployed files before publication. Empty manifest is an honest unrendered inventory, not a completed product.

Current state: ingestion and catalog exist; batch reconstruction of the variants remains to be carried out.
