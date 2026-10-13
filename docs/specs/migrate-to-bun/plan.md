# Migrate to Bun: implementation plan

Date: 2026-10-12. Status: ready for implementation.

This plan moves algo-trainer from Deno 2 to Bun. It is written for the engineer or agent who carries it out. Read the [decision record](decisions.md) for why each choice was made, and keep the [reference](reference.md) open for the configuration files, code shapes and mappings that the steps point to.

## Outcome

When the plan is done:

- Bun 1.4.3 or later runs the CLI, the tests and the build. Deno is no longer required.
- `bun check` type-checks `src/`, `test/` and `scripts/` with the current strict compiler options.
- Biome formats and lints the repository. deno fmt and deno lint are gone.
- Tests run on `bun:test` with `node:assert/strict`, isolated by a preload.
- `bun run build` produces a single binary at `bin/algo-trainer` with the templates and teaching scripts embedded.
- Generated workspaces produce valid code in every language, and TypeScript and JavaScript tests run under Bun, Node and Deno.
- CI type-checks, lints, tests, checks generated data freshness, builds and smoke-tests the binary.

## Ground rules

- **Every phase ends green.** Each phase lists a gate. Do not start the next phase until the gate passes.
- **Steps are commit boundaries.** Each numbered step is sized to be reviewed and committed on its own. The project owner manages git.
- **No behavior change outside phase 5.** Phases 0 to 4 change tooling and implementation only. CLI output, files written and exit codes must stay the same. Phase 5 changes the generated templates on purpose. One exception was approved by the owner on 2026-10-12: since step 1.4, each prompt consumes exactly one line of piped input, where the raw stdin read used to take a whole buffer as one answer.
- **Quality gate commands change by phase.** `AGENTS.md` keeps its Deno commands until phase 4 rewrites it. Until then, use the gate commands listed in each phase.
- **Biome is pinned exactly at 2.5.15.** Until phase 2 adds it as a dev dependency, run it as `bunx @biomejs/biome@2.5.15`.

## Baseline

Measured on 2026-10-12, on a clean checkout:

| Measure | Value |
| --- | --- |
| `deno task check` | passes, 102 files |
| `deno task lint` | passes, after excluding the per-developer `.local/` directory in `deno.jsonc` |
| `deno task test` | 475 passed (610 steps), 0 failed, about 14 s |
| Test files | 42 files: 20 use `Deno.test`, 22 use `@std/testing/bdd` |
| Files using `Deno.*` or `@std/fs` / `@std/path` | 27 under `src/`, plus `scripts/generate-problems.ts` |

Before starting, record per-file test counts with `deno test --allow-write --allow-read --allow-env` (through the `test` task, which isolates the environment). Phase 3 uses them to prove that no test was lost.

## Phase overview

| Phase | Goal | Runner of record |
| --- | --- | --- |
| 0 | Adopt Biome and reformat once | Deno |
| 1 | Port `src/` and `scripts/` to Node built-ins, delete dead code | Deno |
| 2 | Add the Bun toolchain alongside Deno | Deno, plus Bun type check and Biome lint |
| 3 | Port the tests file by file | Deno and Bun, shrinking and growing |
| 4 | Cut over: Bun edges, build, CI, docs, remove Deno | Bun |
| 5 | Fix the generated templates in every language; move TS/JS tests to node:test | Bun |

## Phase 0: adopt Biome and reformat

Goal: one pure formatting change, verified by the unchanged Deno suite, so later diffs show only real changes.

### 0.1 Add Biome configuration and switch the format tasks

- Add `biome.json` from the reference, including the linter section. The linter is not a gate yet.
- In `deno.jsonc`:
  - Remove the `fmt` configuration block.
  - Set the `fmt` task to `bunx @biomejs/biome@2.5.15 check --write --linter-enabled=false`.
  - Set the `fmt:check` task to `bunx @biomejs/biome@2.5.15 check --linter-enabled=false`.
