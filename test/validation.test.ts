/**
 * Tests for validation utilities
 *
 * @module tests/validation
 */

import { assertEquals } from '@std/assert';
import { validateISODateString, validateProblem, validateSlug } from '../src/utils/validation.ts';

// -----------------------------------------------------------------------------
// validateSlug tests
// -----------------------------------------------------------------------------

Deno.test('validateSlug - valid kebab-case slugs', () => {
  const validSlugs = [
    'two-sum',
    'add-two-numbers',
    'a',
    '3sum',
    'valid-palindrome-2',
    'a-b-c-d-e',
    'abc123',
    'test',
  ];

  for (const slug of validSlugs) {
    const result = validateSlug(slug);
    assertEquals(result.valid, true, `Expected "${slug}" to be valid`);
    assertEquals(result.errors.length, 0);
  }
});

Deno.test('validateSlug - rejects invalid slugs', () => {
  const invalidCases = [
    { slug: '', expectedError: 'cannot be empty' },
    { slug: 'Two-Sum', expectedError: 'kebab-case' },
    { slug: 'two_sum', expectedError: 'kebab-case' },
    { slug: '-two-sum', expectedError: 'kebab-case' },
    { slug: 'two-sum-', expectedError: 'kebab-case' },
    { slug: 'two--sum', expectedError: 'kebab-case' },
    { slug: 'two sum', expectedError: 'kebab-case' },
    { slug: 'TWO-SUM', expectedError: 'kebab-case' },
  ];

  for (const { slug, expectedError } of invalidCases) {
    const result = validateSlug(slug);
    assertEquals(result.valid, false, `Expected "${slug}" to be invalid`);
    assertEquals(
      result.errors.some((e) => e.includes(expectedError)),
      true,
      `Expected error containing "${expectedError}" for slug "${slug}", got: ${result.errors}`,
    );
  }
});

Deno.test('validateSlug - rejects slugs over 100 characters', () => {
  const longSlug = 'a'.repeat(101);
  const result = validateSlug(longSlug);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('100 characters')),
    true,
  );
});

Deno.test('validateSlug - rejects non-string values', () => {
  const result = validateSlug(123);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('must be a string')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateISODateString tests
// -----------------------------------------------------------------------------

Deno.test('validateISODateString - valid ISO-8601 dates', () => {
  const validDates = [
    '2024-01-15T10:30:00.000Z',
    '2024-06-20T14:45:00Z',
    '2024-01-01',
    '2024-12-31T23:59:59.999Z',
  ];

  for (const date of validDates) {
    const result = validateISODateString(date, 'testDate');
    assertEquals(result.valid, true, `Expected "${date}" to be valid`);
  }
});

Deno.test('validateISODateString - rejects invalid dates', () => {
  const invalidDates = [
    'not-a-date',
    '2024-13-01',
    '',
    'invalid',
  ];

  for (const date of invalidDates) {
    const result = validateISODateString(date, 'testDate');
    assertEquals(result.valid, false, `Expected "${date}" to be invalid`);
  }
});

Deno.test('validateISODateString - rejects non-string values', () => {
  const result = validateISODateString(12345, 'testDate');
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('must be a string')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - valid problems
// -----------------------------------------------------------------------------

Deno.test('validateProblem - accepts valid minimal problem', () => {
  const problem = {
    id: '1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Given an array of integers nums and an integer target...',
    examples: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        output: [0, 1],
      },
    ],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test('validateProblem - accepts valid complete problem', () => {
  const problem = {
    id: '1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Given an array of integers nums and an integer target...',
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
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    hints: ['Use a hash map to store seen values'],
    tags: ['array', 'hash-table'],
    companies: ['Google', 'Amazon', 'Facebook'],
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
    metadata: {
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-06-20T14:45:00.000Z',
      source: 'leetcode',
      sourceId: '1',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test('validateProblem - accepts examples with null output', () => {
  const problem = {
    id: '1',
    slug: 'test-problem',
    title: 'Test Problem',
    difficulty: 'easy',
    description: 'A test problem',
    examples: [
      {
        input: { nums: [] },
        output: null,
      },
    ],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, true);
});

// -----------------------------------------------------------------------------
// validateProblem tests - required fields
// -----------------------------------------------------------------------------

Deno.test('validateProblem - rejects missing required fields', () => {
  const result = validateProblem({});
  assertEquals(result.valid, false);

  const requiredFields = [
    'id',
    'slug',
    'title',
    'difficulty',
    'description',
    'examples',
  ];
  for (const field of requiredFields) {
    assertEquals(
      result.errors.some((e) => e.includes(`${field} is required`)),
      true,
      `Expected error for missing ${field}`,
    );
  }
});

Deno.test('validateProblem - rejects non-object value', () => {
  const result = validateProblem('not an object');
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('must be an object')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - slug validation
// -----------------------------------------------------------------------------

Deno.test('validateProblem - rejects invalid slug format', () => {
  const baseProblem = {
    id: '1',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Description',
    examples: [{ input: { a: 1 }, output: 1 }],
  };

  const invalidSlugs = ['Two_Sum', 'two--sum', '-start', 'end-', 'CAPS'];
  for (const slug of invalidSlugs) {
    const result = validateProblem({ ...baseProblem, slug });
    assertEquals(result.valid, false, `Expected slug "${slug}" to be invalid`);
    assertEquals(
      result.errors.some((e) => e.includes('kebab-case')),
      true,
    );
  }
});

// -----------------------------------------------------------------------------
// validateProblem tests - examples validation
// -----------------------------------------------------------------------------

Deno.test('validateProblem - rejects empty examples array', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('at least 1 item')),
    true,
  );
});

Deno.test('validateProblem - rejects examples without input object', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [
      { output: 1 },
    ],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('input is required')),
    true,
  );
});

Deno.test('validateProblem - rejects examples with non-object input', () => {
  const baseProblem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
  };

  const invalidInputs = [
    [1, 2, 3],
    null,
    'string',
    42,
  ];

  for (const input of invalidInputs) {
    const problem = {
      ...baseProblem,
      examples: [{ input, output: 1 }],
    };
    const result = validateProblem(problem);
    assertEquals(result.valid, false, `Expected input ${JSON.stringify(input)} to be invalid`);
    assertEquals(
      result.errors.some((e) => e.includes('must be an object with named parameters')),
      true,
    );
  }
});

Deno.test('validateProblem - rejects examples without output', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [
      { input: { a: 1 } },
    ],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('output is required')),
    true,
  );
});

Deno.test('validateProblem - rejects empty explanation string', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [
      { input: { a: 1 }, output: 1, explanation: '' },
    ],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('explanation') && e.includes('empty')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - string array fields
// -----------------------------------------------------------------------------

Deno.test('validateProblem - rejects non-array tags', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    tags: 'not-an-array',
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('tags must be an array')),
    true,
  );
});

