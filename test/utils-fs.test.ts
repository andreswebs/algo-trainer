/**
 * Tests for file system utilities
 *
 * @module test/utils-fs.test
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSystemError } from '../src/utils/errors.ts';
import { listDirectory, pathExists, remove } from '../src/utils/fs.ts';
import { assertRejectsWith } from './helpers/assert.ts';

describe('remove', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'utils-fs-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('removes a file', async () => {
    const file = join(dir, 'a.txt');
    await writeFile(file, 'a');
    await remove(file);
    deepStrictEqual(await pathExists(file), false);
  });

  it('removes an empty directory without recursive', async () => {
    const sub = join(dir, 'empty');
    await mkdir(sub);
    await remove(sub);
    deepStrictEqual(await pathExists(sub), false);
  });

  it('refuses a non-empty directory without recursive', async () => {
    const sub = join(dir, 'full');
    await mkdir(sub);
    await writeFile(join(sub, 'a.txt'), 'a');
    await assertRejectsWith(() => remove(sub), FileSystemError, 'Failed to remove');
    deepStrictEqual(await pathExists(sub), true);
  });

  it('removes a non-empty directory with recursive', async () => {
    const sub = join(dir, 'full');
    await mkdir(sub);
    await writeFile(join(sub, 'a.txt'), 'a');
    await remove(sub, { recursive: true });
    deepStrictEqual(await pathExists(sub), false);
  });

  it('rejects a missing path', async () => {
    await assertRejectsWith(
      () => remove(join(dir, 'missing')),
      FileSystemError,
      'Failed to remove',
    );
  });
});

describe('listDirectory', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'utils-fs-'));
    await mkdir(join(dir, 'sub'));
    await writeFile(join(dir, 'sub', 'b.txt'), 'b');
    await writeFile(join(dir, 'a.txt'), 'a');
    await writeFile(join(dir, '.hidden'), 'h');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lists entries with isDirectory as a boolean and skips hidden files', async () => {
    const entries = await listDirectory(dir);
    entries.sort((x, y) => x.name.localeCompare(y.name));
    deepStrictEqual(entries, [
      { name: 'a.txt', path: join(dir, 'a.txt'), isDirectory: false },
      { name: 'sub', path: join(dir, 'sub'), isDirectory: true },
    ]);
  });

  it('recurses into subdirectories and includes hidden files on request', async () => {
    const entries = await listDirectory(dir, { recursive: true, includeHidden: true });
    deepStrictEqual(entries.map((e) => e.name).sort(), ['.hidden', 'a.txt', 'b.txt', 'sub']);
  });

  it('wraps a missing directory in FileSystemError', async () => {
    await assertRejectsWith(
      () => listDirectory(join(dir, 'missing')),
      FileSystemError,
      'Failed to list directory',
    );
  });
});