- In `scripts/generate-problems.ts`, replace the spawned `deno fmt <file>` with `bunx @biomejs/biome@2.5.15 format --write <file>`. Fail the script when the formatter exits non-zero; today the exit status is ignored.
- In `deno.jsonc`, change the `generate-problems` task permission from `--allow-run=deno` to `--allow-run=bunx`.
- In `.vscode/settings.json`, set `editor.defaultFormatter` to `biomejs.biome`. Keep `deno.enable` until phase 4, because the Deno extension still provides type information.

### 0.2 Reformat the repository

- Run `deno task fmt`, then `deno task generate-problems`.
- Confirm the formatter is stable: a second `deno task fmt` changes nothing.
- Confirm `git status` lists only tracked files. If Biome touched files in a directory that a developer ignores globally, add a `!!` force-ignore for it to `biome.json` and revert those files.
- Expect about 93 changed files, measured on 2026-10-12. They include TypeScript reflowed by the formatter, files with sorted imports, and 9 problem JSON files under `src/data/problems/`. Regenerating `src/data/problems.generated.ts` afterwards keeps it consistent with them.

### 0.3 Record the reformat in blame history

After the owner commits step 0.2, add its commit hash to a new `.git-blame-ignore-revs` file with a one-line comment.

### Phase 0 gate

```sh
deno task check && deno task lint && deno task test && deno task fmt:check
```

The test result must match the baseline.

## Phase 1: port src/ and scripts/ to Node built-ins

Goal: remove every `Deno.*`, `@std/fs` and `@std/path` use from `src/` and `scripts/`, with no behavior change. The Deno suite is the safety net. Use only Node built-ins in this phase; Bun APIs would not run under Deno. The Deno to Node mapping table in the reference covers every call.

### 1.1 Delete dead code

- Delete `src/core/workspace/watcher.ts`, its re-export at `src/core/workspace/mod.ts:109`, and `test/core/workspace/watcher.test.ts`.
- Delete `examples/`. Remove `examples/**/*.ts` from `.fallowrc.json`.
- Search `src/`, `docs/` (excluding `docs/specs/done/`), `README.md` and `AGENTS.md` for remaining references to the watcher and to `examples/`, and remove them.
- The per-file test baseline loses the 26 watcher tests.

### 1.2 Port the filesystem utilities

`src/utils/fs.ts` is the foundation most modules import. Port it first:

- `Deno.env.get` in `getXdgPaths` becomes `process.env[...]`.
- `exists` becomes `stat(p).then(() => true, () => false)` (not `access`, which needs `--allow-sys` under Deno). `ensureDir` becomes `mkdir(p, { recursive: true })`.
- `Deno.readTextFile`, `Deno.writeTextFile` (including the optional `mode`) and `Deno.remove` (with `recursive` only when the caller passes it) become `node:fs/promises` calls.
- `listDirectory` keeps its `{ name, path, isDirectory }` return shape, so `src/core/problem/database.ts` is unaffected. Internally, `Deno.readDir` becomes `readdir(..., { withFileTypes: true })` with `isDirectory()` as a method.
- `@std/path` `join` becomes `node:path`.

Keep wrapping every error in `FileSystemError`, as today.

### 1.3 Port process, output and environment handling

- `src/main.ts` and `src/cli/main.ts`:
  - `Deno.args` becomes `process.argv.slice(2)`.
  - `Deno.exit` becomes `process.exit`.
  - Add a `finally` that calls `closeInput()` from step 1.4.
- `src/utils/output.ts`:
  - `Deno.stdout.isTerminal()` becomes `process.stdout.isTTY === true`.
  - `Deno.stderr.isTerminal()` becomes `process.stderr.isTTY === true`.
  - `Deno.stderr.writeSync` becomes `writeSync(2, text)` from `node:fs`.
  - `Deno.env.get` becomes `process.env`.
  - `Deno.exit` becomes `process.exit`.
- `src/cli/env.ts`, `src/cli/exit-codes.ts`: `Deno.env.get` and `Deno.exit` as above.
- `src/utils/errors.ts`: `Deno.build.os` becomes `process.platform`.

### 1.4 Port interactive input

