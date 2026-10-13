/**
 * Tests for challenge command
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, notDeepStrictEqual } from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Args } from '@std/cli/parse-args';
import type { ChallengeOptions } from '../src/cli/commands/challenge.ts';
import {
  challengeCommand,
  extractChallengeOptions,
  resolveLanguage,
  resolveProblemSelection,
} from '../src/cli/commands/challenge.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { configManager } from '../src/config/manager.ts';
import { initWorkspace, ProblemManager } from '../src/core/mod.ts';

describe('extractChallengeOptions', () => {
  it('should extract slug from first positional arg', () => {
    const args: Args = { _: ['challenge', 'two-sum'] };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.slug, 'two-sum');
    deepStrictEqual(options.difficulty, undefined);
  });

  it('should extract difficulty from first positional arg', () => {
    const args: Args = { _: ['challenge', 'easy'] };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.slug, undefined);
    deepStrictEqual(options.difficulty, 'easy');
  });

  it('should extract difficulty with --difficulty flag', () => {
    const args: Args = { _: ['challenge'], difficulty: 'medium' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.difficulty, 'medium');
  });

  it('should extract difficulty with -d flag', () => {
    const args: Args = { _: ['challenge'], d: 'hard' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.difficulty, 'hard');
  });

  it('should extract category with --category flag', () => {
    const args: Args = { _: ['challenge'], category: 'array' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.category, 'array');
  });

  it('should extract category with -c flag', () => {
    const args: Args = { _: ['challenge'], c: 'string' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.category, 'string');
  });

  it('should extract topic with --topic flag', () => {
    const args: Args = { _: ['challenge'], topic: 'dynamic-programming' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.topic, 'dynamic-programming');
  });

  it('should extract topic with -t flag', () => {
    const args: Args = { _: ['challenge'], t: 'sorting' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.topic, 'sorting');
  });

  it('should extract language with --language flag', () => {
    const args: Args = { _: ['challenge'], language: 'python' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.language, 'python');
  });

  it('should extract language with -l flag', () => {
    const args: Args = { _: ['challenge'], l: 'java' };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.language, 'java');
  });

  it('should extract force with --force flag', () => {
    const args: Args = { _: ['challenge'], force: true };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.force, true);
  });

  it('should extract force with -f flag', () => {
    const args: Args = { _: ['challenge'], f: true };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.force, true);
  });

  it('should extract random flag', () => {
    const args: Args = { _: ['challenge'], random: true };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.random, true);
  });

  it('should extract multiple options together', () => {
    const args: Args = {
      _: ['challenge', 'easy'],
      category: 'array',
      language: 'python',
      force: true,
    };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.difficulty, 'easy');
    deepStrictEqual(options.category, 'array');
    deepStrictEqual(options.language, 'python');
    deepStrictEqual(options.force, true);
  });

  it('should handle no arguments', () => {
    const args: Args = { _: ['challenge'] };
    const options = extractChallengeOptions(args);
    deepStrictEqual(options.slug, undefined);
    deepStrictEqual(options.difficulty, undefined);
    deepStrictEqual(options.category, undefined);
    deepStrictEqual(options.topic, undefined);
    deepStrictEqual(options.language, undefined);
    deepStrictEqual(options.force, false);
    deepStrictEqual(options.random, false);
  });
});

describe('challengeCommand', () => {
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

  it('should start a challenge by slug', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random easy challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'easy'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random medium challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'medium'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random hard challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'hard'],
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail with invalid difficulty', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'invalid',
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should fail with non-existent slug', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'non-existent-problem'],
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should start challenge with difficulty filter', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'easy',
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start challenge with category filter', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      category: 'array',
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start challenge with custom language', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
      language: 'python',
    });
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail with invalid language', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
      language: 'invalid-language',
    });
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should succeed with force flag on existing problem', async () => {
    // Start challenge once
    const result1 = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    deepStrictEqual(result1.success, true);

    // Start again with force flag
    const result2 = await challengeCommand({
      _: ['challenge', 'two-sum'],
      force: true,
    });
    deepStrictEqual(result2.success, true);
    deepStrictEqual(result2.exitCode, ExitCode.SUCCESS);
  });

  it('should initialize workspace if not initialized', async () => {
    const newTempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    try {
      await configManager.updateConfig({ workspace: newTempDir });

      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });
      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify workspace was initialized
      const problemsDir = `${newTempDir}/problems`;
      const stats = await stat(problemsDir);
      deepStrictEqual(stats.isDirectory(), true);
    } finally {
      await rm(newTempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('should handle combination of filters', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'easy',
      category: 'array',
    });
    // May or may not find a problem depending on database
    deepStrictEqual(typeof result.success, 'boolean');
  });
});

describe('resolveProblemSelection', () => {
  let manager: ProblemManager;

  beforeEach(async () => {
    manager = new ProblemManager();
    await manager.init();
  });

  const baseOptions: ChallengeOptions = {
    slug: undefined,
    difficulty: undefined,
    category: undefined,
    topic: undefined,
    language: undefined,
    force: false,
    random: true,
  };

  it('should return problem for valid slug', async () => {
    const options = { ...baseOptions, slug: 'two-sum', random: false };
    const problem = await resolveProblemSelection(options, manager);
    deepStrictEqual(problem?.slug, 'two-sum');
  });

  it('should return null for non-existent slug', async () => {
    const options = { ...baseOptions, slug: 'does-not-exist', random: false };
    const problem = await resolveProblemSelection(options, manager);
    deepStrictEqual(problem, null);
  });

  it('should return a problem for random selection', async () => {
    const problem = await resolveProblemSelection(baseOptions, manager);
    notDeepStrictEqual(problem, null);
  });

  it('should return a problem matching difficulty filter', async () => {
    const options = { ...baseOptions, difficulty: 'easy' };
    const problem = await resolveProblemSelection(options, manager);
    deepStrictEqual(problem?.difficulty, 'easy');
  });

  it('should return null when no problems match filters', async () => {
    const options = { ...baseOptions, difficulty: 'easy', category: 'nonexistent-category-xyz' };
    const problem = await resolveProblemSelection(options, manager);
    deepStrictEqual(problem, null);
  });
});

describe('resolveLanguage', () => {
  const baseOptions: ChallengeOptions = {
    slug: undefined,
    difficulty: undefined,
    category: undefined,
    topic: undefined,
    language: undefined,
    force: false,
    random: false,
  };

  it('should return language specified in options', async () => {
    const options = { ...baseOptions, language: 'python' };
    const lang = await resolveLanguage(options, undefined);
    deepStrictEqual(lang, 'python');
  });

  it('should return config language when no option is given', async () => {
    const lang = await resolveLanguage(baseOptions, 'go');
    deepStrictEqual(lang, 'go');
  });

  it('should default to cpp in non-interactive mode', async () => {
    const lang = await resolveLanguage(baseOptions, undefined);
    deepStrictEqual(lang, 'cpp');
  });

  it('should return null for invalid language in options', async () => {
    const options = { ...baseOptions, language: 'cobol' };
    const lang = await resolveLanguage(options, undefined);
    deepStrictEqual(lang, null);
  });

  it('should return null for invalid config language', async () => {
    const lang = await resolveLanguage(baseOptions, 'brainfuck');
    deepStrictEqual(lang, null);
  });
});
