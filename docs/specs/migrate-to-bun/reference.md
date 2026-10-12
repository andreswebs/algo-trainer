# Migrate to Bun: reference

Date: 2026-10-12. Companion to the [implementation plan](plan.md) and the [decision record](decisions.md).

This file holds the configuration files, code shapes and mappings the plan refers to. Items marked **verified** were run as shown during research. Items marked **sketch** are written for this plan and must be checked by the phase that introduces them.

## Dependencies and versions

All versions were the latest published on 2026-10-12.

| Dependency | Kind | Version | Purpose |
| --- | --- | --- | --- |
| Bun | runtime and toolchain | `>=1.4.3` (1.4.3 released 2026-10-10) | Runtime, test runner, compiler, `bun check` |
| `@types/bun` | dev | `^1.4.3` | Types for `Bun.*`, `bun:test` and `node:*` |
| `@biomejs/biome` | dev, exact | `2.5.15` (published 2026-09-30) | Formatter and linter |
| `@std/cli` | runtime | `npm:@jsr/std__cli@^1.0.32` | `parseArgs` and the `Args` type used by ten command modules |
| `@std/yaml` | runtime | `npm:@jsr/std__yaml@^1.3.0` | `stringify` only, for block scalars the generator test relies on |
| `oven-sh/setup-bun` | CI action | `v2` (v2.2.0, published 2026-03-14) | Installs Bun in CI |
| `jsr` CLI | tool, via `bunx`, not declared | 0.14.3 | `bunx jsr add` writes the `npm:@jsr/*` aliases and `.npmrc` |

Dropped packages and their replacements:

| Package | Replacement |
| --- | --- |
| `@std/assert` | `node:assert/strict` plus the local helper |
| `@std/testing` | `bun:test` (repo) and `node:test` (generated templates) |
| `@std/fs` | `node:fs/promises` and `node:fs` |
| `@std/path` | `node:path`, `node:url`, `import.meta.dirname` or `import.meta.dir` |
| `@std/json` | Unused; removed |

`Bun.YAML.parse` replaces `@std/yaml` parse. It was deep-equal on all three `src/data/scripts/*/trainer.yaml` files. It differs from std on exotic unquoted scalars in user-authored scripts: `0o14`, `014`, `1_000` and unquoted dates. `Bun.YAML.stringify` was rejected because it never emits block scalars and breaks the `content: |` assertion in `test/core/ai/generator.test.ts`.

`node:util` `parseArgs` was rejected as a replacement for `@std/cli` because it is not a drop-in for the `Args` type.

## Deno to Node API mapping

| Deno | Replacement | Notes |
| --- | --- | --- |
| `Deno.args` | `process.argv.slice(2)` | Same index in source mode and in the compiled binary |
| `Deno.exit(code)` | `process.exit(code)` | |
| `Deno.cwd()` | `process.cwd()` | |
| `Deno.chdir(dir)` (tests) | `process.chdir(dir)` | |
| `Deno.env.get(k)` | `process.env[k]` | Type is `string \| undefined` in both |
| `Deno.env.set(k, v)` (tests) | `process.env[k] = v` | |
| `Deno.env.delete(k)` (tests) | `delete process.env[k]` | |
| `Deno.build.os` | `process.platform` | Values differ on Windows (`windows` versus `win32`); only used in error context metadata |
| `Deno.readTextFile(p)` | `readFile(p, 'utf8')` from `node:fs/promises` | |
| `Deno.writeTextFile(p, s, { mode })` | `writeFile(p, s, { mode })` | |
| `Deno.readDir(p)` | `readdir(p, { withFileTypes: true })` | `Dirent.isFile()`, `isDirectory()` and `isSymbolicLink()` are methods, not properties |
| `Deno.stat(p)` | `stat(p)` | `isDirectory()` is a method |
| `Deno.mkdir(p, { recursive: true })` | `mkdir(p, { recursive: true })` | |
| `Deno.remove(p)` | `rm(p)` | Fails on a non-empty directory, as Deno does |
| `Deno.remove(p, { recursive: true })` | `rm(p, { recursive: true })` | Add `force: true` only where a missing path must not throw |
| `Deno.rename(a, b)` | `rename(a, b)` | |
| `Deno.realPath(p)` | `realpath(p)` | |
| `Deno.makeTempDir({ prefix })` (tests) | `mkdtemp(join(tmpdir(), prefix))` | `tmpdir` from `node:os` |
| `error instanceof Deno.errors.NotFound` | `(error as NodeJS.ErrnoException).code === 'ENOENT'` | One site, `src/cli/commands/progress.ts` |
| `Deno.stdin.read(buf)` | Shared readline helper (below) | |
| `Deno.stdin.isTerminal()` and the stdout and stderr equivalents | `process.stdin.isTTY === true` etc. | `isTTY` is `true` or `undefined` under Bun, `true` or `false` under Deno; always compare with `=== true` |
| `Deno.stderr.write(bytes)` | `process.stderr.write(text)` | |
| `Deno.stderr.writeSync(bytes)` | `writeSync(2, text)` from `node:fs` | Keeps the synchronous guarantee |
| `Deno.Command(...).output()` | Spawn helper on `node:child_process` (below) | |
| `@std/fs` `exists(p)` | `access(p).then(() => true, () => false)`, or `existsSync(p)` | Never `Bun.file(p).exists()`, which is false for directories |
| `@std/fs` `ensureDir(p)` | `mkdir(p, { recursive: true })` | Returns a string instead of void; callers ignore the value |
| `@std/path` `fromFileUrl(u)` | `fileURLToPath(u)` from `node:url` | |
| `dirname(fromFileUrl(import.meta.url))` | `import.meta.dirname` | |
| `new URL('.', import.meta.url).pathname` | `import.meta.dirname` | `URL.pathname` keeps `%20`, so paths with spaces break today |

