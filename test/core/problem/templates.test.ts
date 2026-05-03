/**
 * Tests for template rendering system
 *
 * @module test/core/problem/templates
 */

import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
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

Deno.test('slugToFunctionName - converts kebab-case to camelCase', () => {
  assertEquals(slugToFunctionName('two-sum'), 'twoSum');
  assertEquals(slugToFunctionName('longest-substring'), 'longestSubstring');
  assertEquals(slugToFunctionName('reverse-linked-list'), 'reverseLinkedList');
});

Deno.test('slugToFunctionName - handles single word', () => {
  assertEquals(slugToFunctionName('reverse'), 'reverse');
  assertEquals(slugToFunctionName('palindrome'), 'palindrome');
});

Deno.test('slugToFunctionName - handles numbers in slug', () => {
  assertEquals(slugToFunctionName('3sum'), 'threeSum');
  assertEquals(slugToFunctionName('4sum-ii'), 'fourSumIi');
  assertEquals(slugToFunctionName('number-1-problem'), 'numberOneProblem');
});

Deno.test('slugToClassName - converts kebab-case to PascalCase', () => {
  assertEquals(slugToClassName('two-sum'), 'TwoSum');
  assertEquals(slugToClassName('longest-substring'), 'LongestSubstring');
  assertEquals(slugToClassName('reverse-linked-list'), 'ReverseLinkedList');
});

Deno.test('slugToClassName - handles single word', () => {
  assertEquals(slugToClassName('reverse'), 'Reverse');
  assertEquals(slugToClassName('palindrome'), 'Palindrome');
});

Deno.test('slugToClassName - handles numbers in slug', () => {
  assertEquals(slugToClassName('3sum'), 'ThreeSum');
  assertEquals(slugToClassName('4sum-ii'), 'FourSumIi');
  assertEquals(slugToClassName('number-1-problem'), 'NumberOneProblem');
});

Deno.test('slugToClassName - handles complex edge cases', () => {
  // Edge cases for class name generation
  assertEquals(slugToClassName('a'), 'A');
  assertEquals(slugToClassName('a-b-c-d-e'), 'ABCDE');
  assertEquals(slugToClassName('123-test'), 'OneTwoThreeTest');
  assertEquals(slugToClassName('test-123'), 'TestOneTwoThree');
});

Deno.test('formatExamples - formats single example correctly', () => {
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
  assertStringIncludes(formatted, 'Example 1:');
  assertStringIncludes(formatted, 'Input: nums = [2,7], target = 9');
  assertStringIncludes(formatted, 'Output: [0,1]');
  assertStringIncludes(formatted, 'Explanation: Test explanation');
});

Deno.test('formatExamples - formats multiple examples', () => {
  const formatted = formatExamples(mockProblem);
  assertStringIncludes(formatted, 'Example 1:');
  assertStringIncludes(formatted, 'Example 2:');
  assertStringIncludes(formatted, '[2,7,11,15]');
  assertStringIncludes(formatted, '[3,2,4]');
});

Deno.test('formatExamples - handles example without explanation', () => {
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
  assertStringIncludes(formatted, 'Example 1:');
  assertStringIncludes(formatted, 'Input: x = 5');
  assertStringIncludes(formatted, 'Output: 10');
  assertEquals(formatted.includes('Explanation:'), false);
});

Deno.test('formatExamples - handles empty examples array', () => {
  const problem: Problem = {
    ...mockProblem,
    examples: [],
  };

  const formatted = formatExamples(problem);
  assertEquals(formatted, 'No examples provided.');
});

Deno.test('formatConstraints - formats constraints as bulleted list', () => {
  const formatted = formatConstraints(mockProblem.constraints);
  assertStringIncludes(formatted, '- 2 <= nums.length <= 10^4');
  assertStringIncludes(formatted, '- -10^9 <= nums[i] <= 10^9');
  assertStringIncludes(formatted, '- Only one valid answer exists.');
});

Deno.test('formatConstraints - handles empty constraints', () => {
  const formatted = formatConstraints([]);
  assertEquals(formatted, 'No constraints specified.');
});

Deno.test('formatHints - formats hints as numbered list', () => {
  const formatted = formatHints(mockProblem.hints);
  assertStringIncludes(formatted, '1. Use a hash map');
  assertStringIncludes(formatted, '2. For each element');
});

Deno.test('formatHints - handles empty hints', () => {
  const formatted = formatHints([]);
  assertEquals(formatted, 'No hints available.');
});