- Add the shared readline helper from the reference, either in `src/cli/prompts.ts` or in a small module beside it.
- Replace every `Deno.stdin.read(buf)` loop in `src/cli/prompts.ts` and `src/cli/commands/shared.ts` with `readLine(message)`. Keep the current trimming, defaults on end of input, and validation loops.
- `isInteractive()` uses `process.stdin.isTTY === true && process.stdout.isTTY === true`.
- Prompt text keeps going to stderr.

Verify by hand, in addition to `test/prompts.test.ts`:

- Pipe answers into a command that prompts, for example `printf 'y\n' | deno run -A src/main.ts <command>`, and check that each prompt consumes one line.
- Run the same command with `</dev/null` and check that the defaults apply and the process exits.

### 1.5 Port the remaining filesystem call sites

| Site | Change |
| --- | --- |
| `src/cli/commands/progress.ts:122,133,151` | `readdir` with `withFileTypes`, `isDirectory()` as a method, `instanceof Deno.errors.NotFound` becomes a check for `code === 'ENOENT'`, `readFile` |
| `src/cli/commands/complete.ts:105` | `readdir` with `withFileTypes`, Dirent methods |
| `src/core/workspace/archive.ts:160,252,405,534` | `rename`, `rm(..., { recursive: true })`, `readdir` with Dirent methods |
| `src/core/workspace/manager.ts:251` | `stat`, `isDirectory()` as a method |
| `src/core/problem/manager.ts:452` | `rename` |
| `src/core/problem/parser.ts:27`, `src/core/workspace/generation.ts:368`, `src/core/problem/templates.ts:672,729,775`, `src/core/ai/parser.ts:188`, `src/cli/commands/run.ts:125,202`, `src/cli/commands/teach.ts:154,171` | `readFile` and `writeFile` |
| `src/cli/commands/run.ts:168` | `realpath(parent).catch(() => parent)` |
| `src/cli/commands/run.ts:100,161,236`, `init.ts:78,81`, `shared.ts:43`, `challenge.ts:337` | `process.cwd()` |
| `src/core/problem/templates.ts` (three `exists` calls) | `pathExists` from `src/utils/fs.ts`; never `Bun.file().exists()` |

`src/cli/exit-codes.ts` maps filesystem errors to exit code 7 by matching `permission`, `access denied` and `eacces` in messages. Node's EACCES messages still match, so leave it unchanged.

### 1.6 Port the subprocess runner

- Replace both `Deno.Command(...).output()` helpers in `src/core/runner.ts` with the spawn helper from the reference.
- The subprocess path has no automated test. With `cmake` installed, run `run` on a C++ problem in a scratch workspace before and after the change, and compare the output.

### 1.7 Introduce the data-root resolver

- Add `getDataRoot()` to `src/config/paths.ts`, in the phase 1 form from the reference, which resolves `../data` against `import.meta.url`.
- In `src/core/problem/templates.ts`, replace the `new URL('.', import.meta.url).pathname` path math with `join(getDataRoot(), 'templates')`. This also fixes template lookup when the install path contains a space.
- In `src/core/ai/parser.ts`, replace the `dirname(fromFileUrl(import.meta.url))` path math with `join(getDataRoot(), 'scripts')`.
- In the Deno `build` task, add `--include=src/data/scripts`. The current binary never embedded the built-in teaching scripts.

The built-in scripts are not reachable from any CLI command today: `findTeachingScript` is exported but has no caller. Its tests cover the source-mode lookup.

### 1.8 Replace the std path and fs imports

- Replace every `@std/path` and `@std/fs` import in `src/` and `scripts/` with `node:path`, `node:url` and `node:fs`.
- Keep the entries in the `deno.jsonc` import map, because tests still use them until phase 3.

### 1.9 Port the problem generator

In `scripts/generate-problems.ts`:

- `Deno.readDir` becomes `readdir` with `isFile()` as a method.
- `Deno.readTextFile` and `Deno.writeTextFile` become `node:fs/promises` calls.
- The formatter spawn uses the spawn approach from step 1.6.
- `Deno.exit` becomes `process.exit`.

