#!/usr/bin/env bash

set -o errexit -o nounset -o pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <path to algo-trainer binary>" >&2
  exit 2
fi

BIN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(sed -n "s/^export const VERSION = '\(.*\)';$/\1/p" "${SCRIPT_DIR}/../src/version.ts")"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

# A developer's AT_* variables override the workspace and language, and the real XDG
# directories hold their config, so the binary must see neither.
while IFS= read -r name; do
  unset "${name}"
done < <(compgen -e | grep '^AT_' || true)
export XDG_CONFIG_HOME="${TMP_DIR}/config"
export XDG_DATA_HOME="${TMP_DIR}/data"
export XDG_CACHE_HOME="${TMP_DIR}/cache"
export XDG_STATE_HOME="${TMP_DIR}/state"

WORKSPACE="${TMP_DIR}/workspace"
LOG="${TMP_DIR}/smoke.log"
touch "${LOG}"

fail() {
  cat "${LOG}" >&2
  echo "smoke: $*" >&2
  exit 1
}

cd /

actual_version="$("${BIN}" --version)"
[[ "${actual_version}" == *"v${VERSION}" ]] ||
  fail "expected --version to print v${VERSION}, got '${actual_version}'"

"${BIN}" init "${WORKSPACE}" </dev/null >>"${LOG}" 2>&1 || fail "init failed"

(cd "${WORKSPACE}" && "${BIN}" challenge two-sum --language typescript </dev/null) >>"${LOG}" 2>&1 ||
  fail "challenge two-sum failed"

solution="${WORKSPACE}/problems/two-sum/solution.ts"
[[ -s "${solution}" ]] || fail "expected a non-empty ${solution}"

echo "smoke: ok"
