/**
 * Tests for shared command utilities
 *
 * @module test/cli-commands-shared
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, rejects } from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  confirmAction,
  formatProblemSummary,
  requireProblemManager,
  requireWorkspace,
  resolveProblem,
} from '../src/cli/commands/shared.ts';
import { configManager } from '../src/config/manager.ts';
import { initWorkspace } from '../src/core/mod.ts';
import type { Problem } from '../src/types/global.ts';
import { WorkspaceError } from '../src/utils/errors.ts';
import { assertRejectsWith } from './helpers/assert.ts';

describe('requireWorkspace', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-test-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return workspace structure for initialized workspace', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Test requireWorkspace
    const structure = await requireWorkspace(tempDir);

    deepStrictEqual(structure.root, tempDir);
    deepStrictEqual(structure.problems, join(tempDir, 'problems'));
    deepStrictEqual(structure.completed, join(tempDir, 'completed'));
    deepStrictEqual(structure.templates, join(tempDir, 'templates'));
    deepStrictEqual(structure.config, join(tempDir, 'config'));
  });

  it('should throw WorkspaceError for uninitialized workspace', async () => {
    // Don't initialize workspace, just use temp dir

    await assertRejectsWith(
      async () => {
        await requireWorkspace(tempDir);
      },
      WorkspaceError,
      'Workspace not initialized',
    );
  });

  it('should throw WorkspaceError for non-existent directory', async () => {
    const nonExistentPath = join(tempDir, 'does-not-exist');

    await rejects(async () => {
      await requireWorkspace(nonExistentPath);
    }, WorkspaceError);
  });

  describe('with no workspace configured', () => {
    let originalCwd: string;

    beforeEach(async () => {
      originalCwd = process.cwd();
      await configManager.load();
      await configManager.updateConfig({ workspace: '' });
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should fall back to an initialized current directory', async () => {
      await initWorkspace(tempDir);

      const structure = await requireWorkspace();

      deepStrictEqual(structure.root, await realpath(tempDir));
    });

    it('should throw WorkspaceError when current directory is not initialized', async () => {
      await assertRejectsWith(
        async () => {
          await requireWorkspace();
        },
        WorkspaceError,
        'Workspace not initialized',
      );
    });
  });
});

describe('requireProblemManager', () => {
  it('should return initialized ProblemManager instance', async () => {
    const manager = await requireProblemManager();

    // Manager should be able to perform operations
    const allProblems = manager.list();
    deepStrictEqual(typeof allProblems.total, 'number');
    deepStrictEqual(Array.isArray(allProblems.problems), true);
  });

  it('should return a working manager that can find problems', async () => {
    const manager = await requireProblemManager();

    // Try to get a problem by ID (assuming built-in problems exist)
    const allProblems = manager.list({ limit: 1 });

    if (allProblems.problems.length > 0) {
      const firstProblem = allProblems.problems[0];
      const foundProblem = manager.getById(firstProblem.id);
      deepStrictEqual(foundProblem?.id, firstProblem.id);
    }
  });
});

describe('resolveProblem', () => {
  let manager: Awaited<ReturnType<typeof requireProblemManager>>;
  let testProblem: Problem;

  beforeEach(async () => {
    manager = await requireProblemManager();

    // Get a problem from the database to test with
    const result = manager.list({ limit: 1 });
    if (result.problems.length === 0) {
      throw new Error('No problems in database for testing');
    }
    testProblem = result.problems[0];
  });

  it('should resolve problem by ID (string)', () => {
    const problem = resolveProblem(testProblem.id, manager);
    deepStrictEqual(problem?.id, testProblem.id);
    deepStrictEqual(problem?.slug, testProblem.slug);
  });

  it('should resolve problem by ID (number)', () => {
    // Convert ID to number if it's numeric
    if (/^\d+$/.test(testProblem.id)) {
      const numericId = parseInt(testProblem.id, 10);
      const problem = resolveProblem(numericId, manager);
      deepStrictEqual(problem?.id, testProblem.id);
    }
  });

  it('should resolve problem by slug', () => {
    const problem = resolveProblem(testProblem.slug, manager);
    deepStrictEqual(problem?.id, testProblem.id);
    deepStrictEqual(problem?.slug, testProblem.slug);
  });

  it('should return null for non-existent ID', () => {
    const problem = resolveProblem('999999', manager);
    deepStrictEqual(problem, null);
  });

  it('should return null for non-existent slug', () => {
    const problem = resolveProblem('non-existent-problem-slug', manager);
    deepStrictEqual(problem, null);
  });

  it('should return null for "current" (not yet implemented)', () => {
    const problem = resolveProblem('current', manager);
    deepStrictEqual(problem, null);
  });

  it('should return null when identifier is undefined', () => {
    const problem = resolveProblem(undefined, manager);
    deepStrictEqual(problem, null);
  });
});

describe('formatProblemSummary', () => {
  const mockProblem: Problem = {
    id: '1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    examples: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        output: [0, 1],
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      "Use a hash map to store numbers you've seen",
      'For each number, check if target - number exists in the map',
    ],
    tags: ['array', 'hash-table'],
  };

  it('should format basic problem summary', () => {
    const summary = formatProblemSummary(mockProblem);

    // Check that key information is present
    deepStrictEqual(summary.includes('Two Sum'), true);
    deepStrictEqual(summary.includes('EASY'), true);
    deepStrictEqual(summary.includes('ID: 1'), true);
    deepStrictEqual(summary.includes('Slug: two-sum'), true);
    deepStrictEqual(summary.includes('array'), true);
    deepStrictEqual(summary.includes('hash-table'), true);
  });

  it('should truncate description by default', () => {
    const summary = formatProblemSummary(mockProblem);

    // Should include start of description
    deepStrictEqual(summary.includes('Given an array'), true);

    // Should be truncated (not full description)
    if (mockProblem.description.length > 100) {
      deepStrictEqual(summary.includes('...'), true);
    }
  });

  it('should show full description in verbose mode', () => {
    const summary = formatProblemSummary(mockProblem, { verbose: true });

    // Should include full description
    deepStrictEqual(summary.includes(mockProblem.description), true);
    deepStrictEqual(summary.includes('Description:'), true);
  });

  it('should show examples count', () => {
    const summary = formatProblemSummary(mockProblem);
    deepStrictEqual(summary.includes('Examples: 1'), true);
  });

  it('should show hints count', () => {
    const summary = formatProblemSummary(mockProblem);
    deepStrictEqual(summary.includes('Hints available: 2'), true);
  });

  it('should handle problem with no tags', () => {
    const problemNoTags = { ...mockProblem, tags: [] };
    const summary = formatProblemSummary(problemNoTags);

    // Should not throw, should still format correctly
    deepStrictEqual(summary.includes('Two Sum'), true);
    deepStrictEqual(summary.includes('Tags:'), false);
  });

  it('should handle problem with no examples', () => {
    const problemNoExamples = { ...mockProblem, examples: [] };
    const summary = formatProblemSummary(problemNoExamples);

    // Should not throw, should still format correctly
    deepStrictEqual(summary.includes('Two Sum'), true);
    deepStrictEqual(summary.includes('Examples:'), false);
  });

  it('should handle problem with no hints', () => {
    const problemNoHints = { ...mockProblem, hints: [] };
    const summary = formatProblemSummary(problemNoHints);

    // Should not throw, should still format correctly
    deepStrictEqual(summary.includes('Two Sum'), true);
    deepStrictEqual(summary.includes('Hints available:'), false);
  });
});

describe('confirmAction', () => {
  // Note: confirmAction is difficult to test automatically as it requires stdin interaction
  // These tests document expected behavior but would need manual testing or stdin mocking

  it('should exist and be callable', () => {
    deepStrictEqual(typeof confirmAction, 'function');
  });

  // TODO(CLI-001): Add tests with stdin mocking when test infrastructure supports it
  // For now, manual testing should verify:
  // - 'y' and 'yes' return true
  // - 'n' and 'no' return false
  // - Empty input uses default value
  // - Case-insensitive matching works
  // - Invalid input returns false
});