Keep the Deno shebang until phase 4.

### Phase 1 gate

```sh
deno task check && deno task lint && deno task test && deno task fmt:check
grep -rnE 'Deno\.|@std/(fs|path)' src scripts
deno task build
```

- The `grep` prints nothing.
- Every test file's count matches the baseline, minus the 26 watcher tests.
- From `/`, the Deno-built binary initializes a workspace in a temporary directory and runs `challenge two-sum --language typescript` successfully, proving that templates resolve through `getDataRoot()` in a compiled binary.

## Phase 2: add the Bun toolchain alongside Deno

Goal: Bun type-checks the ported code, Biome lints the repository, and the test infrastructure is ready. Deno still runs the tests.

### 2.1 Add the package manifest and dependencies

- Create `package.json` from the reference, without the scripts that depend on later phases (`build`, `dev`, `generate-problems`, `test`, `test:watch`, `verify`).
- Run `bunx jsr add @std/cli @std/yaml`, then `bun add -d --exact @biomejs/biome@2.5.15` and `bun add -d @types/bun`.
- Commit `package.json`, `bun.lock` and `.npmrc`.
- Deno keeps resolving `@std/*` through the `deno.jsonc` import map with `package.json` and `node_modules` present; this was verified. Confirm with the Deno gate below.

### 2.2 Add the type check

- Add `tsconfig.json` from the reference, with `include` limited to `src/**/*.ts` and `scripts/**/*.ts` for now.
- Run `bun run typecheck` and fix every error. Expect a few new ones where Node types are stricter than Deno's, for example `NodeJS.ErrnoException` codes and spawn stream types under `exactOptionalPropertyTypes`.
- Move the format tasks to the manifest: `bun run format` and `bun run format:check`, using the local Biome. Point `deno.jsonc` `fmt` and `fmt:check` at them, so `scripts/validate.sh` and `scripts/fix.sh` keep working.

### 2.3 Make Biome lint a gate and fix every diagnostic

- Run `bun run lint` and fix every diagnostic.
- `useExplicitReturnType` hits are in `test/` and `scripts/`, and `noNonNullAssertion` hits are mostly in `src/core/problem/manager.ts`. Review each unsafe fix by hand.
- Confirm that the `test/escaping.test.ts` override silences only `noTemplateCurlyInString`.
- `deno task lint` remains a gate until phase 4. The two linters do not conflict on this code base.

### 2.4 Add the test infrastructure

- Add `bunfig.toml` and `test/setup.ts` from the reference. Set `pathIgnorePatterns` to every test file, since none is ported yet.
- Add `test/helpers/assert.ts` with `assertThrowsWith` and `assertRejectsWith` from the reference.
- Add `test/helpers/assert.test.ts`, written for `bun:test`, proving each helper:
  - passes on the right class with the right substring;
  - fails on the right class with the wrong substring;
  - fails on the wrong class.
- In `deno.jsonc`, add a `test.exclude` list holding `test/helpers/assert.test.ts`. Deno must never run a ported file.

### Phase 2 gate

```sh
deno task check && deno task lint && deno task test
bun run typecheck && bun run format:check && bun run lint && bun test
```

`bun test` runs only the helper test at this point.

## Phase 3: port the tests file by file

Goal: every test runs under `bun:test` with `node:assert/strict`, with no test lost and no assertion weakened.

### Per-file recipe

For each test file:

1. **Imports and definitions.**
   - Import `test`, `describe`, `it`, `beforeEach` and `afterEach` from `bun:test`.
   - `Deno.test('name', fn)` becomes `test('name', fn)`.
   - `@std/testing/bdd` imports become `bun:test` imports.
2. **Assertions.**
   - Replace them per the assertion mapping in the reference.
   - Route every `assertThrows` and `assertRejects` that passes a message substring through `assertThrowsWith` or `assertRejectsWith`. Never pass the substring as Node's third argument.
   - `assertExists(v)` becomes `ok(v != null)`.
