#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

bun run format
bun run lint:fix
bun run build
