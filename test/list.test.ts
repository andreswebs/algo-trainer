/**
 * Tests for list command
 *
 * @module test/list
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import type { Args } from '@std/cli/parse-args';
import { extractListOptions, listCommand } from '../src/cli/commands/list.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';

describe('extractListOptions', () => {
  it('should extract default options', () => {
    const args: Args = { _: ['list'] };
    const options = extractListOptions(args);

    assertEquals(options.difficulty, undefined);
    assertEquals(options.tag, undefined);
    assertEquals(options.search, undefined);
    assertEquals(options.limit, 20);
    assertEquals(options.json, false);
    assertEquals(options.verbose, false);
  });

  it('should extract difficulty with long flag', () => {
    const args: Args = { _: ['list'], difficulty: 'easy' };
    const options = extractListOptions(args);

    assertEquals(options.difficulty, 'easy');
  });

  it('should extract difficulty with short flag', () => {
    const args: Args = { _: ['list'], d: 'medium' };
    const options = extractListOptions(args);

    assertEquals(options.difficulty, 'medium');
  });

  it('should extract category with long flag', () => {
    const args: Args = { _: ['list'], category: 'arrays' };
    const options = extractListOptions(args);

    assertEquals(options.tag, 'arrays');
  });

  it('should extract category with short flag', () => {
    const args: Args = { _: ['list'], c: 'strings' };
    const options = extractListOptions(args);

    assertEquals(options.tag, 'strings');
  });

  it('should extract search with long flag', () => {
    const args: Args = { _: ['list'], search: 'two sum' };
    const options = extractListOptions(args);

    assertEquals(options.search, 'two sum');
  });

  it('should extract search with short flag', () => {
    const args: Args = { _: ['list'], s: 'binary' };
    const options = extractListOptions(args);

    assertEquals(options.search, 'binary');
  });

  it('should extract limit with long flag', () => {
    const args: Args = { _: ['list'], limit: 10 };
    const options = extractListOptions(args);

    assertEquals(options.limit, 10);
  });

  it('should extract limit with short flag', () => {
    const args: Args = { _: ['list'], l: 5 };
    const options = extractListOptions(args);

    assertEquals(options.limit, 5);
  });

  it('should extract json flag', () => {
    const args: Args = { _: ['list'], json: true };
    const options = extractListOptions(args);

    assertEquals(options.json, true);
  });

  it('should extract verbose flag', () => {
    const args: Args = { _: ['list'], verbose: true };
    const options = extractListOptions(args);

    assertEquals(options.verbose, true);
  });

  it('should extract multiple options together', () => {
    const args: Args = {
      _: ['list'],
      d: 'hard',
      c: 'dynamic-programming',
      s: 'longest',
      l: 15,
      json: true,
      verbose: true,
    };
    const options = extractListOptions(args);

    assertEquals(options.difficulty, 'hard');
    assertEquals(options.tag, 'dynamic-programming');
    assertEquals(options.search, 'longest');
    assertEquals(options.limit, 15);
    assertEquals(options.json, true);
    assertEquals(options.verbose, true);
  });

  it('should prefer long flags over short flags', () => {
    const args: Args = {
      _: ['list'],
      difficulty: 'easy',
      d: 'hard',
      limit: 10,
      l: 20,
    };
    const options = extractListOptions(args);

    assertEquals(options.difficulty, 'easy');
    assertEquals(options.limit, 10);
  });
});

describe('listCommand', () => {
  let originalStdout: typeof console.log;
  let originalStderr: typeof console.error;
  let stdoutOutput: string[] = [];
  let stderrOutput: string[] = [];

  beforeEach(() => {
    // Capture console output
    originalStdout = console.log;
    originalStderr = console.error;
    stdoutOutput = [];
    stderrOutput = [];

    console.log = (...args: unknown[]) => {
      stdoutOutput.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      stderrOutput.push(args.map(String).join(' '));
    };
  });

  afterEach(() => {
    // Restore console
    console.log = originalStdout;
    console.error = originalStderr;
  });

  it('should list all problems with default options', async () => {
    const result = await listCommand({ _: ['list'] });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
    assertEquals(stderrOutput.length > 0, true);
    assertEquals(stdoutOutput.length, 0);
  });

  it('should filter by difficulty', async () => {
    const result = await listCommand({ _: ['list'], difficulty: 'easy' });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should reject invalid difficulty', async () => {
    const result = await listCommand({ _: ['list'], difficulty: 'invalid' });

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
    assertEquals(result.error?.includes('Invalid difficulty'), true);
  });

  it('should filter by category', async () => {
    const result = await listCommand({ _: ['list'], category: 'array' });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should filter by search text', async () => {
    const result = await listCommand({ _: ['list'], search: 'sum' });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should respect limit option', async () => {
    const result = await listCommand({ _: ['list'], limit: 5 });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should output JSON when json flag is set', async () => {
    const result = await listCommand({ _: ['list'], json: true, limit: 1 });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Check that output is valid JSON
    const output = stdoutOutput.join('\n');
    const parsed = JSON.parse(output);
    assertEquals(typeof parsed.total, 'number');
    assertEquals(Array.isArray(parsed.problems), true);
    assertEquals(typeof parsed.hasMore, 'boolean');
  });

  it('should show verbose output when verbose flag is set', async () => {
    const result = await listCommand({ _: ['list'], verbose: true, limit: 1 });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Verbose mode should include more details (we can't check exact content)
    assertEquals(stderrOutput.length > 0, true);
  });

  it('should combine multiple filters', async () => {
    const result = await listCommand({
      _: ['list'],
      difficulty: 'easy',
      search: 'array',
      limit: 10,
    });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle no results gracefully', async () => {
    const result = await listCommand({
      _: ['list'],
      search: 'zzzzzzzzzzznonexistent',
    });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Should indicate no results (in stderr for table format)
    const output = stderrOutput.join('\n');
    assertEquals(output.includes('No problems found') || output.includes('"total": 0'), true);
  });

  it('should display table format by default', async () => {
    const result = await listCommand({ _: ['list'], limit: 1 });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    const output = stderrOutput.join('\n');
    // Table should have headers
    assertEquals(output.includes('Difficulty'), true);
    assertEquals(output.includes('Title'), true);
  });
});
