/**
 * Tests for per-command help system
 *
 * Tests that each command properly displays help when --help or -h flag is provided.
 */

import { describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { challengeCommand } from '../src/cli/commands/challenge.ts';
import { completeCommand } from '../src/cli/commands/complete.ts';
import { configCommand } from '../src/cli/commands/config.ts';
import { hintCommand } from '../src/cli/commands/hint.ts';
import { initCommand } from '../src/cli/commands/init.ts';
import { listCommand } from '../src/cli/commands/list.ts';
import { progressCommand } from '../src/cli/commands/progress.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';

describe('Per-command help system', () => {
  it('challenge command should handle --help flag', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('challenge command should handle -h flag', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      h: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('complete command should handle --help flag', async () => {
    const result = await completeCommand({
      _: ['complete'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('config command should handle --help flag', async () => {
    const result = await configCommand({
      _: ['config'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('hint command should handle --help flag', async () => {
    const result = await hintCommand({
      _: ['hint'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('init command should handle --help flag', async () => {
    const result = await initCommand({
      _: ['init'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('list command should handle --help flag', async () => {
    const result = await listCommand({
      _: ['list'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('progress command should handle --help flag', async () => {
    const result = await progressCommand({
      _: ['progress'],
      help: true,
    });

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });
});
