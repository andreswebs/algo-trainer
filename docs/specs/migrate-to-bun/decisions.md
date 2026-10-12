# Migrate to Bun: decision record

Date: 2026-10-12. Status: accepted by the project owner.

This record lists every decision the [implementation plan](plan.md) depends on, with the reason and the alternatives that were rejected. Facts quoted here were verified by experiment on Bun 1.4.2 and 1.4.3, Deno 2.9.7, Node 26.5.0 and Biome 2.5.15, unless marked otherwise. Configuration and code shapes live in the [reference](reference.md).

## Constraints set by the owner

- Do not rewrite or vendor any std library module. Replace it with a native API or keep it as a published dependency.
- New dependencies are allowed, at their latest versions, recorded with the date checked.
- Use Biome for TypeScript linting and formatting.
- Use a native test runner.
- Prefer native or standard libraries over third-party dependencies.

## Decisions

### D1. Bun version floor: 1.4.3, declared as a range

- **Decision:** require Bun `>=1.4.3` through `engines.bun` in `package.json`. Type-check with `bun check`. Do not depend on the `typescript` package.
- **Why:** `bun check` first shipped in 1.4.3. On every tested case it produced byte-identical diagnostics and exit codes to `tsc` 7.0.2, ran about 3x faster, and works without the `typescript` package.
- **Rejected:** pinning 1.4.2 with `tsc` (needs an extra dependency); an exact `packageManager` pin or a `.tool-versions` file (the owner prefers a floor).
- **Consequence:** CI uses the latest Bun that satisfies the range. Confirm in the first CI run that `oven-sh/setup-bun` resolves the `engines.bun` range to 1.4.3 or later.

### D2. Sequencing: incremental, with the Deno suite as the safety net

- **Decision:** port `src/` to Node built-ins first while the unchanged Deno test suite guards it, then add the Bun toolchain and port tests file by file, then remove Deno.
- **Why:** Deno 2 runs `node:fs`, `node:path`, `node:readline`, `node:child_process` and `process`. The shared readline helper was verified to behave identically under Deno and Bun. Deno also keeps working with a `package.json` and `node_modules` present. Every phase can therefore end green.
- **Rejected:** a big-bang switch (no safety net while source and tests change together); porting tests first through a shim.

### D3. API style: Node built-ins first, Bun APIs only at the edges

- **Decision:** `src/` uses `node:fs/promises`, `node:path`, `node:child_process`, `node:readline` and `process`. Only two Bun APIs are used, both introduced after Deno is gone: `Bun.isStandaloneExecutable` in the data-root resolver, and `Bun.YAML.parse`.
- **Why:** Node built-ins run under Deno during the transition, so the Deno suite verifies them. They also keep `src/` portable.
- **Rejected:** Bun-native APIs throughout (cannot be verified by the Deno suite); no Bun APIs at all (ignores a native YAML parser and the only reliable binary-mode signal).

### D4. Reformat first, as its own step

- **Decision:** adopt Biome and reformat the whole repository before any porting, as a pure formatting change verified by the Deno suite. The resulting commit is added to `.git-blame-ignore-revs`.
- **Why:** Biome recomputes line breaks, so it changes about 70 TypeScript and JSON files even with every style option matched, plus 19 more for import sorting. deno fmt and Biome never converge. Doing this first keeps every later diff limited to real changes.
- **Rejected:** reformatting last; reformatting each file as it is ported.

### D5. Biome configuration

- **Decision:**
  - Pin `@biomejs/biome` exactly at 2.5.15.
  - Scope the whole repository with force-ignores for `.local`, `.tickets`, `node_modules`, `bin`, `docs/specs/done` and `src/data/templates`, and honor `.gitignore`.
  - Keep import sorting on.
  - Use the `recommended` preset, with `noExplicitAny` and the nursery rule `useExplicitReturnType` at error.
  - Fix every diagnostic. Add one override that turns off `noTemplateCurlyInString` for `test/escaping.test.ts`, whose template-like strings are intentional.
- **Why:** this reproduces every deno fmt style option and enforces the two mandatory project rules. The `.local` force-ignore is required: without it Biome 2.5.15 crashes on a symlink in that directory. The exact pin protects the nursery rule from renames.
- **Rejected:** code directories only (leaves JSON unformatted); enforcing return types for `src/` only; leaving warnings unfixed; turning noisy rules off globally.

### D6. TODO-tag rule dropped

- **Decision:** stop enforcing `ban-untagged-todo`.
- **Why:** Biome has no equivalent rule, and a GritQL plugin cannot match comments. There are no untagged TODOs in TypeScript code today.

### D7. Repository tests: bun:test with node:assert/strict and one helper

