#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bun install --frozen-lockfile
"${SCRIPT_DIR}/validate.sh"
