/**
 * Integration tests for template rendering with real template files
 *
 * These tests verify that the template renderer works correctly with
 * actual template files from src/data/templates/
 *
 * @module test/core/problem/templates.integration
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import {
  renderAllTemplates,
  renderTemplate,
  resolveTemplatePath,
  type TemplateContext,
} from '../../../src/core/problem/templates.ts';
import type { Problem, SupportedLanguage } from '../../../src/types/global.ts';

// Test problem with comprehensive data
const testProblem: Problem = {
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
  constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
  hints: ['Use a hash map to store values you have seen.'],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

test('resolveTemplatePath - resolves existing TypeScript minimal template', async () => {
  const path = await resolveTemplatePath('typescript', 'minimal', 'solution');
  ok(path.includes('typescript/minimal/solution.tpl'));
});

test('resolveTemplatePath - resolves existing Python documented template', async () => {
  const path = await resolveTemplatePath('python', 'documented', 'readme');
  ok(path.includes('python/documented/readme.tpl'));
});

test('renderTemplate - renders TypeScript minimal solution template', async () => {
  const context: TemplateContext = {
    problem: testProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  const rendered = await renderTemplate(context, 'solution');

  // Verify placeholder replacement
  ok(rendered.includes('Two Sum'));
  ok(rendered.includes('twoSum'));
  deepStrictEqual(rendered.includes('{{PROBLEM_TITLE}}'), false);
  deepStrictEqual(rendered.includes('{{FUNCTION_NAME}}'), false);
});

test('renderTemplate - renders TypeScript minimal readme template', async () => {
  const context: TemplateContext = {
    problem: testProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  const rendered = await renderTemplate(context, 'readme');

  // Verify placeholder replacement
  ok(rendered.includes('# Two Sum'));
  ok(rendered.includes('Given an array of integers'));
  ok(rendered.includes('Example 1:'));
  ok(rendered.includes('nums = [2,7,11,15]'));
  ok(rendered.includes('- 2 <= nums.length <= 10^4'));
  deepStrictEqual(rendered.includes('{{PROBLEM_TITLE}}'), false);
  deepStrictEqual(rendered.includes('{{EXAMPLES}}'), false);
});

test('renderTemplate - renders Python comprehensive solution template', async () => {
  const context: TemplateContext = {
    problem: testProblem,
    config: {
      language: 'python',
      style: 'comprehensive',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  const rendered = await renderTemplate(context, 'solution');

  // Verify placeholder replacement and Python-specific formatting
  ok(rendered.includes('Two Sum'));
  ok(rendered.includes('easy')); // difficulty in lowercase
  deepStrictEqual(rendered.includes('{{PROBLEM_TITLE}}'), false);
  deepStrictEqual(rendered.includes('{{PROBLEM_DIFFICULTY}}'), false);
});

test('renderAllTemplates - renders all TypeScript minimal templates', async () => {
  const context: TemplateContext = {
    problem: testProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  const { solution, test, readme } = await renderAllTemplates(context);

  // Verify all three templates were rendered (typescript scaffolding includes test)
  ok(solution.includes('twoSum'));
  ok(test != null);
  ok(test.includes('Two Sum'));
  ok(readme.includes('# Two Sum'));

  // Verify no unresolved placeholders in any template
  deepStrictEqual(solution.includes('{{'), false);
  deepStrictEqual(test.includes('{{'), false);
  deepStrictEqual(readme.includes('{{'), false);
});

test('renderTemplate - handles problem without optional fields', async () => {
  const minimalProblem: Problem = {
    id: 'min-001',
    slug: 'minimal-test',
    title: 'Minimal Test',
    difficulty: 'medium',
    description: 'A minimal problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const context: TemplateContext = {
    problem: minimalProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  const rendered = await renderTemplate(context, 'readme');

  // Should handle missing data gracefully
  ok(rendered.includes('# Minimal Test'));
  ok(rendered.includes('A minimal problem'));
  ok(rendered.includes('No examples provided'));
  ok(rendered.includes('No constraints specified'));
});

test('renderTemplate - uses custom placeholders when provided', async () => {
  const context: TemplateContext = {
    problem: testProblem,
    config: {
      language: 'typescript',
      style: 'comprehensive',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
    customPlaceholders: {
      DATE: '2025-01-14',
    },
  };

  const rendered = await renderTemplate(context, 'solution');

  // Custom placeholder should override default
  ok(rendered.includes('2025-01-14'));
});

test('renderAllTemplates - works for all supported languages (minimal style)', async () => {
  const languages = ['typescript', 'javascript', 'python', 'java', 'cpp', 'rust', 'go'];

  for (const language of languages) {
    const context: TemplateContext = {
      problem: testProblem,
      config: {
        language: language as SupportedLanguage,
        style: 'minimal',
        includeImports: true,
        includeTypes: true,
        includeExample: false,
      },
    };

    const { solution, test, readme } = await renderAllTemplates(context);

    // Verify required templates rendered without errors
    deepStrictEqual(typeof solution, 'string');
    deepStrictEqual(typeof readme, 'string');

    // cpp scaffolding skips the standalone test file (replaced by harness +
    // input.txt + CMakeLists). All other languages still emit one.
    if (language === 'cpp') {
      deepStrictEqual(test, undefined);
    } else {
      ok(test != null);
      deepStrictEqual(
        test.includes('{{PROBLEM_'),
        false,
        `${language} test has unresolved placeholders`,
      );
    }

    // Verify no unresolved placeholders in solution and readme
    deepStrictEqual(
      solution.includes('{{PROBLEM_'),
      false,
      `${language} solution has unresolved placeholders`,
    );
    deepStrictEqual(
      readme.includes('{{PROBLEM_'),
      false,
      `${language} readme has unresolved placeholders`,
    );
  }
});