3. **Deno APIs.**
   - Replace with `node:fs/promises`, `node:os` `tmpdir`, `process.env`, `process.cwd()` and `process.chdir()`, per the mapping table.
   - `Deno.env.delete(k)` becomes `delete process.env[k]`.
   - Move cleanup that sits inside `try` into `finally` or `afterEach`. Bun has no sanitizer to catch a leak.
4. **Std imports.** Replace `@std/path` and `@std/fs` with Node built-ins.
5. **Switch runners.** Move the file from `bunfig.toml` `pathIgnorePatterns` into `deno.jsonc` `test.exclude`.
6. **Count check.** Run `bun test <file>` and compare the test count with the baseline for that file.

### Order

Port in this order, so failures point at test code rather than at infrastructure:

1. **Pure unit tests:**
   - `test/validation.test.ts`
   - `test/escaping.test.ts`
   - `test/exit-codes.test.ts`
   - `test/ai/triggers.test.ts`
   - `test/ai/validator.test.ts`
   - `test/core/runner.test.ts`
   - `test/parser.test.ts`
2. **Filesystem tests:**
   - `test/database.test.ts`
   - `test/manager.test.ts`
   - `test/workspace.test.ts`
   - `test/workspace-manager.test.ts`
   - `test/core/workspace/archive.test.ts`
   - `test/core/workspace/generation.test.ts`
   - `test/core/problem/templates*.test.ts`
   - `test/core/ai/generator.test.ts`
3. **Config, environment and output tests:**
   - `test/config.test.ts`
   - `test/env.test.ts`
   - `test/env-integration.test.ts`
   - `test/utils-output.test.ts`
   - `test/prompts.test.ts`
4. **CLI command and integration tests:**
   - `test/cli-*.test.ts`
   - `test/cli/e2e_test.ts`
   - `test/list.test.ts`
   - `test/phase3-integration.test.ts`
   - `test/ai/engine.test.ts`
   - `test/ai/session.test.ts`
   - `test/ai/integration.test.ts`
5. **Sub-step file:** `test/ai/parser.test.ts`, whose 31 `t.step` calls become nested `describe` and `test` blocks.

### Specific changes

- **Working-directory tests.** In `test/parser.test.ts:186,196` and `test/ai/engine.test.ts:18`, derive paths from `import.meta.dir` instead of the current working directory.
- **Slow test.** Give `multiple archive operations with timestamp collision handling` in `test/core/workspace/archive.test.ts` an explicit timeout of 15000 ms. It takes about 3.3 s against Bun's 5 s default.
- **Golden fixtures.** `test/fixtures/templates/golden/` stays unchanged in this phase. It only changes in phase 5.

### Finish

- When `pathIgnorePatterns` is empty, widen `tsconfig.json` `include` to `test/**/*.ts` and fix any type errors.
- Remove the now-unused `test` and `test:watch` tasks from `deno.jsonc`.
- Add the `test`, `test:watch` and `verify` scripts to `package.json`.

### Phase 3 gate

```sh
bun run verify
grep -rnE 'Deno\.|@std/(assert|testing|fs|path)' test
deno task check && deno task lint
```

- The `grep` prints nothing.
- The total Bun test count is at least the Deno baseline minus the 26 watcher tests. Sub-steps now count as tests, so the total rises.
- **Mutation spot check.** In three converted files, change one expected message substring and confirm the test fails, then revert. This proves the substring checks survived.

## Phase 4: cut over to Bun

Goal: Deno is no longer required anywhere.

### 4.1 Introduce the Bun edges

- Switch `getDataRoot()` to the phase 4 form from the reference, which branches on `Bun.isStandaloneExecutable`.
- In `src/core/ai/parser.ts`, replace `parse` from `@std/yaml` with `Bun.YAML.parse`.
- Keep `stringify` from `@std/yaml` in `src/core/ai/generator.ts`.

### 4.2 Move the build and scripts to Bun

- Add the `build`, `dev` and `generate-problems` scripts to `package.json`, per the reference.
- `scripts/generate-problems.ts`:
  - The shebang becomes `#!/usr/bin/env bun`.
  - Update the usage comments.
  - The formatter call runs the local Biome.