Native `exists` differs from std only on cases the repo does not hit. Std throws ENOTDIR for a path under a file, and returns true for an EACCES child; `access` returns false for both.

## biome.json

**Verified**, except the `overrides` and `assist` blocks, which are explicit forms of what was tested and must be confirmed with `biome explain noTemplateCurlyInString` and a `biome check` run.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "**",
      "!!**/.local",
      "!!.tickets",
      "!!**/node_modules",
      "!!**/bin",
      "!!docs/specs/done",
      "!!src/data/templates"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "quoteProperties": "asNeeded"
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended",
      "suspicious": {
        "noExplicitAny": "error"
      },
      "nursery": {
        "useExplicitReturnType": "error"
      },
      "style": {
        "noProcessEnv": "off",
        "useNodejsImportProtocol": "error"
      },
      "correctness": {
        "noNodejsModules": "off",
        "noProcessGlobal": "off"
      }
    }
  },
  "overrides": [
    {
      "includes": ["test/escaping.test.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noTemplateCurlyInString": "off"
          }
        }
      }
    }
  ]
}
```

Notes:

- `rules.recommended: true` is deprecated in 2.5.15; `preset` replaces it.
- `!!.tickets` keeps the untracked ticket ledger out of Biome. Its `deps:` lines must stay single-line flow lists, so no formatter may ever touch it.
- Without `!!**/.local`, Biome crashes with "path is expected to be under the root" on a symlink inside `.local/`, a per-developer directory that is ignored globally but not by the repo `.gitignore`.
- `vcs.useIgnoreFile` reads the repo `.gitignore`. Directories a developer ignores only globally are not excluded automatically. After the first reformat, `git status` must show changes to tracked files only.
- Biome 2.5.15 does not format Markdown or YAML. markdownlint-cli2 keeps covering Markdown. JSONC files keep their comments but lose trailing commas.
- Commands: `biome check --write` (format, imports, safe fixes), `biome check --write --linter-enabled=false` (format and imports only), `biome lint`, `biome ci` (read-only, for CI).

Diagnostics the full config reports on the current code, before fixes:

| Rule | Count | Fix kind |
| --- | --- | --- |
| `useExplicitReturnType` | 20 (none in `src/`) | manual |
| `noNonNullAssertion` | 17 (13 in `src/core/problem/manager.ts`) | unsafe |
| `noTemplateCurlyInString` | 6 (`test/escaping.test.ts`, covered by the override) | none |
| `useTemplate` | 6 | unsafe |
| `noGlobalIsNan` | 4 | unsafe |
| `useParseIntRadix` | 3 | unsafe |
| `useIterableCallbackReturn` | 2 | manual |
| `useOptionalChain` | 2 | unsafe |
| `noImplicitAnyLet`, `noAssignInExpressions`, `useImportType`, `noUnusedVariables`, `noUnusedImports`, `noUselessCatch` | 1 each | mixed |

Some of these sit in `examples/` and the watcher test, which the plan deletes first, so the count at fix time is lower.

## tsconfig.json

**Verified** with `bun check` 1.4.3 and `tsc` 7.0.2 (identical results). The plan widens `include` as code is ported.

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "allowJs": true,
    "types": ["bun"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts", "test/**/*.ts"]
}
```