- **Decision:** run tests with `bun:test` and assert with `node:assert/strict`. Add one local helper that checks both the error class and a message substring, for throws and rejects.
- **Why:**
  - 66 of 72 `assertThrows` and `assertRejects` sites check that the error message contains a substring. Node's third argument is a failure message, not a matcher, so a mechanical rename silently drops 66 checks. The helper restores them.
  - `node:assert` keeps TypeScript narrowing (`ok(v != null)` replaces `assertExists`), and `expect` matchers do not.
  - `node:test` under Bun hides nested sub-steps from the reporter, so `bun:test` nested `describe` is used for the 31 `t.step` sites.
- **Rejected:** keeping `@std/assert` (zero assertion changes, but a dependency where a native option exists); a full `expect` rewrite (loses narrowing at 36 to 118 sites and changes the call shape at all 46 rejects sites).

### D8. Test isolation through a preload

- **Decision:** a preload registered in `bunfig.toml` deletes `AT_*` variables and points the four `XDG_*_HOME` variables at a fresh temp directory.
- **Why:** every way of running tests (`bun test`, a single file, editor runners) is isolated automatically. No source module reads the environment at load time, so a preload is sufficient.
- **Rejected:** a `package.json` script wrapper (a bare `bun test` would use the developer's real environment).

### D9. File watcher deleted

- **Decision:** delete `src/core/workspace/watcher.ts`, its re-export, and `test/core/workspace/watcher.test.ts`.
- **Why:** no CLI command uses it. A port would need stat-based event detection, because recursive `fs.watch` only reports `rename` and `change`, and macOS reports modify as `rename`. It can be rebuilt on `fs.watch` if a watch command is ever added.

### D10. examples/ deleted

- **Decision:** delete `examples/`.
- **Why:** the examples use Deno APIs, nothing runs or type-checks them, and the user guide and tests already document usage.

### D11. Generated workspaces: node:test for TS/JS, template bugs fixed in every language

- **Decision:**
  - The six TypeScript and JavaScript `test.tpl` files import `node:test` and `node:assert/strict`, with no manifest.
  - The template bugs are fixed in this migration, for every language:
    - `{{EXAMPLES}}` renders README prose into code in the TypeScript, JavaScript, Go, Java, Python and Rust test templates.
    - The documented TypeScript and JavaScript `solution.tpl` and the documented and comprehensive Rust `solution.tpl` comment only the first line of a multi-line description.
    - The minimal TypeScript and JavaScript `test.tpl` registers no test.
- **Why:** today every generated TS/JS test file is a syntax error under every runtime. With the bugs fixed, `node:test` templates pass unchanged under Bun, Node and Deno. Decomposing the plan found that the same rendering bugs break the other languages, and the owner widened the scope to all of them on 2026-10-12.
- **Rejected:** `bun:test` templates (break Node and Deno users); keeping `@std` imports with a manifest (`@std/testing/bdd` calls `Deno.test` and fails under Bun and Node); fixing TS/JS only.

### D12. Distribution: local build now, releases later

- **Decision:** the migration delivers a build script that produces `bin/algo-trainer` and README instructions to build from source. The JSR `deno install` line is removed. A release workflow with cross-compiled binaries is follow-up work. `package.json` is marked `private`.
- **Why:** cross-compilation was verified (Linux x64 and arm64, glibc and musl, macOS, Windows), but release mechanics are separate from the runtime change.
- **Note for later:** a published npm package cannot depend on JSR packages at runtime, because npm consumers get a 404. Bundle them, or ship binaries.

### D13. CI scope

- **Decision:** CI runs `bun ci`, the type check, `biome ci`, `bun test`, a freshness check on `src/data/problems.generated.ts`, the build, and a smoke test of the binary run from `/`.
- **Why:** today CI never checks formatting, never builds, and never checks that the committed generated file is current.

### D14. Out of scope

- **Shell tests:** the 102 files in `test/shelltest/` are left untouched. Nothing runs them today, and they target the binary, whose name does not change.
- **Tickets:** files in `.tickets/` are left untouched, including their Deno verify boilerplate.

## Defaults adopted without a separate decision

- The two tests that depend on the working directory switch to paths derived from their own module directory.
- The build does not use `--bytecode`. It defaults to CommonJS, which rejects top-level await unless `--format=esm` is added, and its startup gain is small.
- VS Code settings switch from the Deno extension to the Biome extension.
- `AGENTS.md`, `README.md` and the current docs are rewritten for Bun. Historical documents under `docs/specs/done/` are not changed.
- The package script for type checking is named `typecheck`, not `check`, because a `check` script shadows the `bun check` command.