- Rewrite `scripts/validate.sh`, `scripts/fix.sh` and `scripts/init.sh`:
  - `validate.sh` runs `bun run verify` and `bun run build`.
  - `fix.sh` runs `bun run format`, `bun run lint:fix` and `bun run build`.
  - `init.sh` runs `bun install --frozen-lockfile` and then `validate.sh`. Corrected 2026-10-13: the frozen install, kept by the owner, never rewrites `bun.lock`, which matches `bun ci` in CI.
- Add `scripts/smoke.sh`. It takes the binary path as its first argument. From `/`, with `XDG_*_HOME` pointed at a temporary directory and `AT_*` unset, it:
  - checks that `--version` prints the version from `src/version.ts`;
  - runs `init` into a temporary workspace;
  - runs `challenge two-sum --language typescript` there;
  - checks that the generated solution file exists and is not empty.

### 4.3 Remove Deno

- Delete `deno.jsonc` and `deno.lock`.
- Confirm nothing imports `@std/assert`, `@std/testing`, `@std/fs`, `@std/path` or `@std/json`.
- In `.vscode/settings.json`, remove `deno.enable` and `deno.lint`.
- Remove the commented `DENO_DIR` and `DENO_NO_UPDATE_CHECK` lines from `.envrc` and `.envrc.example`.

### 4.4 Update CI

- Replace `.github/workflows/ci.yaml` with the workflow from the reference.
- In `.github/workflows/copilot-setup-steps.yml`, replace `denoland/setup-deno` and `deno install` with `oven-sh/setup-bun@v2` and `bun ci`.
- In the first CI run, confirm that the installed Bun version is 1.4.3 or later.

### 4.5 Update the documentation

- **`AGENTS.md`:**
  - Runtime: Bun 1.4.3 or later.
  - Mandatory pre-task and post-task checks: `bun run verify`.
  - Development commands become the `package.json` scripts.
  - Testing: `bun:test` with `node:assert/strict` and the helpers.
  - Dependencies: Node built-ins first, with `@std/cli` and `@std/yaml` as the only runtime packages.
  - Formatting: Biome.
  - Remove the "Ensure proper permissions in test command" line.
- **`README.md`:**
  - Requirements: Bun.
  - Remove the JSR `deno install` line.
  - Install from source with `bun install` and `bun run build`, then copy `bin/algo-trainer` onto `PATH`.
  - Development commands.
- **`docs/user-guide.md`:** the install section.
- **`docs/environment-variables.md`:** the testing section, using `bun test test/env.test.ts`.
- Leave `docs/specs/done/`, `docs/story.md` and the tickets unchanged.

### Phase 4 gate

```sh
bun run verify
bun run generate-problems && git diff --exit-code -- src/data/problems.generated.ts
bun run build && ./scripts/smoke.sh "${PWD}/bin/algo-trainer"
git grep -niw deno -- ':!docs/specs/done' ':!.tickets' ':!docs/specs/migrate-to-bun'
```

- The final `grep` returns only deliberate historical mentions, such as `docs/story.md`.
- Corrected 2026-10-13: the gate first used `git grep -niE '\bdeno\b'`, which matched nothing on macOS, because git's extended regular expressions there do not support `\b`. `-w` matches whole words everywhere.
- CI passes on the pull request.

## Phase 5: generated workspace templates

Goal: generated test and solution files are valid code in every language, and generated TypeScript and JavaScript tests run under Bun, Node and Deno. This phase changes product output on purpose. Its scope was widened to every language by the project owner on 2026-10-12, after decomposition found that the same rendering bugs affect Go, Java, Python and Rust.

### 5.1 Render examples validly in every test template

`formatExamples` in `src/core/problem/templates.ts` renders README prose (`Example 1:`, `Input: ...`) into `{{EXAMPLES}}`. The test templates for TypeScript, JavaScript, Go, Java, Python and Rust all paste it into code, which makes every generated test file a syntax error. Python places it inside a class body.

