#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

bun run verify
bun run build
