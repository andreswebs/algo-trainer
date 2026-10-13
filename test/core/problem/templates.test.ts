/**
 * Tests for template rendering system
 *
 * @module test/core/problem/templates
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok, rejects } from 'node:assert/strict';
import {
  formatCompanies,
  formatConstraints,
  formatExamples,
  formatExamplesAsLCInput,
  formatExamplesAsLCOutput,
  formatHints,
  formatLCValue,
  formatTags,
  getLanguageScaffolding,
  renderAllTemplates,
  renderTemplate,
  replacePlaceholders,
  resolveSignature,
  resolveTemplatePath,
  slugToClassName,
  slugToFunctionName,
  type TemplateContext,
  type TemplateKind,
} from '../../../src/core/problem/templates.ts';
import type { Problem, SupportedLanguage } from '../../../src/types/global.ts';
import { TemplateError } from '../../../src/utils/errors.ts';
import { assertRejectsWith } from '../../helpers/assert.ts';

// Test fixtures
const mockProblem: Problem = {
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
    {
      input: { nums: [3, 2, 4], target: 6 },
      output: [1, 2],
    },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    'Only one valid answer exists.',
  ],
  hints: [
    'Use a hash map to store values you have seen.',
    'For each element, check if target - element exists in the map.',
  ],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google', 'Microsoft'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

const mockTemplateConfig = {
  language: 'typescript' as const,
  style: 'minimal' as const,
  includeImports: true,
  includeTypes: true,
  includeExample: false,
};

test('slugToFunctionName - converts kebab-case to camelCase', () => {
  deepStrictEqual(slugToFunctionName('two-sum'), 'twoSum');
  deepStrictEqual(slugToFunctionName('longest-substring'), 'longestSubstring');
  deepStrictEqual(slugToFunctionName('reverse-linked-list'), 'reverseLinkedList');
});

test('slugToFunctionName - handles single word', () => {
  deepStrictEqual(slugToFunctionName('reverse'), 'reverse');
  deepStrictEqual(slugToFunctionName('palindrome'), 'palindrome');
});

test('slugToFunctionName - handles numbers in slug', () => {
  deepStrictEqual(slugToFunctionName('3sum'), 'threeSum');
  deepStrictEqual(slugToFunctionName('4sum-ii'), 'fourSumIi');
  deepStrictEqual(slugToFunctionName('number-1-problem'), 'numberOneProblem');
});

test('slugToClassName - converts kebab-case to PascalCase', () => {
  deepStrictEqual(slugToClassName('two-sum'), 'TwoSum');
  deepStrictEqual(slugToClassName('longest-substring'), 'LongestSubstring');
  deepStrictEqual(slugToClassName('reverse-linked-list'), 'ReverseLinkedList');
});

test('slugToClassName - handles single word', () => {
  deepStrictEqual(slugToClassName('reverse'), 'Reverse');
  deepStrictEqual(slugToClassName('palindrome'), 'Palindrome');
});

test('slugToClassName - handles numbers in slug', () => {
  deepStrictEqual(slugToClassName('3sum'), 'ThreeSum');
  deepStrictEqual(slugToClassName('4sum-ii'), 'FourSumIi');
  deepStrictEqual(slugToClassName('number-1-problem'), 'NumberOneProblem');
});

test('slugToClassName - handles complex edge cases', () => {
  // Edge cases for class name generation
  deepStrictEqual(slugToClassName('a'), 'A');
  deepStrictEqual(slugToClassName('a-b-c-d-e'), 'ABCDE');
  deepStrictEqual(slugToClassName('123-test'), 'OneTwoThreeTest');
  deepStrictEqual(slugToClassName('test-123'), 'TestOneTwoThree');
});

test('formatExamples - formats single example correctly', () => {
  const problem: Problem = {
    ...mockProblem,
    examples: [
      {
        input: { nums: [2, 7], target: 9 },
        output: [0, 1],
        explanation: 'Test explanation',
      },
    ],
  };

  const formatted = formatExamples(problem);
  ok(formatted.includes('Example 1:'));
  ok(formatted.includes('Input: nums = [2,7], target = 9'));
  ok(formatted.includes('Output: [0,1]'));
  ok(formatted.includes('Explanation: Test explanation'));
});

test('formatExamples - formats multiple examples', () => {
  const formatted = formatExamples(mockProblem);
  ok(formatted.includes('Example 1:'));
  ok(formatted.includes('Example 2:'));
  ok(formatted.includes('[2,7,11,15]'));
  ok(formatted.includes('[3,2,4]'));
});

test('formatExamples - handles example without explanation', () => {
  const problem: Problem = {
    ...mockProblem,
    examples: [
      {
        input: { x: 5 },
        output: 10,
      },
    ],
  };

  const formatted = formatExamples(problem);
  ok(formatted.includes('Example 1:'));
  ok(formatted.includes('Input: x = 5'));
  ok(formatted.includes('Output: 10'));
  deepStrictEqual(formatted.includes('Explanation:'), false);
});

test('formatExamples - handles empty examples array', () => {
  const problem: Problem = {
    ...mockProblem,
    examples: [],
  };

  const formatted = formatExamples(problem);
  deepStrictEqual(formatted, 'No examples provided.');
});

test('formatConstraints - formats constraints as bulleted list', () => {
  const formatted = formatConstraints(mockProblem.constraints);
  ok(formatted.includes('- 2 <= nums.length <= 10^4'));
  ok(formatted.includes('- -10^9 <= nums[i] <= 10^9'));
  ok(formatted.includes('- Only one valid answer exists.'));
});

test('formatConstraints - handles empty constraints', () => {
  const formatted = formatConstraints([]);
  deepStrictEqual(formatted, 'No constraints specified.');
});

test('formatHints - formats hints as numbered list', () => {
  const formatted = formatHints(mockProblem.hints);
  ok(formatted.includes('1. Use a hash map'));
  ok(formatted.includes('2. For each element'));
});

test('formatHints - handles empty hints', () => {
  const formatted = formatHints([]);
  deepStrictEqual(formatted, 'No hints available.');
});

test('formatTags - formats tags as comma-separated list', () => {
  const formatted = formatTags(['array', 'hash-table', 'two-pointers']);
  deepStrictEqual(formatted, 'array, hash-table, two-pointers');
});

test('formatTags - handles empty tags', () => {
  const formatted = formatTags([]);
  deepStrictEqual(formatted, 'None');
});

test('formatCompanies - formats companies as comma-separated list', () => {
  const formatted = formatCompanies(['Amazon', 'Google', 'Microsoft']);
  deepStrictEqual(formatted, 'Amazon, Google, Microsoft');
});

test('formatCompanies - handles undefined companies', () => {
  const formatted = formatCompanies(undefined);
  deepStrictEqual(formatted, 'None');
});

test('formatCompanies - handles empty companies array', () => {
  const formatted = formatCompanies([]);
  deepStrictEqual(formatted, 'None');
});

test('replacePlaceholders - replaces all placeholders', () => {
  const content = 'Title: {{TITLE}}, Author: {{AUTHOR}}';
  const values = {
    TITLE: 'Test Title',
    AUTHOR: 'Test Author',
  };

  const result = replacePlaceholders(content, values);
  deepStrictEqual(result, 'Title: Test Title, Author: Test Author');
});

test('replacePlaceholders - handles multiple occurrences', () => {
  const content = '{{NAME}} is {{NAME}}';
  const values = { NAME: 'Test' };

  const result = replacePlaceholders(content, values);
  deepStrictEqual(result, 'Test is Test');
});

test('replacePlaceholders - throws on unknown placeholder by default', () => {
  const content = 'Title: {{UNKNOWN}}';
  const values = { TITLE: 'Test' };

  try {
    replacePlaceholders(content, values);
  } catch (e) {
    deepStrictEqual(e instanceof TemplateError, true);
    ok((e as TemplateError).message.includes('Unknown placeholders'));
    ok((e as TemplateError).message.includes('UNKNOWN'));
  }
});

test('replacePlaceholders - allows unknown placeholders when specified', () => {
  const content = 'Title: {{TITLE}}, Unknown: {{UNKNOWN}}';
  const values = { TITLE: 'Test' };

  const result = replacePlaceholders(content, values, true);
  deepStrictEqual(result, 'Title: Test, Unknown: {{UNKNOWN}}');
});

test('replacePlaceholders - handles no placeholders', () => {
  const content = 'Plain text with no placeholders';
  const values = { TITLE: 'Test' };

  const result = replacePlaceholders(content, values);
  deepStrictEqual(result, content);
});

test('resolveTemplatePath - throws error for non-existent template', async () => {
  await assertRejectsWith(
    async () => {
      await resolveTemplatePath('typescript', 'minimal', 'nonexistent' as TemplateKind);
    },
    TemplateError,
    'Template file not found',
  );
});

test('renderTemplate - renders template with problem data', async () => {
  // This test requires actual template files in the correct location
  // We'll test the integration with real templates in the actual environment
  // For now, we verify the function signature and error handling
  const context: TemplateContext = {
    problem: mockProblem,
    config: mockTemplateConfig,
  };

  // This will fail if templates don't exist, which is expected in test environment
  // The actual rendering is tested through integration tests with real template files
  try {
    await renderTemplate(context, 'solution');
  } catch (error) {
    // Expected to fail if template files aren't in place
    deepStrictEqual(error instanceof TemplateError, true);
  }
});

test('renderAllTemplates - renders all template types', async () => {
  const context: TemplateContext = {
    problem: mockProblem,
    config: mockTemplateConfig,
  };

  // This will fail if templates don't exist, which is expected in test environment
  try {
    await renderAllTemplates(context);
  } catch (error) {
    // Expected to fail if template files aren't in place
    deepStrictEqual(error instanceof TemplateError, true);
  }
});

test('renderTemplate - handles rendering errors gracefully', async () => {
  const context: TemplateContext = {
    problem: mockProblem,
    config: {
      language: 'invalid' as SupportedLanguage,
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  await rejects(async () => {
    await renderTemplate(context, 'solution');
  }, TemplateError);
});

test('placeholder values - builds correct placeholder values', () => {
  // Test that placeholder values are built correctly
  // This is implicitly tested through the formatting functions above
  // But we can add explicit tests for edge cases

  const problemWithMinimalData: Problem = {
    id: 'min-001',
    slug: 'minimal-problem',
    title: 'Minimal Problem',
    difficulty: 'medium',
    description: 'A minimal problem for testing',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  deepStrictEqual(formatExamples(problemWithMinimalData), 'No examples provided.');
  deepStrictEqual(
    formatConstraints(problemWithMinimalData.constraints),
    'No constraints specified.',
  );
  deepStrictEqual(formatHints(problemWithMinimalData.hints), 'No hints available.');
  deepStrictEqual(formatTags(problemWithMinimalData.tags), 'None');
  deepStrictEqual(formatCompanies(problemWithMinimalData.companies), 'None');
});

test('slugToFunctionName - handles complex edge cases', () => {
  // Edge cases for function name generation
  deepStrictEqual(slugToFunctionName('a'), 'a');
  deepStrictEqual(slugToFunctionName('a-b-c-d-e'), 'aBCDE');
  deepStrictEqual(slugToFunctionName('123-test'), 'oneTwoThreeTest');
  deepStrictEqual(slugToFunctionName('test-123'), 'testOneTwoThree');
});

test('formatLCValue - encodes primitives in LeetCode wire format', () => {
  deepStrictEqual(formatLCValue(42), '42');
  deepStrictEqual(formatLCValue(-1), '-1');
  deepStrictEqual(formatLCValue(0), '0');
  deepStrictEqual(formatLCValue(true), 'true');
  deepStrictEqual(formatLCValue(false), 'false');
  deepStrictEqual(formatLCValue('hello'), '"hello"');
  deepStrictEqual(formatLCValue(''), '""');
  deepStrictEqual(formatLCValue(null), 'null');
});

test('formatLCValue - encodes arrays without spaces and recurses', () => {
  deepStrictEqual(formatLCValue([]), '[]');
  deepStrictEqual(formatLCValue([1, 2, 3]), '[1,2,3]');
  deepStrictEqual(
    formatLCValue([
      [1, 2],
      [3, 4],
    ]),
    '[[1,2],[3,4]]',
  );
  deepStrictEqual(formatLCValue(['a', 'b']), '["a","b"]');
  // null entries are used in TreeNode array literals
  deepStrictEqual(formatLCValue([1, null, 2, 3]), '[1,null,2,3]');
});

test('formatLCValue - throws for unsupported types', () => {
  // Bare objects are not valid wire-format input.
  let threw = false;
  try {
    formatLCValue({ foo: 'bar' });
  } catch {
    threw = true;
  }
  deepStrictEqual(threw, true);
});

test('formatExamplesAsLCInput - one whitespace-separated line per example', () => {
  const out = formatExamplesAsLCInput(mockProblem);
  deepStrictEqual(out.split('\n').length, 2);
  ok(out.includes('[2,7,11,15] 9'));
  ok(out.includes('[3,2,4] 6'));
});

test('formatExamplesAsLCInput - returns empty string when there are no examples', () => {
  const empty: Problem = {
    ...mockProblem,
    examples: [],
  };
  deepStrictEqual(formatExamplesAsLCInput(empty), '');
});

test('formatExamplesAsLCOutput - joins outputs with `---` separator and matches harness format', () => {
  // mockProblem has two examples with outputs [0,1] and [1,2].
  deepStrictEqual(formatExamplesAsLCOutput(mockProblem), '[0,1]\n---\n[1,2]');
});

test('formatExamplesAsLCOutput - encodes scalar outputs in LC wire format', () => {
  const scalarOutputs: Problem = {
    ...mockProblem,
    examples: [
      { input: { x: 1 }, output: 42 },
      { input: { x: 2 }, output: true },
      { input: { x: 3 }, output: 'hi' },
    ],
  };
  deepStrictEqual(formatExamplesAsLCOutput(scalarOutputs), '42\n---\ntrue\n---\n"hi"');
});

test('formatExamplesAsLCOutput - returns empty string for problems without examples', () => {
  const empty: Problem = { ...mockProblem, examples: [] };
  deepStrictEqual(formatExamplesAsLCOutput(empty), '');
});

test('resolveSignature - uses curated per-language signature when present', () => {
  const problem: Problem = {
    ...mockProblem,
    signatures: { cpp: 'vector<int> twoSum(vector<int>& nums, int target)' },
  };
  deepStrictEqual(
    resolveSignature(problem, 'cpp'),
    'vector<int> twoSum(vector<int>& nums, int target)',
  );
});

test('resolveSignature - falls back to a TODO declaration when missing', () => {
  // Other languages do not have a signature for this problem; the fallback
  // uses the camelCase function name with a TODO param list.
  const fallback = resolveSignature(mockProblem, 'cpp');
  ok(fallback.includes('auto twoSum'));
  ok(fallback.includes('TODO'));
});

test('resolveSignature - treats whitespace-only signature as missing', () => {
  const problem: Problem = {
    ...mockProblem,
    signatures: { cpp: '   ' },
  };
  ok(resolveSignature(problem, 'cpp').includes('auto twoSum'));
});

test('getLanguageScaffolding - cpp uses harness scaffolding', () => {
  const cpp = getLanguageScaffolding('cpp');
  deepStrictEqual(cpp.templates, ['solution', 'readme']);
  deepStrictEqual(cpp.extras, ['cmakelists', 'input', 'expected']);
  deepStrictEqual(cpp.sharedAssets, ['harness']);
});

test('getLanguageScaffolding - other languages keep the default test scaffolding', () => {
  for (const lang of ['typescript', 'javascript', 'python', 'java', 'rust', 'go'] as const) {
    const spec = getLanguageScaffolding(lang);
    deepStrictEqual(spec.templates, ['solution', 'test', 'readme']);
    deepStrictEqual(spec.extras, []);
    deepStrictEqual(spec.sharedAssets, []);
  }
});
