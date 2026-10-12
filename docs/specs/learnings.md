# Learnings

Problems solved and non-obvious facts found while implementing the specs in this directory. Newest entries go at the end of each section.

## Deno to Bun migration

### Phase 1: Node built-ins under Deno

- **`rm` is not a drop-in for `Deno.remove`.** Node's `rm(p)` rejects every directory unless `recursive` is set, including an empty one, while `Deno.remove(p)` deletes an empty directory. `remove()` in `src/utils/fs.ts` keeps the Deno behavior by calling `rmdir` for a directory when `recursive` is not set. The mapping table in `migrate-to-bun/reference.md` says only that `rm` fails on a non-empty directory.
- **`access` from `node:fs/promises` needs `--allow-sys` under Deno.** Deno's Node compatibility layer calls `os.uid()` inside `access`, so under the `test` task's `--allow-read --allow-write --allow-env` permissions every module that reached it failed with `NotCapable: Requires sys access to "uid"`. `pathExists()` uses `stat(p).then(() => true, () => false)` instead, which needs only read permission and matches what std `exists` does internally.
