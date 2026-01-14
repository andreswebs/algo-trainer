/**
 * Golden output tests for template rendering
 *
 * These tests verify that template rendering produces exact expected output
 * by comparing against known-good reference files (golden files).
 *
 * @module test/core/problem/templates.golden
 */

import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { renderTemplate, type TemplateContext } from '../../../src/core/problem/templates.ts';
import type { Problem } from '../../../src/types/global.ts';

// Test problem with consistent data for golden output tests
const goldenTestProblem: Problem = {
  id: 'test-001',
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
  ],
  hints: ['Use a hash map to store values you have seen.'],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

// Fixtures directory path
const fixturesDir = join(
  new URL('.', import.meta.url).pathname,
  '../../fixtures/templates/golden',
);

/**
 * Load golden output file
 */
async function loadGoldenFile(filename: string): Promise<string> {
  const path = join(fixturesDir, filename);
  return await Deno.readTextFile(path);
}

Deno.test('golden output - TypeScript minimal solution template', async () => {
  const context: TemplateContext = {
    problem: goldenTestProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
    customPlaceholders: {
      DATE: '2024-01-01', // Fixed date for reproducibility
    },
  };

  const rendered = await renderTemplate(context, 'solution');
  const golden = await loadGoldenFile('solution.golden.txt');

  assertEquals(
    rendered,
    golden,
    'Rendered solution template should match golden output',
  );
});

Deno.test('golden output - TypeScript minimal test template', async () => {
  const context: TemplateContext = {
    problem: goldenTestProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
    customPlaceholders: {
      DATE: '2024-01-01', // Fixed date for reproducibility
    },
  };

  const rendered = await renderTemplate(context, 'test');
  const golden = await loadGoldenFile('test.golden.txt');

  assertEquals(
    rendered,
    golden,
    'Rendered test template should match golden output',
  );
});

Deno.test('golden output - TypeScript minimal readme template', async () => {
  const context: TemplateContext = {
    problem: goldenTestProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
    customPlaceholders: {
      DATE: '2024-01-01', // Fixed date for reproducibility
    },
  };

  const rendered = await renderTemplate(context, 'readme');
  const golden = await loadGoldenFile('readme.golden.txt');

  assertEquals(
    rendered,
    golden,
    'Rendered readme template should match golden output',
  );
});
