#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

bun run typecheck
deno task fmt:check
deno task lint
bun test
