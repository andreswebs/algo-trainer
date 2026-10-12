# Learnings

Problems solved and non-obvious facts found while implementing the specs in this directory. Newest entries go at the end of each section.

## Deno to Bun migration

### Phase 1: Node built-ins under Deno

- **`rm` is not a drop-in for `Deno.remove`.** Node's `rm(p)` rejects every directory unless `recursive` is set, including an empty one, while `Deno.remove(p)` deletes an empty directory. `remove()` in `src/utils/fs.ts` keeps the Deno behavior by calling `rmdir` for a directory when `recursive` is not set. The mapping table in `migrate-to-bun/reference.md` says only that `rm` fails on a non-empty directory.
- **`access` from `node:fs/promises` needs `--allow-sys` under Deno.** Deno's Node compatibility layer calls `os.uid()` inside `access`, so under the `test` task's `--allow-read --allow-write --allow-env` permissions every module that reached it failed with `NotCapable: Requires sys access to "uid"`. `pathExists()` uses `stat(p).then(() => true, () => false)` instead, which needs only read permission and matches what std `exists` does internally.
- **Raw `Deno.stdin.read` prompts read a whole buffer, not a line.** Piping `y\nextra\n` into `challenge` on an existing problem cancelled instead of overwriting, because `confirmAction` read `"y\nextra"` as one answer. The shared `readLine` helper in `src/cli/prompts.ts` reads one line per prompt, which fixes this; it is the only behavior change in phase 1. A single `y\n`, `n\n` and `/dev/null` behave as before.
- **Manual CLI checks must unset the `AT_*` variables.** A developer `.envrc` sets `AT_WORKSPACE`, which overrides the workspace even when `XDG_*` points at a temporary directory, so an ad hoc `challenge` run writes into the developer's real workspace. The `test` task already unsets them; do the same in any hand-run check.
- **A pseudo-terminal check needs no extra tooling.** `(sleep 2; printf 'y\r') | timeout 30 script -q /dev/null <command>` runs a prompt on a TTY and proves the process exits after the last read.
