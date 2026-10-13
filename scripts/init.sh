#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bun install --frozen-lockfile
# A bare `deno install` re-resolves package.json under Deno's minimum dependency age, which
# rejects packages Bun already locked; Bun owns package.json, so Deno caches only its own graph.
deno install --entrypoint src/main.ts
"${SCRIPT_DIR}/validate.sh"
