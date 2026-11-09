#!/bin/bash
# Run on macOS. No package manager, cloud TTS, or network access is used.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/scripts/audio-manifest.tsv"
OUTPUT="$ROOT/assets/audio"
FORCE=0
case "${1:-}" in
  '') ;;
  --force) FORCE=1 ;;
  *) echo "Usage: $0 [--force]" >&2; exit 2 ;;
esac
if ! command -v say >/dev/null || ! command -v afconvert >/dev/null; then
  echo 'This script requires macOS say and afconvert. The app still works with browser speech synthesis.' >&2
  exit 1
fi
mkdir -p "$OUTPUT"
TASK_TMP="$(mktemp -d "${TMPDIR:-/tmp}/dressup-audio.XXXXXX")"
cleanup() { rm -rf "$TASK_TMP"; }
trap cleanup EXIT
write_inventory() {
  local first=1 id voice rate text
  printf '// Generated audio files. Unlisted ids use browser speech synthesis.\nexport const AUDIO_FILES = [' > "$OUTPUT/available.js"
  while IFS=$'\t' read -r id voice rate text; do
    [ "$id" = 'id' ] && continue
    [ -z "$id" ] && continue
    if [ -s "$OUTPUT/$id.m4a" ]; then
      [ "$first" -eq 1 ] || printf ', ' >> "$OUTPUT/available.js"
      printf '"%s"' "$id" >> "$OUTPUT/available.js"
      first=0
    fi
  done < "$MANIFEST"
  printf '];\n' >> "$OUTPUT/available.js"
}
trap 'write_inventory; cleanup' EXIT
total=0
failed=0
while IFS=$'\t' read -r id voice rate text; do
  [ "$id" = 'id' ] && continue
  [ -z "$id" ] && continue
  if [[ ! "$id" =~ ^[a-zA-Z0-9_]+$ ]]; then echo "Invalid audio id: $id" >&2; exit 1; fi
  total=$((total + 1))
  if [ -s "$OUTPUT/$id.m4a" ] && [ "$FORCE" -eq 0 ]; then
    echo "[$total] Skip $id (exists)"
    continue
  fi
  echo "[$total] Generate $id · $voice"
  if say -v "$voice" -r "$rate" -o "$TASK_TMP/audio.aiff" "$text" && afconvert -f m4af -d aac "$TASK_TMP/audio.aiff" "$TASK_TMP/audio.m4a"; then
    mv "$TASK_TMP/audio.m4a" "$OUTPUT/$id.m4a"
  else
    echo "Could not generate $id. Check that $voice is installed; browser speech remains available." >&2
    failed=$((failed + 1))
  fi
done < "$MANIFEST"
echo "Finished $total entries; $failed could not be generated."
[ "$failed" -eq 0 ]