Notes:

- `"types": ["bun"]` is mandatory. TypeScript 7 loads no ambient types, and without it the check fails with 24 errors.
- `verbatimModuleSyntax` rejects a type imported without `import type` (TS1484).
- Run as `bun check --no-pretty`. With the `AGENT`, `CLAUDECODE` or `REPL_ID` environment variables set, `bun check` switches to tagged output unless `--no-pretty` is passed.

## package.json

**Sketch.** Metadata is copied from `deno.jsonc`. Dependencies are added with `bunx jsr add @std/cli @std/yaml` and `bun add -d --exact @biomejs/biome@2.5.15` plus `bun add -d @types/bun`, so the exact ranges come from the tools.

```json
{
  "name": "algo-trainer",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "license": "GPL-3.0-or-later",
  "author": "Andre Silva <andreswebs@pm.me>",
  "homepage": "https://github.com/andreswebs/algo-trainer",
  "repository": {
    "type": "git",
    "url": "https://github.com/andreswebs/algo-trainer.git"
  },
  "engines": {
    "bun": ">=1.4.3"
  },
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "generate-problems": "bun scripts/generate-problems.ts",
    "build": "bun run generate-problems && bun build --compile --asset ./src/data/templates --asset ./src/data/scripts --outfile ./bin/algo-trainer ./src/main.ts",
    "typecheck": "bun check --no-pretty",
    "format": "biome check --write --linter-enabled=false",
    "format:check": "biome check --linter-enabled=false",
    "lint": "biome lint",
    "lint:fix": "biome lint --write",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "verify": "bun run typecheck && biome ci && bun test"
  },
  "dependencies": {
    "@std/cli": "npm:@jsr/std__cli@^1.0.32",
    "@std/yaml": "npm:@jsr/std__yaml@^1.3.0"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.15",
    "@types/bun": "^1.4.3"
  }
}
```

Notes:

- `deno.jsonc` declares the license as `GPL3`. The owner chose `GPL-3.0-or-later` on 2026-10-12.
- `src/version.ts` stays the single source of truth for the CLI version. `package.json` `version` is informational.
- `private: true` prevents an accidental `bun publish`.

## .npmrc

**Verified.** Commit it together with `bun.lock`.

```ini
@jsr:registry=https://npm.jsr.io
```

A frozen install (`bun ci`) succeeds from `bun.lock` alone, because the lockfile records full `https://npm.jsr.io` tarball URLs. `.npmrc` is needed for `bun add`, `bun update` and `bunx jsr add`.

## bunfig.toml and the test preload

**Verified** shape: preload isolation and `pathIgnorePatterns` were run together on Bun 1.4.3.

```toml
[test]
preload = ["./test/setup.ts"]
pathIgnorePatterns = []
```

During phase 3 of the plan, `pathIgnorePatterns` lists the test files not yet ported, and the list shrinks to empty.

`test/setup.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const key of Object.keys(process.env)) {
  if (key.startsWith('AT_')) {
    delete process.env[key];
  }
}

const root = mkdtempSync(join(tmpdir(), 'algo-trainer-test-'));
for (const kind of ['CONFIG', 'DATA', 'CACHE', 'STATE']) {
  process.env[`XDG_${kind}_HOME`] = join(root, kind.toLowerCase());
}
```

The Deno test task unsets exactly eight variables: `AT_WORKSPACE`, `AT_LANGUAGE`, `AT_VERBOSE`, `AT_QUIET`, `AT_NO_COLOR`, `AT_NO_EMOJI`, `AT_CONFIG_PATH` and `AT_TEMPLATE_STYLE`. The preload deletes every `AT_*` variable, which is a superset. `DENO_ENV=test` is not reproduced, because nothing reads it.

## Data-root resolver

