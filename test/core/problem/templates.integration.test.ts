/**
 * Integration tests for template rendering with real template files
 *
 * These tests verify that the template renderer works correctly with
 * actual template files from src/data/templates/
 *
 * @module test/core/problem/templates.integration
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
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
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
  ],
  hints: ['Use a hash map to store values you have seen.'],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

Deno.test('resolveTemplatePath - resolves existing TypeScript minimal template', async () => {
  const path = await resolveTemplatePath('typescript', 'minimal', 'solution');
  assertStringIncludes(path, 'typescript/minimal/solution.tpl');
});

Deno.test('resolveTemplatePath - resolves existing Python documented template', async () => {
  const path = await resolveTemplatePath('python', 'documented', 'readme');
  assertStringIncludes(path, 'python/documented/readme.tpl');
});

Deno.test('renderTemplate - renders TypeScript minimal solution template', async () => {
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
  assertStringIncludes(rendered, 'Two Sum');
  assertStringIncludes(rendered, 'twoSum');
  assertEquals(rendered.includes('{{PROBLEM_TITLE}}'), false);
  assertEquals(rendered.includes('{{FUNCTION_NAME}}'), false);
});

Deno.test('renderTemplate - renders TypeScript minimal readme template', async () => {
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
  assertStringIncludes(rendered, '# Two Sum');
  assertStringIncludes(rendered, 'Given an array of integers');
  assertStringIncludes(rendered, 'Example 1:');
  assertStringIncludes(rendered, 'nums = [2,7,11,15]');
  assertStringIncludes(rendered, '- 2 <= nums.length <= 10^4');
  assertEquals(rendered.includes('{{PROBLEM_TITLE}}'), false);
  assertEquals(rendered.includes('{{EXAMPLES}}'), false);
});

Deno.test('renderTemplate - renders Python comprehensive solution template', async () => {
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
  assertStringIncludes(rendered, 'Two Sum');
  assertStringIncludes(rendered, 'easy'); // difficulty in lowercase
  assertEquals(rendered.includes('{{PROBLEM_TITLE}}'), false);
  assertEquals(rendered.includes('{{PROBLEM_DIFFICULTY}}'), false);
});

Deno.test('renderAllTemplates - renders all TypeScript minimal templates', async () => {
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

  // Verify all three templates were rendered
  assertStringIncludes(solution, 'twoSum');
  assertStringIncludes(test, 'Two Sum');
  assertStringIncludes(readme, '# Two Sum');

  // Verify no unresolved placeholders in any template
  assertEquals(solution.includes('{{'), false);
  assertEquals(test.includes('{{'), false);
  assertEquals(readme.includes('{{'), false);
});

Deno.test('renderTemplate - handles problem without optional fields', async () => {
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
  assertStringIncludes(rendered, '# Minimal Test');
  assertStringIncludes(rendered, 'A minimal problem');
  assertStringIncludes(rendered, 'No examples provided');
  assertStringIncludes(rendered, 'No constraints specified');
});

Deno.test('renderTemplate - uses custom placeholders when provided', async () => {
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
  assertStringIncludes(rendered, '2025-01-14');
});

Deno.test('renderAllTemplates - works for all supported languages (minimal style)', async () => {
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

    // Verify all templates rendered without errors
    assertEquals(typeof solution, 'string');
    assertEquals(typeof test, 'string');
    assertEquals(typeof readme, 'string');

    // Verify no unresolved placeholders
    assertEquals(solution.includes('{{PROBLEM_'), false, `${language} solution has unresolved placeholders`);
    assertEquals(test.includes('{{PROBLEM_'), false, `${language} test has unresolved placeholders`);
    assertEquals(readme.includes('{{PROBLEM_'), false, `${language} readme has unresolved placeholders`);
  }
});
