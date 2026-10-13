/**
 * Tests for complete command
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok, rejects } from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { challengeCommand } from '../src/cli/commands/challenge.ts';
import type { CompleteOptions } from '../src/cli/commands/complete.ts';
import {
  completeCommand,
  extractCompleteOptions,
  markCompleted,
  resolveTargetProblem,
  validateCompletion,
} from '../src/cli/commands/complete.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import type { Args } from '../src/cli/types.ts';
import { configManager } from '../src/config/manager.ts';
import { getWorkspaceStructure, initWorkspace } from '../src/core/mod.ts';
import { ProblemError } from '../src/utils/errors.ts';
import { pathExists } from '../src/utils/fs.ts';

describe('extractCompleteOptions', () => {
  it('should extract slug from first positional arg', () => {
    const args: Args = { _: ['complete', 'two-sum'] };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.notes, undefined);
    deepStrictEqual(options.noArchive, false);
  });

  it('should extract notes with --notes flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], notes: 'Great problem!' };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.notes, 'Great problem!');
  });

  it('should extract notes with -n flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], n: 'Nice solution' };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.notes, 'Nice solution');
  });

  it('should extract no-archive flag', () => {
    const args: Args = { _: ['complete', 'two-sum'], 'no-archive': true };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.noArchive, true);
  });

  it('should extract multiple options together', () => {
    const args: Args = {
      _: ['complete', 'two-sum'],
      notes: 'Completed successfully',
      'no-archive': true,
    };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.notes, 'Completed successfully');
    deepStrictEqual(options.noArchive, true);
  });

  it('should extract language with --language and -l flags', () => {
    deepStrictEqual(
      extractCompleteOptions({ _: ['complete', 'two-sum'], language: 'typescript' }).language,
      'typescript',
    );
    deepStrictEqual(
      extractCompleteOptions({ _: ['complete', 'two-sum'], l: 'python' }).language,
      'python',
    );
    deepStrictEqual(extractCompleteOptions({ _: ['complete', 'two-sum'] }).language, undefined);
  });

  it('should handle no arguments', () => {
    const args: Args = { _: ['complete'] };
    const options = extractCompleteOptions(args);
    deepStrictEqual(options.problemSlug, undefined);
    deepStrictEqual(options.notes, undefined);
    deepStrictEqual(options.noArchive, false);
  });
});

describe('completeCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    // Initialize config for testing
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
    // Initialize workspace structure
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should auto-select single problem when no slug provided', async () => {
    // First, initialize workspace with one problem
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    const result = await completeCommand({
      _: ['complete'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
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
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should fail when problem does not exist', async () => {
    // First, initialize workspace
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    const result = await completeCommand({
      _: ['complete', 'non-existent-problem'],
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should complete a problem successfully', async () => {
    // First, start a challenge
    const challengeResult = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    deepStrictEqual(challengeResult.success, true);

    // Then, complete it
    const result = await completeCommand({
      _: ['complete', 'two-sum'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
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
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
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
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should complete a problem scaffolded in a language other than the configured one', async () => {
    await configManager.updateConfig({ language: 'cpp' });
    const challengeResult = await challengeCommand({
      _: ['challenge', 'two-sum'],
      language: 'typescript',
    });
    deepStrictEqual(challengeResult.success, true);

    const result = await completeCommand({
      _: ['complete', 'two-sum'],
      language: 'typescript',
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should reject an invalid --language value', async () => {
    await challengeCommand({
      _: ['challenge', 'two-sum'],
    });

    const result = await completeCommand({
      _: ['complete', 'two-sum'],
      language: 'cobol',
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should fail when problem is not in current workspace', async () => {
    // Initialize workspace but don't add the problem
    await challengeCommand({
      _: ['challenge', 'contains-duplicate'],
    });

    const result = await completeCommand({
      _: ['complete', 'two-sum'],
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
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
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });
});

describe('resolveTargetProblem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should return provided slug as-is', async () => {
    const structure = getWorkspaceStructure(tempDir);
    const options: CompleteOptions = {
      problemSlug: 'two-sum',
      notes: undefined,
      noArchive: false,
      language: undefined,
    };
    const slug = await resolveTargetProblem(options, structure);
    deepStrictEqual(slug, 'two-sum');
  });

  it('should resolve numeric ID to slug', async () => {
    const structure = getWorkspaceStructure(tempDir);
    const options: CompleteOptions = {
      problemSlug: '1',
      notes: undefined,
      noArchive: false,
      language: undefined,
    };
    const slug = await resolveTargetProblem(options, structure);
    deepStrictEqual(slug, 'two-sum');
  });

  it('should auto-select single problem when no slug provided', async () => {
    await challengeCommand({ _: ['challenge', 'two-sum'] });
    const structure = getWorkspaceStructure(tempDir);
    const options: CompleteOptions = {
      problemSlug: undefined,
      notes: undefined,
      noArchive: false,
      language: undefined,
    };
    const slug = await resolveTargetProblem(options, structure);
    deepStrictEqual(slug, 'two-sum');
  });

  it('should throw ProblemError when no problems in workspace', async () => {
    const structure = getWorkspaceStructure(tempDir);
    const options: CompleteOptions = {
      problemSlug: undefined,
      notes: undefined,
      noArchive: false,
      language: undefined,
    };
    await rejects(() => resolveTargetProblem(options, structure), ProblemError);
  });
});

describe('validateCompletion', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir, language: 'typescript' });
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should not throw when problem exists in workspace', async () => {
    await challengeCommand({ _: ['challenge', 'two-sum'] });
    await validateCompletion('two-sum', tempDir, 'typescript');
  });

  it('should throw ProblemError when problem not in workspace', async () => {
    await rejects(() => validateCompletion('non-existent', tempDir, 'typescript'), ProblemError);
  });
});

describe('markCompleted', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should archive problem when noArchive is false', async () => {
    await challengeCommand({ _: ['challenge', 'two-sum'] });
    await markCompleted('two-sum', tempDir, 'typescript', false);
    ok(!(await pathExists(join(tempDir, 'problems', 'two-sum'))));
  });

  it('should keep files in workspace when noArchive is true', async () => {
    await challengeCommand({ _: ['challenge', 'two-sum'] });
    await markCompleted('two-sum', tempDir, 'typescript', true);
    ok(await pathExists(join(tempDir, 'problems', 'two-sum')));
  });
});