**Verified.** In a compiled binary, every module reports `import.meta.dir` as `/$bunfs/root`, whatever its depth in the source tree. `Bun.isStandaloneExecutable` is `true` in the binary and `false` in source mode. Assets passed with `--asset <dir>` land at `/$bunfs/root/<basename of dir>/`.

Phase 1 form, runnable under Deno and Bun, in `src/config/paths.ts`:

```ts
import { join } from 'node:path';

export function getDataRoot(): string {
  return join(import.meta.dirname, '..', 'data');
}
```

Phase 4 form, after Deno is removed:

```ts
import { join } from 'node:path';

export function getDataRoot(): string {
  return Bun.isStandaloneExecutable ? import.meta.dir : join(import.meta.dir, '..', 'data');
}
```

Callers use `join(getDataRoot(), 'templates', ...)` and `join(getDataRoot(), 'scripts', ...)`. The resolver must stay in a module one directory below `src/`, and the build must pass the two directories as separate `--asset` arguments:

```sh
bun build --compile --asset ./src/data/templates --asset ./src/data/scripts --outfile ./bin/algo-trainer ./src/main.ts
```

Gotchas:

- Each resolver fits exactly one asset layout. `--asset ./src/data` would put both trees under `/$bunfs/root/data/` and the resolver above would fail with ENOENT.
- Two `--asset` directories with the same basename merge silently, and one file is dropped.
- In the JS API, assets go under `compile.assets`. A top-level `assets` key is silently ignored.

## Shared readline helper

**Verified** under `bun run`, in a compiled binary, and under Deno 2.9.7, on a TTY, a pipe with data, an empty pipe and `/dev/null`. A pipe carrying `a\nb\nc\n`, read five times, returns `a`, `b`, `c`, `null`, `null`.

```ts
import { createInterface, type Interface } from 'node:readline';

let rl: Interface | undefined;
let lines: AsyncIterator<string> | undefined;
let ended = false;

export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export async function readLine(message: string): Promise<string | null> {
  process.stderr.write(message);
  if (ended) {
    return null;
  }
  if (!lines) {
    rl = createInterface({ input: process.stdin, terminal: false, crlfDelay: Infinity });
    lines = rl[Symbol.asyncIterator]();
  }
  const result = await lines.next();
  if (result.done) {
    ended = true;
    closeInput();
    return null;
  }
  return result.value;
}

export function closeInput(): void {
  rl?.close();
  rl = undefined;
  lines = undefined;
}
```

Rules:

- One interface per process. Creating and closing an interface per prompt loses buffered piped lines.
- Call `closeInput()` once in a `finally` in the entry point. On a TTY the process otherwise stays alive after the last read.
- Do not use `rl.question()`: it drops buffered piped lines and can hang at end of input.
- Do not use `prompt()`: it writes to stdout and returns `null` for an empty line.
- Do not use `for await (const line of console)`: it yields a spurious empty string before ending.
- The current prompts trim input. Keep trimming in the callers.

## Spawn helper

**Sketch** replacing `Deno.Command(...).output()` in `src/core/runner.ts`. It must keep the current contract: piped stdout and stderr decoded as UTF-8, an exit code, and a rejected promise when the executable is missing.

```ts
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';

interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

function exec(cmd: string, args: string[], cwd: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      });
    });
  });
}
```

`code` is `null` when the child is killed by a signal; the sketch maps that to 1. The runner's subprocess path is not covered by automated tests (`test/core/runner.test.ts` says it is exercised by a manual smoke test), so phase 1 includes a manual run of `run` on a C++ problem, which needs `cmake`.

## Assertion mapping

**Verified** on a 148-row matrix. Site counts are from `test/` before porting.

| @std/assert (sites) | node:assert/strict |
| --- | --- |
| `assertEquals(a, b)` (1946) | `deepStrictEqual(a, b)` |
| `assertNotEquals(a, b)` (1) | `notDeepStrictEqual(a, b)` |
| `assertStringIncludes(s, sub)` (157) | `ok(s.includes(sub))` |
| `assertExists(v)` (118) | `ok(v != null)` |
| `assertRejects(fn, C)` (6) | `await rejects(fn, C)` |
| `assertRejects(fn, C, msg)` (40) | `await assertRejectsWith(fn, C, msg)` |
| `assertThrows(fn, C, msg)` (26) | `assertThrowsWith(fn, C, msg)` |
| `assertMatch(s, re)` (1) | `match(s, re)` |
| `assertFalse(v)` (1) | `ok(!v)` |
| `assert(v)` (1) | `ok(v)` |

