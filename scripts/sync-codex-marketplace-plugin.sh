#!/usr/bin/env bash
# sync-codex-marketplace-plugin.sh
#
# Regenerates plugins/anidoodle/ (the self-contained plugin folder) from the canonical skill at
# skills/anidoodle/, the Codex and Claude manifests, LICENSE, NOTICE and scripts/plugin-README.md.
# Codex installs it from .agents/plugins/marketplace.json, Grok from .grok-plugin/marketplace.json,
# and it is the folder submitted to directories that want a plugin without the repo's demo media.
#
# WHY: Codex resolves marketplace plugins only from a subdirectory (./plugins/<name>), and its
# install copy does not follow symlinks, so the nested plugin must hold real files.
# WHY git ls-files: the mirror copies ONLY files tracked by git. Private work (gitignored
# recreations, scratch renders, node_modules) can never leak into the published plugin.
#
# Run before every release; scripts are idempotent (an in-sync tree gives no git diff).
set -euo pipefail
[ -n "${BASH_VERSION:-}" ] || { echo "ERROR: run with bash" >&2; exit 2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for marker in ".agents/plugins/marketplace.json" ".codex-plugin/plugin.json" ".claude-plugin/plugin.json" \
              "scripts/plugin-README.md" "LICENSE" "NOTICE" "skills/anidoodle/SKILL.md"; do
  [ -e "${REPO_ROOT}/${marker}" ] || { echo "ERROR: REPO_ROOT looks wrong (missing ${marker}): ${REPO_ROOT}" >&2; exit 3; }
done

NESTED="${REPO_ROOT}/plugins/anidoodle"
mkdir -p "${REPO_ROOT}/plugins"
STAGE="$(mktemp -d "${REPO_ROOT}/plugins/.stage-XXXXXX")"
trap 'rm -rf "${STAGE}"' EXIT

mkdir -p "${STAGE}/.codex-plugin"
cp "${REPO_ROOT}/.codex-plugin/plugin.json" "${STAGE}/.codex-plugin/plugin.json"
mkdir -p "${STAGE}/.claude-plugin"
cp "${REPO_ROOT}/.claude-plugin/plugin.json" "${STAGE}/.claude-plugin/plugin.json"
cp "${REPO_ROOT}/scripts/plugin-README.md" "${STAGE}/README.md"
cp "${REPO_ROOT}/LICENSE" "${REPO_ROOT}/NOTICE" "${STAGE}/"
mkdir -p "${STAGE}/assets"
cp "${REPO_ROOT}/assets/icon.png" "${STAGE}/assets/icon.png"
cd "${REPO_ROOT}"
# The installed plugin leaves out what only the repository needs: anidoodle's own launch films
# (launch, launch2, launch3, launchClip and their helpers and pages), the public-domain reference
# image they show, and the gallery sheet and the tool that rebuilds it (the docs link to it online).
EXCLUDE='/canvas-core/(launch|launch2|launch3|launchClip|launchCode|typeOptions|typeStyles)\.ts$|/hosts/page-(launch|launch2|launch3|launchClip|typeOptions|typeStyles)\.ts$|/engine/assets/refs/|/engine/tools/gallery\.mjs$|^skills/anidoodle/assets/styles\.jpg$|/engine/package-lock\.json$|/music/blind/'
count=0
while IFS= read -r f; do
  mkdir -p "${STAGE}/$(dirname "$f")"; cp -p "$f" "${STAGE}/$f"; count=$((count + 1))
done < <(git ls-files skills/ | grep -v -E "${EXCLUDE}")

[ -f "${STAGE}/skills/anidoodle/SKILL.md" ] || { echo "ERROR: SKILL.md missing after copy (is it committed?)" >&2; exit 4; }
[ "${count}" -ge 50 ] || { echo "ERROR: only ${count} files copied; expected the whole skill" >&2; exit 4; }

rm -rf "${NESTED}"; mv "${STAGE}" "${NESTED}"; trap - EXIT
echo "Synced plugin folder -> plugins/anidoodle (${count} tracked files, $(grep -o '"version"[^,]*' "${NESTED}/.codex-plugin/plugin.json" | head -1))"