Deno.test('validateProblem - rejects empty strings in tags', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    tags: ['valid', '', 'another'],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('tags[1]') && e.includes('empty')),
    true,
  );
});

Deno.test('validateProblem - rejects non-string values in companies', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    companies: ['Google', 123, 'Amazon'],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('companies[1]') && e.includes('string')),
    true,
  );
});

Deno.test('validateProblem - rejects empty strings in constraints', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    constraints: ['1 <= n <= 100', ''],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('constraints[1]') && e.includes('empty')),
    true,
  );
});

Deno.test('validateProblem - rejects empty strings in hints', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    hints: ['First hint', ''],
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('hints[1]') && e.includes('empty')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - leetcodeUrl validation
// -----------------------------------------------------------------------------

Deno.test('validateProblem - accepts valid leetcodeUrl', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, true);
});

Deno.test('validateProblem - rejects invalid leetcodeUrl', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    leetcodeUrl: 'not-a-valid-url',
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('leetcodeUrl') && e.includes('valid URL')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - metadata validation
// -----------------------------------------------------------------------------

Deno.test('validateProblem - accepts valid metadata', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    metadata: {
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-06-20T14:45:00.000Z',
      source: 'leetcode',
      sourceId: '1',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, true);
});

Deno.test('validateProblem - rejects invalid createdAt date', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    metadata: {
      createdAt: 'invalid-date',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('createdAt') && e.includes('ISO-8601')),
    true,
  );
});

Deno.test('validateProblem - rejects invalid updatedAt date', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    metadata: {
      updatedAt: 'not-a-date',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('updatedAt') && e.includes('ISO-8601')),
    true,
  );
});

Deno.test('validateProblem - rejects empty source string', () => {
  const problem = {
    id: '1',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Desc',
    examples: [{ input: { a: 1 }, output: 1 }],
    metadata: {
      source: '',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes('source') && e.includes('empty')),
    true,
  );
});

// -----------------------------------------------------------------------------
// validateProblem tests - error aggregation
// -----------------------------------------------------------------------------

Deno.test('validateProblem - aggregates multiple errors', () => {
  const problem = {
    id: '',
    slug: 'Invalid_Slug',
    title: '',
    difficulty: 'super-hard',
    description: '',
    examples: [],
    tags: ['valid', ''],
    leetcodeUrl: 'not-a-url',
    metadata: {
      createdAt: 'invalid-date',
    },
  };

  const result = validateProblem(problem);
  assertEquals(result.valid, false);
  assertEquals(result.errors.length >= 5, true, 'Should have multiple errors');
});
