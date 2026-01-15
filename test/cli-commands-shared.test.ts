/**
 * Tests for shared command utilities
 *
 * @module test/cli-commands-shared
 */

import { assertEquals, assertRejects } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { join } from '@std/path';
import {
  confirmAction,
  formatProblemSummary,
  requireProblemManager,
  requireWorkspace,
  resolveProblem,
} from '../src/cli/commands/shared.ts';
import { initWorkspace } from '../src/core/mod.ts';
import { WorkspaceError } from '../src/utils/errors.ts';
import type { Problem } from '../src/types/global.ts';

describe('requireWorkspace', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-test-' });
  });

  afterEach(async () => {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return workspace structure for initialized workspace', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Test requireWorkspace
    const structure = await requireWorkspace(tempDir);

    assertEquals(structure.root, tempDir);
    assertEquals(structure.problems, join(tempDir, 'problems'));
    assertEquals(structure.completed, join(tempDir, 'completed'));
    assertEquals(structure.templates, join(tempDir, 'templates'));
    assertEquals(structure.config, join(tempDir, 'config'));
  });

  it('should throw WorkspaceError for uninitialized workspace', async () => {
    // Don't initialize workspace, just use temp dir

    await assertRejects(
      async () => {
        await requireWorkspace(tempDir);
      },
      WorkspaceError,
      'Workspace not initialized',
    );
  });

  it('should throw WorkspaceError for non-existent directory', async () => {
    const nonExistentPath = join(tempDir, 'does-not-exist');

    await assertRejects(
      async () => {
        await requireWorkspace(nonExistentPath);
      },
      WorkspaceError,
    );
  });
});

describe('requireProblemManager', () => {
  it('should return initialized ProblemManager instance', async () => {
    const manager = await requireProblemManager();

    // Manager should be able to perform operations
    const allProblems = manager.list();
    assertEquals(typeof allProblems.total, 'number');
    assertEquals(Array.isArray(allProblems.problems), true);
  });

  it('should return a working manager that can find problems', async () => {
    const manager = await requireProblemManager();

    // Try to get a problem by ID (assuming built-in problems exist)
    const allProblems = manager.list({ limit: 1 });

    if (allProblems.problems.length > 0) {
      const firstProblem = allProblems.problems[0];
      const foundProblem = manager.getById(firstProblem.id);
      assertEquals(foundProblem?.id, firstProblem.id);
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
    assertEquals(problem?.id, testProblem.id);
    assertEquals(problem?.slug, testProblem.slug);
  });

  it('should resolve problem by ID (number)', () => {
    // Convert ID to number if it's numeric
    if (/^\d+$/.test(testProblem.id)) {
      const numericId = parseInt(testProblem.id);
      const problem = resolveProblem(numericId, manager);
      assertEquals(problem?.id, testProblem.id);
    }
  });

  it('should resolve problem by slug', () => {
    const problem = resolveProblem(testProblem.slug, manager);
    assertEquals(problem?.id, testProblem.id);
    assertEquals(problem?.slug, testProblem.slug);
  });

  it('should return null for non-existent ID', () => {
    const problem = resolveProblem('999999', manager);
    assertEquals(problem, null);
  });

  it('should return null for non-existent slug', () => {
    const problem = resolveProblem('non-existent-problem-slug', manager);
    assertEquals(problem, null);
  });

  it('should return null for "current" (not yet implemented)', () => {
    const problem = resolveProblem('current', manager);
    assertEquals(problem, null);
  });

  it('should return null when identifier is undefined', () => {
    const problem = resolveProblem(undefined, manager);
    assertEquals(problem, null);
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
    assertEquals(summary.includes('Two Sum'), true);
    assertEquals(summary.includes('EASY'), true);
    assertEquals(summary.includes('ID: 1'), true);
    assertEquals(summary.includes('Slug: two-sum'), true);
    assertEquals(summary.includes('array'), true);
    assertEquals(summary.includes('hash-table'), true);
  });

  it('should truncate description by default', () => {
    const summary = formatProblemSummary(mockProblem);

    // Should include start of description
    assertEquals(summary.includes('Given an array'), true);

    // Should be truncated (not full description)
    if (mockProblem.description.length > 100) {
      assertEquals(summary.includes('...'), true);
    }
  });

  it('should show full description in verbose mode', () => {
    const summary = formatProblemSummary(mockProblem, { verbose: true });

    // Should include full description
    assertEquals(summary.includes(mockProblem.description), true);
    assertEquals(summary.includes('Description:'), true);
  });

  it('should show examples count', () => {
    const summary = formatProblemSummary(mockProblem);
    assertEquals(summary.includes('Examples: 1'), true);
  });

  it('should show hints count', () => {
    const summary = formatProblemSummary(mockProblem);
    assertEquals(summary.includes('Hints available: 2'), true);
  });

  it('should handle problem with no tags', () => {
    const problemNoTags = { ...mockProblem, tags: [] };
    const summary = formatProblemSummary(problemNoTags);

    // Should not throw, should still format correctly
    assertEquals(summary.includes('Two Sum'), true);
    assertEquals(summary.includes('Tags:'), false);
  });

  it('should handle problem with no examples', () => {
    const problemNoExamples = { ...mockProblem, examples: [] };
    const summary = formatProblemSummary(problemNoExamples);

    // Should not throw, should still format correctly
    assertEquals(summary.includes('Two Sum'), true);
    assertEquals(summary.includes('Examples:'), false);
  });

  it('should handle problem with no hints', () => {
    const problemNoHints = { ...mockProblem, hints: [] };
    const summary = formatProblemSummary(problemNoHints);

    // Should not throw, should still format correctly
    assertEquals(summary.includes('Two Sum'), true);
    assertEquals(summary.includes('Hints available:'), false);
  });
});

describe('confirmAction', () => {
  // Note: confirmAction is difficult to test automatically as it requires stdin interaction
  // These tests document expected behavior but would need manual testing or stdin mocking

  it('should exist and be callable', () => {
    assertEquals(typeof confirmAction, 'function');
  });

  // TODO(CLI-001): Add tests with stdin mocking when test infrastructure supports it
  // For now, manual testing should verify:
  // - 'y' and 'yes' return true
  // - 'n' and 'no' return false
  // - Empty input uses default value
  // - Case-insensitive matching works
  // - Invalid input returns false
});
