/**
 * Tests for the progress command
 *
 * Tests the progress command implementation including:
 * - Option extraction
 * - Statistics calculation
 * - Output formatting
 * - Error handling
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { join } from '@std/path';
import type { Args } from '@std/cli/parse-args';
import {
  buildCategoryStats,
  buildDifficultyStats,
  countByDifficulty,
  countByTag,
  extractProgressOptions,
  progressCommand,
} from '../src/cli/commands/progress.ts';
import type { ProblemStatusMetadata } from '../src/cli/commands/progress.ts';
import { configManager } from '../src/config/manager.ts';
import { initWorkspace } from '../src/core/mod.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';

// Helper to capture console output
class ConsoleCapture {
  private originalLog = console.log;
  private originalError = console.error;
  private logOutput: string[] = [];
  private errorOutput: string[] = [];

  start() {
    this.logOutput = [];
    this.errorOutput = [];
    console.log = (...args: unknown[]) => {
      this.logOutput.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      this.errorOutput.push(args.map(String).join(' '));
    };
  }

  stop() {
    console.log = this.originalLog;
    console.error = this.originalError;
  }

  getLog(): string {
    return this.logOutput.join('\n');
  }

  getError(): string {
    return this.errorOutput.join('\n');
  }
}

describe('extractProgressOptions', () => {
  it('should extract default options', () => {
    const args: Args = { _: [] };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, false);
    assertEquals(options.byCategory, false);
    assertEquals(options.json, false);
  });

  it('should extract detailed flag', () => {
    const args: Args = { _: [], detailed: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
  });

  it('should extract detailed flag (short form)', () => {
    const args: Args = { _: [], d: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
  });

  it('should extract byCategory flag', () => {
    const args: Args = { _: [], category: true };
    const options = extractProgressOptions(args);
    assertEquals(options.byCategory, true);
  });

  it('should extract byCategory flag (short form)', () => {
    const args: Args = { _: [], c: true };
    const options = extractProgressOptions(args);
    assertEquals(options.byCategory, true);
  });

  it('should extract json flag', () => {
    const args: Args = { _: [], json: true };
    const options = extractProgressOptions(args);
    assertEquals(options.json, true);
  });

  it('should extract multiple flags', () => {
    const args: Args = { _: [], detailed: true, json: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
    assertEquals(options.json, true);
  });
});

describe('progressCommand', () => {
  let tempDir: string;
  let capture: ConsoleCapture;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await Deno.makeTempDir({ prefix: 'progress_test_' });

    // Initialize console capture
    capture = new ConsoleCapture();

    // Load config first, then update workspace
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
  });

  afterEach(async () => {
    // Restore console
    capture.stop();

    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should fail when workspace is not initialized', async () => {
    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.WORKSPACE_ERROR);
    assertStringIncludes(capture.getError(), 'not initialized');
  });

  it('should show empty progress for initialized empty workspace', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    const output = capture.getError();
    assertStringIncludes(output, 'Progress Summary');
    assertStringIncludes(output, 'Problems Completed: 0');
    assertStringIncludes(output, 'Problems In Progress: 0');
  });

  it('should display by difficulty breakdown', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Difficulty');
    assertStringIncludes(output, 'easy');
    assertStringIncludes(output, 'medium');
    assertStringIncludes(output, 'hard');
  });

  it('should show categories with --category flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], category: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Category');
  });

  it('should show detailed view with --detailed flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], detailed: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Category');
    assertStringIncludes(output, 'By Difficulty');
  });

  it('should output JSON with --json flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], json: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getLog();
    // Should be valid JSON
    const parsed = JSON.parse(output);
    assertEquals(typeof parsed.totalProblems, 'number');
    assertEquals(typeof parsed.currentProblems, 'number');
    assertEquals(typeof parsed.completedProblems, 'number');
    assertEquals(Array.isArray(parsed.byDifficulty), true);
    assertEquals(Array.isArray(parsed.byCategory), true);
  });

  it('should count current problems when they exist', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create a fake problem in current directory
    const problemDir = join(tempDir, 'problems', 'test-problem');
    await Deno.mkdir(problemDir, { recursive: true });

    // Create .problem.json metadata
    const metadata = {
      id: 'test-1',
      slug: 'test-problem',
      difficulty: 'easy',
      tags: ['array', 'test'],
    };
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify(metadata, null, 2),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems In Progress: 1');
  });

  it('should count completed problems when they exist', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create a fake problem in completed directory
    const problemDir = join(tempDir, 'completed', 'test-problem');
    await Deno.mkdir(problemDir, { recursive: true });

    // Create .problem.json metadata
    const metadata = {
      id: 'test-1',
      slug: 'test-problem',
      difficulty: 'medium',
      tags: ['string', 'test'],
    };
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify(metadata, null, 2),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems Completed: 1');
  });

  it('should count both current and completed problems', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create current problem
    const currentDir = join(tempDir, 'problems', 'current-problem');
    await Deno.mkdir(currentDir, { recursive: true });
    await Deno.writeTextFile(
      join(currentDir, '.problem.json'),
      JSON.stringify(
        {
          id: 'test-1',
          slug: 'current-problem',
          difficulty: 'easy',
          tags: ['array'],
        },
        null,
        2,
      ),
    );

    // Create completed problem
    const completedDir = join(tempDir, 'completed', 'completed-problem');
    await Deno.mkdir(completedDir, { recursive: true });
    await Deno.writeTextFile(
      join(completedDir, '.problem.json'),
      JSON.stringify(
        {
          id: 'test-2',
          slug: 'completed-problem',
          difficulty: 'hard',
          tags: ['dynamic-programming'],
        },
        null,
        2,
      ),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems In Progress: 1');
    assertStringIncludes(output, 'Problems Completed: 1');
  });

  it('should calculate completion percentage correctly', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Overall Completion:');
    assertStringIncludes(output, '%');
  });

  it('should handle errors gracefully', async () => {
    // Set invalid workspace path
    await configManager.updateConfig({ workspace: '/nonexistent/path' });

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.WORKSPACE_ERROR);
  });
});

describe('countByDifficulty', () => {
  it('returns empty map for empty input', () => {
    const result = countByDifficulty([]);
    assertEquals(result.size, 0);
  });

  it('counts a single easy problem', () => {
    const meta: ProblemStatusMetadata[] = [{ difficulty: 'easy' }];
    const result = countByDifficulty(meta);
    assertEquals(result.get('easy'), 1);
    assertEquals(result.get('medium'), undefined);
    assertEquals(result.get('hard'), undefined);
  });

  it('counts multiple difficulties', () => {
    const meta: ProblemStatusMetadata[] = [
      { difficulty: 'easy' },
      { difficulty: 'easy' },
      { difficulty: 'medium' },
      { difficulty: 'hard' },
    ];
    const result = countByDifficulty(meta);
    assertEquals(result.get('easy'), 2);
    assertEquals(result.get('medium'), 1);
    assertEquals(result.get('hard'), 1);
  });

  it('ignores items with undefined difficulty', () => {
    const meta: ProblemStatusMetadata[] = [{ tags: ['array'] }, { difficulty: 'medium' }];
    const result = countByDifficulty(meta);
    assertEquals(result.get('medium'), 1);
    assertEquals(result.size, 1);
  });
});

describe('countByTag', () => {
  it('returns empty map for empty input', () => {
    const result = countByTag([]);
    assertEquals(result.size, 0);
  });

  it('counts a single tag', () => {
    const meta: ProblemStatusMetadata[] = [{ tags: ['array'] }];
    const result = countByTag(meta);
    assertEquals(result.get('array'), 1);
  });

  it('counts multiple tags per item', () => {
    const meta: ProblemStatusMetadata[] = [{ tags: ['array', 'hash-map'] }];
    const result = countByTag(meta);
    assertEquals(result.get('array'), 1);
    assertEquals(result.get('hash-map'), 1);
  });

  it('accumulates the same tag across multiple items', () => {
    const meta: ProblemStatusMetadata[] = [
      { tags: ['array'] },
      { tags: ['array', 'two-pointers'] },
    ];
    const result = countByTag(meta);
    assertEquals(result.get('array'), 2);
    assertEquals(result.get('two-pointers'), 1);
  });

  it('ignores items with no tags', () => {
    const meta: ProblemStatusMetadata[] = [{ difficulty: 'easy' }, { tags: ['dp'] }];
    const result = countByTag(meta);
    assertEquals(result.get('dp'), 1);
    assertEquals(result.size, 1);
  });
});

describe('buildDifficultyStats', () => {
  it('returns an entry for each difficulty in the total map', () => {
    const current = new Map([['easy', 1]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const completed = new Map([['easy', 2]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const total = new Map([
      ['easy', 10],
      ['medium', 5],
      ['hard', 3],
    ] as [string, number][]) as Map<'easy' | 'medium' | 'hard', number>;
    const stats = buildDifficultyStats(current, completed, total);
    assertEquals(stats.length, 3);
  });

  it('maps current/completed/total counts per difficulty', () => {
    const current = new Map([['medium', 2]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const completed = new Map([['medium', 3]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const total = new Map([['medium', 20]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const stats = buildDifficultyStats(current, completed, total);
    const mediumStat = stats.find((s) => s.difficulty === 'medium');
    assertEquals(mediumStat?.current, 2);
    assertEquals(mediumStat?.completed, 3);
    assertEquals(mediumStat?.total, 20);
  });

  it('defaults missing counts to 0', () => {
    const current = new Map<'easy' | 'medium' | 'hard', number>();
    const completed = new Map<'easy' | 'medium' | 'hard', number>();
    const total = new Map([['hard', 7]] as [string, number][]) as Map<
      'easy' | 'medium' | 'hard',
      number
    >;
    const stats = buildDifficultyStats(current, completed, total);
    const hardStat = stats.find((s) => s.difficulty === 'hard');
    assertEquals(hardStat?.current, 0);
    assertEquals(hardStat?.completed, 0);
    assertEquals(hardStat?.total, 7);
  });
});

describe('buildCategoryStats', () => {
  it('returns an entry for each category in any of the three maps', () => {
    const current = new Map([['array', 1]]);
    const completed = new Map([['dp', 2]]);
    const total = new Map([['array', 5], ['dp', 8], ['graph', 3]]);
    const stats = buildCategoryStats(current, completed, total);
    assertEquals(stats.length, 3);
  });

  it('assigns current/completed/total per category', () => {
    const current = new Map([['array', 1]]);
    const completed = new Map([['array', 4]]);
    const total = new Map([['array', 10]]);
    const stats = buildCategoryStats(current, completed, total);
    const arrayStat = stats.find((s) => s.category === 'array');
    assertEquals(arrayStat?.current, 1);
    assertEquals(arrayStat?.completed, 4);
    assertEquals(arrayStat?.total, 10);
  });

  it('defaults to 0 when a category is absent from a map', () => {
    const current = new Map<string, number>();
    const completed = new Map<string, number>();
    const total = new Map([['tree', 6]]);
    const stats = buildCategoryStats(current, completed, total);
    const treeStat = stats.find((s) => s.category === 'tree');
    assertEquals(treeStat?.current, 0);
    assertEquals(treeStat?.completed, 0);
    assertEquals(treeStat?.total, 6);
  });

  it('sorts by completed descending then category name ascending', () => {
    const current = new Map<string, number>();
    const completed = new Map([['dp', 5], ['array', 3], ['graph', 5]]);
    const total = new Map([['dp', 10], ['array', 10], ['graph', 10]]);
    const stats = buildCategoryStats(current, completed, total);
    // dp and graph both have 5 completed, sorted alphabetically → graph < dp? No: 'dp' < 'graph'
    assertEquals(stats[0].category, 'dp');
    assertEquals(stats[1].category, 'graph');
    assertEquals(stats[2].category, 'array');
  });
});