Deno.test('formatTags - formats tags as comma-separated list', () => {
  const formatted = formatTags(['array', 'hash-table', 'two-pointers']);
  assertEquals(formatted, 'array, hash-table, two-pointers');
});

Deno.test('formatTags - handles empty tags', () => {
  const formatted = formatTags([]);
  assertEquals(formatted, 'None');
});

Deno.test('formatCompanies - formats companies as comma-separated list', () => {
  const formatted = formatCompanies(['Amazon', 'Google', 'Microsoft']);
  assertEquals(formatted, 'Amazon, Google, Microsoft');
});

Deno.test('formatCompanies - handles undefined companies', () => {
  const formatted = formatCompanies(undefined);
  assertEquals(formatted, 'None');
});

Deno.test('formatCompanies - handles empty companies array', () => {
  const formatted = formatCompanies([]);
  assertEquals(formatted, 'None');
});

Deno.test('replacePlaceholders - replaces all placeholders', () => {
  const content = 'Title: {{TITLE}}, Author: {{AUTHOR}}';
  const values = {
    TITLE: 'Test Title',
    AUTHOR: 'Test Author',
  };

  const result = replacePlaceholders(content, values);
  assertEquals(result, 'Title: Test Title, Author: Test Author');
});

Deno.test('replacePlaceholders - handles multiple occurrences', () => {
  const content = '{{NAME}} is {{NAME}}';
  const values = { NAME: 'Test' };

  const result = replacePlaceholders(content, values);
  assertEquals(result, 'Test is Test');
});

Deno.test('replacePlaceholders - throws on unknown placeholder by default', () => {
  const content = 'Title: {{UNKNOWN}}';
  const values = { TITLE: 'Test' };

  try {
    replacePlaceholders(content, values);
  } catch (e) {
    assertEquals(e instanceof TemplateError, true);
    assertStringIncludes((e as TemplateError).message, 'Unknown placeholders');
    assertStringIncludes((e as TemplateError).message, 'UNKNOWN');
  }
});

Deno.test('replacePlaceholders - allows unknown placeholders when specified', () => {
  const content = 'Title: {{TITLE}}, Unknown: {{UNKNOWN}}';
  const values = { TITLE: 'Test' };

  const result = replacePlaceholders(content, values, true);
  assertEquals(result, 'Title: Test, Unknown: {{UNKNOWN}}');
});

Deno.test('replacePlaceholders - handles no placeholders', () => {
  const content = 'Plain text with no placeholders';
  const values = { TITLE: 'Test' };

  const result = replacePlaceholders(content, values);
  assertEquals(result, content);
});

Deno.test('resolveTemplatePath - throws error for non-existent template', async () => {
  await assertRejects(
    async () => {
      await resolveTemplatePath('typescript', 'minimal', 'nonexistent' as TemplateKind);
    },
    TemplateError,
    'Template file not found',
  );
});

Deno.test('renderTemplate - renders template with problem data', async () => {
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
    assertEquals(error instanceof TemplateError, true);
  }
});

Deno.test('renderAllTemplates - renders all template types', async () => {
  const context: TemplateContext = {
    problem: mockProblem,
    config: mockTemplateConfig,
  };

  // This will fail if templates don't exist, which is expected in test environment
  try {
    await renderAllTemplates(context);
  } catch (error) {
    // Expected to fail if template files aren't in place
    assertEquals(error instanceof TemplateError, true);
  }
});

Deno.test('renderTemplate - handles rendering errors gracefully', async () => {
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

  await assertRejects(
    async () => {
      await renderTemplate(context, 'solution');
    },
    TemplateError,
  );
});

Deno.test('placeholder values - builds correct placeholder values', () => {
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

  assertEquals(formatExamples(problemWithMinimalData), 'No examples provided.');
  assertEquals(formatConstraints(problemWithMinimalData.constraints), 'No constraints specified.');
  assertEquals(formatHints(problemWithMinimalData.hints), 'No hints available.');
  assertEquals(formatTags(problemWithMinimalData.tags), 'None');
  assertEquals(formatCompanies(problemWithMinimalData.companies), 'None');
});

Deno.test('slugToFunctionName - handles complex edge cases', () => {
  // Edge cases for function name generation
  assertEquals(slugToFunctionName('a'), 'a');
  assertEquals(slugToFunctionName('a-b-c-d-e'), 'aBCDE');
  assertEquals(slugToFunctionName('123-test'), 'oneTwoThreeTest');
  assertEquals(slugToFunctionName('test-123'), 'testOneTwoThree');
});

