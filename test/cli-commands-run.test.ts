/**
 * Tests for run command helpers
 *
 * @module test/cli-commands-run
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import type { Args } from '@std/cli/parse-args';
import { join } from '@std/path';
import { extractRunOptions, resolveFilePath, resolveLanguage } from '../src/cli/commands/run.ts';

describe('extractRunOptions', () => {
  it('extracts slug from positional args', () => {
    const args: Args = { _: ['run', 'two-sum'] };
    const opts = extractRunOptions(args);
    assertEquals(opts.slug, 'two-sum');
  });

  it('returns undefined slug when no positional arg', () => {
    const args: Args = { _: ['run'] };
    const opts = extractRunOptions(args);
    assertEquals(opts.slug, undefined);
  });

  it('extracts language from --language flag', () => {
    const args: Args = { _: ['run'], language: 'cpp' };
    const opts = extractRunOptions(args);
    assertEquals(opts.language, 'cpp');
  });

  it('extracts language from -l short flag', () => {
    const args: Args = { _: ['run'], l: 'python' };
    const opts = extractRunOptions(args);
    assertEquals(opts.language, 'python');
  });

  it('extracts input path', () => {
    const args: Args = { _: ['run'], input: 'my-input.txt' };
    const opts = extractRunOptions(args);
    assertEquals(opts.inputPath, 'my-input.txt');
  });

  it('extracts expected path', () => {
    const args: Args = { _: ['run'], expected: 'my-expected.txt' };
    const opts = extractRunOptions(args);
    assertEquals(opts.expectedPath, 'my-expected.txt');
  });

  it('sets noBuild when build is false (--no-build)', () => {
    const args: Args = { _: ['run'], build: false };
    const opts = extractRunOptions(args);
    assertEquals(opts.noBuild, true);
  });

  it('does not set noBuild when build is true (default)', () => {
    const args: Args = { _: ['run'], build: true };
    const opts = extractRunOptions(args);
    assertEquals(opts.noBuild, false);
  });

  it('sets noDiff when diff is false (--no-diff)', () => {
    const args: Args = { _: ['run'], diff: false };
    const opts = extractRunOptions(args);
    assertEquals(opts.noDiff, true);
  });

  it('returns all defaults when no flags provided', () => {
    const args: Args = { _: ['run'] };
    const opts = extractRunOptions(args);
    assertEquals(opts.slug, undefined);
    assertEquals(opts.language, undefined);
    assertEquals(opts.inputPath, undefined);
    assertEquals(opts.expectedPath, undefined);
    assertEquals(opts.noBuild, false);
    assertEquals(opts.noDiff, false);
  });
});

describe('resolveFilePath', () => {
  it('returns fallback when path is undefined', () => {
    const result = resolveFilePath(undefined, '/problems/two-sum/input.txt', '/cwd');
    assertEquals(result, '/problems/two-sum/input.txt');
  });

  it('returns absolute path as-is', () => {
    const result = resolveFilePath('/absolute/path.txt', '/fallback.txt', '/cwd');
    assertEquals(result, '/absolute/path.txt');
  });

  it('resolves relative path against cwd', () => {
    const result = resolveFilePath('input.txt', '/fallback.txt', '/workspace/problems/two-sum');
    assertEquals(result, '/workspace/problems/two-sum/input.txt');
  });

  it('resolves nested relative path against cwd', () => {
    const result = resolveFilePath('data/input.txt', '/fallback.txt', '/home/user');
    assertEquals(result, '/home/user/data/input.txt');
  });
});

describe('resolveLanguage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-run-test-' });
  });

  afterEach(async () => {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('returns explicit language immediately without filesystem access', async () => {
    const result = await resolveLanguage(
      join(tempDir, 'nonexistent-dir'),
      'cpp',
      tempDir,
      'typescript',
    );
    assertEquals(result, 'cpp');
  });

  it('reads language from .problem.json when no explicit language', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await Deno.mkdir(problemDir, { recursive: true });
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify({ slug: 'two-sum', language: 'cpp' }),
    );

    const result = await resolveLanguage(problemDir, undefined, tempDir, 'typescript');
    assertEquals(result, 'cpp');
  });

  it('falls back to default language when no .problem.json exists', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await Deno.mkdir(problemDir, { recursive: true });

    const result = await resolveLanguage(problemDir, undefined, tempDir, 'python');
    assertEquals(result, 'python');
  });

  it('falls back to default language when .problem.json has no language field', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await Deno.mkdir(problemDir, { recursive: true });
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify({ slug: 'two-sum' }),
    );

    const result = await resolveLanguage(problemDir, undefined, tempDir, 'typescript');
    assertEquals(result, 'typescript');
  });

  it('falls back to default language when .problem.json is malformed', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await Deno.mkdir(problemDir, { recursive: true });
    await Deno.writeTextFile(join(problemDir, '.problem.json'), 'not valid json{{{');

    const result = await resolveLanguage(problemDir, undefined, tempDir, 'typescript');
    assertEquals(result, 'typescript');
  });
});
