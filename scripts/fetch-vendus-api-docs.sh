#!/usr/bin/env bash
# Download the latest Vendus (Cegid Vendus) OpenAPI specs into docs/vendus-api/.
#
# Vendus publishes an official OpenAPI 3.0 spec per API version at:
#   https://www.vendus.pt/ws/{version}/api.jsonapi   (no API key required)
# The docs site at https://www.vendus.pt/ws/{version}/ is just a Redoc viewer
# over this JSON. Responses carry no ETag/Last-Modified, so change detection
# is done by re-downloading and letting git diff show what changed.
#
# Usage: scripts/fetch-vendus-api-docs.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$REPO_ROOT/docs/vendus-api"
VERSIONS=("v1.1" "v1.2")  # v1.1 = current default, v1.2 = latest

mkdir -p "$OUT_DIR"

for version in "${VERSIONS[@]}"; do
  url="https://www.vendus.pt/ws/${version}/api.jsonapi"
  out="$OUT_DIR/vendus-api-${version}.openapi.json"
  tmp="$(mktemp)"

  echo "Fetching $url"
  curl -fsSL "$url" -o "$tmp"

  # Validate JSON and pretty-print for stable, reviewable git diffs.
  python3 -c "
import json, sys
with open('$tmp') as f:
    spec = json.load(f)
assert spec.get('openapi', '').startswith('3.'), 'not an OpenAPI 3 document'
with open('$out', 'w') as f:
    json.dump(spec, f, indent=2, ensure_ascii=False, sort_keys=True)
    f.write('\n')
print(f\"  {spec['info']['title']} $version: {len(spec['paths'])} paths, {len(spec['components']['schemas'])} schemas -> $out\")
"
  rm -f "$tmp"
done

echo "Done. Run 'git diff docs/vendus-api/' to see what changed since the last fetch."
