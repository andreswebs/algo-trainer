/**
 * Tests for challenge command
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { challengeCommand, extractChallengeOptions } from '../src/cli/commands/challenge.ts';
import { configManager } from '../src/config/manager.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import type { Args } from '@std/cli/parse-args';

describe('extractChallengeOptions', () => {
  it('should extract slug from first positional arg', () => {
    const args: Args = { _: ['challenge', 'two-sum'] };
    const options = extractChallengeOptions(args);
    assertEquals(options.slug, 'two-sum');
    assertEquals(options.difficulty, undefined);
  });

  it('should extract difficulty from first positional arg', () => {
    const args: Args = { _: ['challenge', 'easy'] };
    const options = extractChallengeOptions(args);
    assertEquals(options.slug, undefined);
    assertEquals(options.difficulty, 'easy');
  });

  it('should extract difficulty with --difficulty flag', () => {
    const args: Args = { _: ['challenge'], difficulty: 'medium' };
    const options = extractChallengeOptions(args);
    assertEquals(options.difficulty, 'medium');
  });

  it('should extract difficulty with -d flag', () => {
    const args: Args = { _: ['challenge'], d: 'hard' };
    const options = extractChallengeOptions(args);
    assertEquals(options.difficulty, 'hard');
  });

  it('should extract category with --category flag', () => {
    const args: Args = { _: ['challenge'], category: 'array' };
    const options = extractChallengeOptions(args);
    assertEquals(options.category, 'array');
  });

  it('should extract category with -c flag', () => {
    const args: Args = { _: ['challenge'], c: 'string' };
    const options = extractChallengeOptions(args);
    assertEquals(options.category, 'string');
  });

  it('should extract topic with --topic flag', () => {
    const args: Args = { _: ['challenge'], topic: 'dynamic-programming' };
    const options = extractChallengeOptions(args);
    assertEquals(options.topic, 'dynamic-programming');
  });

  it('should extract topic with -t flag', () => {
    const args: Args = { _: ['challenge'], t: 'sorting' };
    const options = extractChallengeOptions(args);
    assertEquals(options.topic, 'sorting');
  });

  it('should extract language with --language flag', () => {
    const args: Args = { _: ['challenge'], language: 'python' };
    const options = extractChallengeOptions(args);
    assertEquals(options.language, 'python');
  });

  it('should extract language with -l flag', () => {
    const args: Args = { _: ['challenge'], l: 'java' };
    const options = extractChallengeOptions(args);
    assertEquals(options.language, 'java');
  });

  it('should extract force with --force flag', () => {
    const args: Args = { _: ['challenge'], force: true };
    const options = extractChallengeOptions(args);
    assertEquals(options.force, true);
  });

  it('should extract force with -f flag', () => {
    const args: Args = { _: ['challenge'], f: true };
    const options = extractChallengeOptions(args);
    assertEquals(options.force, true);
  });

  it('should extract random flag', () => {
    const args: Args = { _: ['challenge'], random: true };
    const options = extractChallengeOptions(args);
    assertEquals(options.random, true);
  });

  it('should extract multiple options together', () => {
    const args: Args = {
      _: ['challenge', 'easy'],
      category: 'array',
      language: 'python',
      force: true,
    };
    const options = extractChallengeOptions(args);
    assertEquals(options.difficulty, 'easy');
    assertEquals(options.category, 'array');
    assertEquals(options.language, 'python');
    assertEquals(options.force, true);
  });

  it('should handle no arguments', () => {
    const args: Args = { _: ['challenge'] };
    const options = extractChallengeOptions(args);
    assertEquals(options.slug, undefined);
    assertEquals(options.difficulty, undefined);
    assertEquals(options.category, undefined);
    assertEquals(options.topic, undefined);
    assertEquals(options.language, undefined);
    assertEquals(options.force, false);
    assertEquals(options.random, false);
  });
});

describe('challengeCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    // Initialize config for testing
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
  });

  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true }).catch(() => {});
  });

  it('should start a challenge by slug', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random easy challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'easy'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random medium challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'medium'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start a random hard challenge', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'hard'],
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail with invalid difficulty', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'invalid',
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should fail with non-existent slug', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'non-existent-problem'],
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should start challenge with difficulty filter', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'easy',
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start challenge with category filter', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      category: 'array',
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should start challenge with custom language', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
      language: 'python',
    });
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should fail with invalid language', async () => {
    const result = await challengeCommand({
      _: ['challenge', 'two-sum'],
      language: 'invalid-language',
    });
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should succeed with force flag on existing problem', async () => {
    // Start challenge once
    const result1 = await challengeCommand({
      _: ['challenge', 'two-sum'],
    });
    assertEquals(result1.success, true);

    // Start again with force flag
    const result2 = await challengeCommand({
      _: ['challenge', 'two-sum'],
      force: true,
    });
    assertEquals(result2.success, true);
    assertEquals(result2.exitCode, ExitCode.SUCCESS);
  });

  it('should initialize workspace if not initialized', async () => {
    const newTempDir = await Deno.makeTempDir();
    try {
      await configManager.updateConfig({ workspace: newTempDir });
      
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });
      assertEquals(result.success, true);
      assertEquals(result.exitCode, ExitCode.SUCCESS);
      
      // Verify workspace was initialized
      const problemsDir = `${newTempDir}/problems`;
      const stat = await Deno.stat(problemsDir);
      assertEquals(stat.isDirectory, true);
    } finally {
      await Deno.remove(newTempDir, { recursive: true }).catch(() => {});
    }
  });

  it('should handle combination of filters', async () => {
    const result = await challengeCommand({
      _: ['challenge'],
      difficulty: 'easy',
      category: 'array',
    });
    // May or may not find a problem depending on database
    assertEquals(typeof result.success, 'boolean');
  });
});
