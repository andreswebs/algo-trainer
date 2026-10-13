/**
 * Tests for the solution runner.
 *
 * Only the language-agnostic helpers are unit-tested here; the cpp adapter
 * shells out to cmake and is exercised end-to-end by the manual smoke test
 * in CLAUDE.md, not by `bun test`.
 *
 * @module test/core/runner
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffStrings, runSolution } from '../../src/core/runner.ts';
import { WorkspaceError } from '../../src/utils/errors.ts';
import { assertRejectsWith } from '../helpers/assert.ts';

test('diffStrings - returns empty string for identical inputs', () => {
  deepStrictEqual(diffStrings('a\nb\nc\n', 'a\nb\nc\n'), '');
  deepStrictEqual(diffStrings('', ''), '');
});

test('diffStrings - flags differing lines with -/+ markers', () => {
  const out = diffStrings('a\nb\nc\n', 'a\nB\nc\n');
  ok(out.includes('  1: a'));
  ok(out.includes('- 2: b'));
  ok(out.includes('+ 2: B'));
  ok(out.includes('  3: c'));
});

test('diffStrings - handles length mismatches by padding with empty lines', () => {
  const out = diffStrings('one\ntwo\n', 'one\n');
  ok(out.includes('  1: one'));
  ok(out.includes('- 2: two'));
  ok(out.includes('+ 2: '));
});

test('runSolution - rejects unsupported languages with a WorkspaceError', async () => {
  await assertRejectsWith(
    () =>
      runSolution('python', {
        problemDir: '/tmp/does-not-exist',
        inputFile: '/tmp/does-not-exist/input.txt',
        rebuild: true,
      }),
    WorkspaceError,
    "'at run' is not implemented for language 'python'",
  );
});

test('runSolution (cpp) - surfaces a clear error when the problem dir is missing files', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'algo-trainer-runner-'));
  try {
    // Empty directory — no CMakeLists.txt, no solution.cpp.
    await assertRejectsWith(
      () =>
        runSolution('cpp', {
          problemDir: tmp,
          inputFile: `${tmp}/input.txt`,
          rebuild: true,
        }),
      WorkspaceError,
      'Missing CMakeLists.txt',
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
