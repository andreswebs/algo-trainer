/**
 * Tests for the solution runner.
 *
 * Only the language-agnostic helpers are unit-tested here; the cpp adapter
 * shells out to cmake and is exercised end-to-end by the manual smoke test
 * in CLAUDE.md, not by `deno test`.
 *
 * @module test/core/runner
 */

import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import { diffStrings, runSolution } from '../../src/core/runner.ts';
import { WorkspaceError } from '../../src/utils/errors.ts';

Deno.test('diffStrings - returns empty string for identical inputs', () => {
  assertEquals(diffStrings('a\nb\nc\n', 'a\nb\nc\n'), '');
  assertEquals(diffStrings('', ''), '');
});

Deno.test('diffStrings - flags differing lines with -/+ markers', () => {
  const out = diffStrings('a\nb\nc\n', 'a\nB\nc\n');
  assertStringIncludes(out, '  1: a');
  assertStringIncludes(out, '- 2: b');
  assertStringIncludes(out, '+ 2: B');
  assertStringIncludes(out, '  3: c');
});

Deno.test('diffStrings - handles length mismatches by padding with empty lines', () => {
  const out = diffStrings('one\ntwo\n', 'one\n');
  assertStringIncludes(out, '  1: one');
  assertStringIncludes(out, '- 2: two');
  assertStringIncludes(out, '+ 2: ');
});

Deno.test('runSolution - rejects unsupported languages with a WorkspaceError', async () => {
  await assertRejects(
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

Deno.test('runSolution (cpp) - surfaces a clear error when the problem dir is missing files', async () => {
  const tmp = await Deno.makeTempDir({ prefix: 'algo-trainer-runner-' });
  try {
    // Empty directory — no CMakeLists.txt, no solution.cpp.
    await assertRejects(
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
    await Deno.remove(tmp, { recursive: true });
  }
});
