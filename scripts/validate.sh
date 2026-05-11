#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

deno task check
deno task fmt:check
deno task lint
deno task test
deno task build