Never use these:

- `throws(fn, C, msg)` or `rejects(fn, C, msg)`. The third argument is a failure message, so the substring check silently disappears.
- `ok(v)` for `assertExists`. It fails on `0` and `''`.
- `notStrictEqual(v, undefined)` for `assertExists`. It passes on `null`.
- `strictEqual(v, false)` for `assertFalse`.

Known divergence: `assertEquals(-0, 0)` passes, while `deepStrictEqual(-0, 0)` fails. The suite has no such site.

`ok`, `strictEqual` and `deepStrictEqual` are TypeScript assertion functions, so `ok(v != null)` narrows `v` exactly as `assertExists` did.

Helper, in `test/helpers/assert.ts`. **Sketch**; the predicate form was verified equivalent:

```ts
import { rejects, throws } from 'node:assert/strict';

type ErrorClass = new (...args: never[]) => Error;

export function assertThrowsWith(fn: () => unknown, errorClass: ErrorClass, includes: string): void {
  throws(fn, (error: unknown) => error instanceof errorClass && error.message.includes(includes));
}

export async function assertRejectsWith(
  fn: () => Promise<unknown>,
  errorClass: ErrorClass,
  includes: string,
): Promise<void> {
  await rejects(fn, (error: unknown) => error instanceof errorClass && error.message.includes(includes));
}
```

When the predicate returns anything but `true`, Node fails with an AssertionError. All 46 `assertRejects` sites pass a function, which `rejects(fn, ...)` accepts unchanged.

## Test definition mapping

| Deno | bun:test |
| --- | --- |
| `Deno.test('name', fn)` | `test('name', fn)` |
| `describe`, `it`, `beforeEach`, `afterEach` from `@std/testing/bdd` | The same names from `bun:test` |
| `Deno.test('name', async (t) => { await t.step('s', fn) })` | `describe('name', () => { test('s', fn) })` |

`t.step` occurs 31 times, all in `test/ai/parser.test.ts`. Hooks or shared state set up in the parent test body move into `beforeEach` or `beforeAll` inside the `describe`.

Bun differences:

- The default per-test timeout is 5 seconds. The slowest test, in `test/core/workspace/archive.test.ts`, takes about 3.3 seconds because of three deliberate 1100 ms sleeps. Give it an explicit timeout as the third argument to `test`.
- Bun has no resource or op sanitizers. Leaked timers no longer fail a test.
- `bun test` sets `NODE_ENV=test` and `TZ=Etc/UTC` unless already set, and loads `.env.test` if present.
- Unhandled errors between tests fail the run.

## Template diff for generated workspaces

**Verified** under Bun 1.4.2, Node 26.5.0 and Deno 2.9.7, after the template bugs were worked around.

Documented and comprehensive `test.tpl`, TypeScript and JavaScript:

```diff
-import { assertEquals } from '@std/assert';
-import { describe, it } from '@std/testing/bdd';
+import assert from 'node:assert/strict';
+import { describe, it } from 'node:test';
 import { {{FUNCTION_NAME}} } from './solution{{FILE_EXTENSION}}';
```

Every `assertEquals(` becomes `assert.deepStrictEqual(`. The minimal `test.tpl` imports `test` from `node:test` and must register at least one test.

## CI workflow

**Sketch** for `.github/workflows/ci.yaml`.

```yaml
name: CI

on:
  pull_request:
    branches:
      - '*'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun ci

      - name: Type check
        run: bun run typecheck

      - name: Format and lint
        run: bunx biome ci

      - name: Test
        run: bun test

      - name: Generated problem data is current
        run: |
          bun run generate-problems
          git diff --exit-code -- src/data/problems.generated.ts

      - name: Build
        run: bun run build

      - name: Smoke test the binary
        run: ./scripts/smoke.sh "${GITHUB_WORKSPACE}/bin/algo-trainer"
```

Notes:

- `setup-bun` reads the version from `package.json` (`packageManager`, then `engines.bun`) when no `bun-version` input is given. It caches only the Bun executable.
- `bun ci` is a frozen install and needs the committed `bun.lock`.
- The first cross-compile per target downloads a runtime, so builds need network access. This matters only for the future release workflow.
