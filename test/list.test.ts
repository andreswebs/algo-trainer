/**
 * Tests for list command
 *
 * @module test/list
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import type { Args } from '@std/cli/parse-args';
import { extractListOptions, listCommand } from '../src/cli/commands/list.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';

describe('extractListOptions', () => {
  it('should extract default options', () => {
    const args: Args = { _: ['list'] };
    const options = extractListOptions(args);

    deepStrictEqual(options.difficulty, undefined);
    deepStrictEqual(options.tag, undefined);
    deepStrictEqual(options.search, undefined);
    deepStrictEqual(options.limit, 20);
    deepStrictEqual(options.json, false);
    deepStrictEqual(options.verbose, false);
  });

  it('should extract difficulty with long flag', () => {
    const args: Args = { _: ['list'], difficulty: 'easy' };
    const options = extractListOptions(args);

    deepStrictEqual(options.difficulty, 'easy');
  });

  it('should extract difficulty with short flag', () => {
    const args: Args = { _: ['list'], d: 'medium' };
    const options = extractListOptions(args);

    deepStrictEqual(options.difficulty, 'medium');
  });

  it('should extract category with long flag', () => {
    const args: Args = { _: ['list'], category: 'arrays' };
    const options = extractListOptions(args);

    deepStrictEqual(options.tag, 'arrays');
  });

  it('should extract category with short flag', () => {
    const args: Args = { _: ['list'], c: 'strings' };
    const options = extractListOptions(args);

    deepStrictEqual(options.tag, 'strings');
  });

  it('should extract search with long flag', () => {
    const args: Args = { _: ['list'], search: 'two sum' };
    const options = extractListOptions(args);

    deepStrictEqual(options.search, 'two sum');
  });

  it('should extract search with short flag', () => {
    const args: Args = { _: ['list'], s: 'binary' };
    const options = extractListOptions(args);

    deepStrictEqual(options.search, 'binary');
  });

  it('should extract limit with long flag', () => {
    const args: Args = { _: ['list'], limit: 10 };
    const options = extractListOptions(args);

    deepStrictEqual(options.limit, 10);
  });

  it('should extract limit with short flag', () => {
    const args: Args = { _: ['list'], l: 5 };
    const options = extractListOptions(args);

    deepStrictEqual(options.limit, 5);
  });

  it('should extract json flag', () => {
    const args: Args = { _: ['list'], json: true };
    const options = extractListOptions(args);

    deepStrictEqual(options.json, true);
  });

  it('should extract verbose flag', () => {
    const args: Args = { _: ['list'], verbose: true };
    const options = extractListOptions(args);

    deepStrictEqual(options.verbose, true);
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

    deepStrictEqual(options.difficulty, 'hard');
    deepStrictEqual(options.tag, 'dynamic-programming');
    deepStrictEqual(options.search, 'longest');
    deepStrictEqual(options.limit, 15);
    deepStrictEqual(options.json, true);
    deepStrictEqual(options.verbose, true);
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

    deepStrictEqual(options.difficulty, 'easy');
    deepStrictEqual(options.limit, 10);
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

    console.log = (...args: unknown[]): void => {
      stdoutOutput.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]): void => {
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

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    deepStrictEqual(stderrOutput.length > 0, true);
    deepStrictEqual(stdoutOutput.length, 0);
  });

  it('should filter by difficulty', async () => {
    const result = await listCommand({ _: ['list'], difficulty: 'easy' });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should reject invalid difficulty', async () => {
    const result = await listCommand({ _: ['list'], difficulty: 'invalid' });

    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    deepStrictEqual(result.error?.includes('Invalid difficulty'), true);
  });

  it('should filter by category', async () => {
    const result = await listCommand({ _: ['list'], category: 'array' });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should filter by search text', async () => {
    const result = await listCommand({ _: ['list'], search: 'sum' });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should respect limit option', async () => {
    const result = await listCommand({ _: ['list'], limit: 5 });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should output JSON when json flag is set', async () => {
    const result = await listCommand({ _: ['list'], json: true, limit: 1 });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Check that output is valid JSON
    const output = stdoutOutput.join('\n');
    const parsed = JSON.parse(output);
    deepStrictEqual(typeof parsed.total, 'number');
    deepStrictEqual(Array.isArray(parsed.problems), true);
    deepStrictEqual(typeof parsed.hasMore, 'boolean');
  });

  it('should show verbose output when verbose flag is set', async () => {
    const result = await listCommand({ _: ['list'], verbose: true, limit: 1 });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Verbose mode should include more details (we can't check exact content)
    deepStrictEqual(stderrOutput.length > 0, true);
  });

  it('should combine multiple filters', async () => {
    const result = await listCommand({
      _: ['list'],
      difficulty: 'easy',
      search: 'array',
      limit: 10,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle no results gracefully', async () => {
    const result = await listCommand({
      _: ['list'],
      search: 'zzzzzzzzzzznonexistent',
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Should indicate no results (in stderr for table format)
    const output = stderrOutput.join('\n');
    deepStrictEqual(output.includes('No problems found') || output.includes('"total": 0'), true);
  });

  it('should display table format by default', async () => {
    const result = await listCommand({ _: ['list'], limit: 1 });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    const output = stderrOutput.join('\n');
    // Table should have headers
    deepStrictEqual(output.includes('Difficulty'), true);
    deepStrictEqual(output.includes('Title'), true);
  });
});
