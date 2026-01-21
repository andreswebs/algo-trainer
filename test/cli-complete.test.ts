/**
 * Tests for complete command
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { completeCommand, extractCompleteOptions } from '../src/cli/commands/complete.ts';
import { challengeCommand } from '../src/cli/commands/challenge.ts';
import { configManager } from '../src/config/manager.ts';
import { initWorkspace } from '../src/core/mod.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import type { Args } from '@std/cli/parse-args';

describe('extractCompleteOptions', () => {
  it('should extract slug from first positional arg', () => {
    const args: Args = { _: ['complete', 'two-sum'] };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.notes, undefined);
    assertEquals(options.noArchive, false);
  });

  it('should extract notes with --notes flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], notes: 'Great problem!' };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.notes, 'Great problem!');
  });

  it('should extract notes with -n flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], n: 'Nice solution' };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.notes, 'Nice solution');
  });

  it('should extract no-archive flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], 'no-archive': true };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.noArchive, true);
  });

  it('should extract multiple options together', () => {
    const args: Args = {
      _: ['complete', 'two-sum'],
      notes: 'Completed successfully',
      'no-archive': true,
    };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.notes, 'Completed successfully');
    assertEquals(options.noArchive, true);
  });

  it('should handle no arguments', () => {
    const args: Args = { _: ['complete'] };
    const options = extractCompleteOptions(args);
    assertEquals(options.problemSlug, undefined);
    assertEquals(options.notes, undefined);
    assertEquals(options.noArchive, false);
  });
});

describe('completeCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    // Initialize config for testing
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
    // Initialize workspace structure
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true }).catch(() => {});
  });

  it('should auto-select single problem when no slug provided', async () => {
    // First, initialize workspace with one problem
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    const result = await completeCommand({
      _: ['complete'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail when no problems in workspace', async () => {
    // Initialize workspace but don't add any problems
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    // Complete the problem so workspace is empty
    await completeCommand({
      _: ['complete', 'two-sum'],
    });

    // Now try to complete without slug (should fail as no problems)
    const result = await completeCommand({
      _: ['complete'],
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should fail when problem does not exist', async () => {
    // First, initialize workspace
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    const result = await completeCommand({
      _: ['complete', 'non-existent-problem'],
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should complete a problem successfully', async () => {
    // First, start a challenge
    const challengeResult = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    assertEquals(challengeResult.success, true);

    // Then, complete it
    const result = await completeCommand({
      _: ['complete', 'two-sum'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should complete a problem with notes', async () => {
    // First, start a challenge
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    // Complete with notes
    const result = await completeCommand({
      _: ['complete', 'two-sum'],
      notes: 'Great learning experience',
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should complete a problem without archiving when --no-archive is set', async () => {
    // First, start a challenge
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    // Complete without archiving
    const result = await completeCommand({
      _: ['complete', 'two-sum'],
      'no-archive': true,
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail when problem is not in current workspace', async () => {
    // Initialize workspace but don't add the problem
    await challengeCommand({
      _: ['challenge', 'contains-duplicate'],
    });

    const result = await completeCommand({
      _: ['complete', 'two-sum'],
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should complete a problem by ID', async () => {
    // First, start a challenge
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    // Complete by ID (two-sum is ID 1)
    const result = await completeCommand({
      _: ['complete', '1'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });
});