- Keep `{{EXAMPLES}}` prose for `readme.tpl` and for doc comments in the comprehensive `solution.tpl` files, where it is already inside a comment block.
- In test templates, render the examples as line comments in the language's syntax (`//` for TypeScript, JavaScript, Go, Java and Rust; `#` for Python), through a new language-aware placeholder.
- Python test classes must still have a body: emit `pass` when the class would otherwise contain only comments.
- Turning examples into executable assertions is possible follow-up work.

### 5.2 Comment every description line

`{{PROBLEM_DESCRIPTION}}` follows a single line comment in the documented `solution.tpl` for TypeScript and JavaScript (`//`) and in the documented and comprehensive `solution.tpl` for Rust (`//!`), so lines after the first are bare text. Comment every line, through the renderer or a per-line placeholder.

### 5.3 Switch the TypeScript and JavaScript tests to node:test

- Apply the template diff from the reference to the six `test.tpl` files under `src/data/templates/{typescript,javascript}/{minimal,documented,comprehensive}/`.
- The minimal `test.tpl` registers no test today. Make it register one test that checks the exported function exists, for example `assert.equal(typeof {{FUNCTION_NAME}}, 'function')`.
- No package manifest is added to generated workspaces.

### 5.4 Update fixtures and tests

- Regenerate `test/fixtures/templates/golden/test.golden.txt`, which currently contains the `@std` imports.
- Update the template tests that assert on rendered content. Review the golden diff by hand: it must show only the intended changes.

### Phase 5 gate

```sh
bun run verify && bun run build
```

With the built binary, generate a `two-sum` workspace for every language and style:

- TypeScript and JavaScript, each style: `bun test` exits 0, and `node --test` and `deno test` exit 0 where Node 22 or later and Deno are available. The generated test may fail on the unimplemented solution only through an assertion failure, never a syntax or import error.
- Go, Java, Python and Rust, each style: the generated files parse or compile with the language's own tool where it is installed (`gofmt -e`, `javac`, `python3 -m py_compile`, `rustc --edition 2021 --crate-type lib` or `cargo check`).

Record which runtimes and tools were checked.

## Definition of done

- Every phase gate has passed, in order.
- `deno.jsonc` and `deno.lock` are gone, and no tool or script invokes `deno`.
- `bun run verify`, the freshness check, the build and the smoke test pass locally and in CI.
- `AGENTS.md` and `README.md` describe the Bun workflow.

## Out of scope

- A release workflow with cross-compiled binaries. Cross-compilation for Linux (glibc and musl, x64 and arm64), macOS and Windows was verified and is ready for a follow-up.
- An npm package. If one is added later, JSR dependencies must be bundled, because npm consumers cannot resolve them.
- The shell tests in `test/shelltest/`.
- The tickets in `.tickets/`.
- Wiring `findTeachingScript` into a CLI command.

## Risks

| Risk | Mitigation |
| --- | --- |
| A mechanical rename drops the 66 message-substring checks | The helpers, the grep gate and the mutation spot check in phase 3 |
| Biome crashes on the `.local/` symlink | The `!!**/.local` force-ignore in `biome.json` |
| Biome reformats files ignored only by a developer's global gitignore | The `git status` check in step 0.2 |
| Readline loses piped lines or keeps the process alive | One shared interface, `closeInput()` in the entry point, and the manual pipe checks in step 1.4 |
| The data root resolves wrongly in the binary | Two separate `--asset` arguments, and the smoke test run from `/` |
| The nursery rule `useExplicitReturnType` changes upstream | The exact Biome pin, with upgrades as deliberate changes |
| A `check` script shadows `bun check` | The script is named `typecheck` |
| `setup-bun` resolves the `engines.bun` range unexpectedly | Confirm the version in the first CI run, and pin `bun-version` if needed |
| Tests leak timers or temporary directories without sanitizers | Cleanup in `finally` or `afterEach` during porting |
| Results gathered on Bun 1.4.2 behave differently on 1.4.3 | Every gate runs on 1.4.3 or later |