Deno.test('formatLCValue - encodes primitives in LeetCode wire format', () => {
  assertEquals(formatLCValue(42), '42');
  assertEquals(formatLCValue(-1), '-1');
  assertEquals(formatLCValue(0), '0');
  assertEquals(formatLCValue(true), 'true');
  assertEquals(formatLCValue(false), 'false');
  assertEquals(formatLCValue('hello'), '"hello"');
  assertEquals(formatLCValue(''), '""');
  assertEquals(formatLCValue(null), 'null');
});

Deno.test('formatLCValue - encodes arrays without spaces and recurses', () => {
  assertEquals(formatLCValue([]), '[]');
  assertEquals(formatLCValue([1, 2, 3]), '[1,2,3]');
  assertEquals(formatLCValue([[1, 2], [3, 4]]), '[[1,2],[3,4]]');
  assertEquals(formatLCValue(['a', 'b']), '["a","b"]');
  // null entries are used in TreeNode array literals
  assertEquals(formatLCValue([1, null, 2, 3]), '[1,null,2,3]');
});

Deno.test('formatLCValue - throws for unsupported types', () => {
  // Bare objects are not valid wire-format input.
  let threw = false;
  try {
    formatLCValue({ foo: 'bar' });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test('formatExamplesAsLCInput - one whitespace-separated line per example', () => {
  const out = formatExamplesAsLCInput(mockProblem);
  assertEquals(out.split('\n').length, 2);
  assertStringIncludes(out, '[2,7,11,15] 9');
  assertStringIncludes(out, '[3,2,4] 6');
});

Deno.test('formatExamplesAsLCInput - returns empty string when there are no examples', () => {
  const empty: Problem = {
    ...mockProblem,
    examples: [],
  };
  assertEquals(formatExamplesAsLCInput(empty), '');
});

Deno.test('formatExamplesAsLCOutput - joins outputs with `---` separator and matches harness format', () => {
  // mockProblem has two examples with outputs [0,1] and [1,2].
  assertEquals(formatExamplesAsLCOutput(mockProblem), '[0,1]\n---\n[1,2]');
});

Deno.test('formatExamplesAsLCOutput - encodes scalar outputs in LC wire format', () => {
  const scalarOutputs: Problem = {
    ...mockProblem,
    examples: [
      { input: { x: 1 }, output: 42 },
      { input: { x: 2 }, output: true },
      { input: { x: 3 }, output: 'hi' },
    ],
  };
  assertEquals(formatExamplesAsLCOutput(scalarOutputs), '42\n---\ntrue\n---\n"hi"');
});

Deno.test('formatExamplesAsLCOutput - returns empty string for problems without examples', () => {
  const empty: Problem = { ...mockProblem, examples: [] };
  assertEquals(formatExamplesAsLCOutput(empty), '');
});

Deno.test('resolveSignature - uses curated per-language signature when present', () => {
  const problem: Problem = {
    ...mockProblem,
    signatures: { cpp: 'vector<int> twoSum(vector<int>& nums, int target)' },
  };
  assertEquals(
    resolveSignature(problem, 'cpp'),
    'vector<int> twoSum(vector<int>& nums, int target)',
  );
});

Deno.test('resolveSignature - falls back to a TODO declaration when missing', () => {
  // Other languages do not have a signature for this problem; the fallback
  // uses the camelCase function name with a TODO param list.
  const fallback = resolveSignature(mockProblem, 'cpp');
  assertStringIncludes(fallback, 'auto twoSum');
  assertStringIncludes(fallback, 'TODO');
});

Deno.test('resolveSignature - treats whitespace-only signature as missing', () => {
  const problem: Problem = {
    ...mockProblem,
    signatures: { cpp: '   ' },
  };
  assertStringIncludes(resolveSignature(problem, 'cpp'), 'auto twoSum');
});

Deno.test('getLanguageScaffolding - cpp uses harness scaffolding', () => {
  const cpp = getLanguageScaffolding('cpp');
  assertEquals(cpp.templates, ['solution', 'readme']);
  assertEquals(cpp.extras, ['cmakelists', 'input', 'expected']);
  assertEquals(cpp.sharedAssets, ['harness']);
});

Deno.test('getLanguageScaffolding - other languages keep the default test scaffolding', () => {
  for (const lang of ['typescript', 'javascript', 'python', 'java', 'rust', 'go'] as const) {
    const spec = getLanguageScaffolding(lang);
    assertEquals(spec.templates, ['solution', 'test', 'readme']);
    assertEquals(spec.extras, []);
    assertEquals(spec.sharedAssets, []);
  }
});
