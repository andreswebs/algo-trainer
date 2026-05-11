#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

deno task fmt
deno task lint:fix
deno task build
