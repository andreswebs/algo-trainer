/**
 * Tests for problem parser
 *
 * @module tests/parser
 */

import { assertEquals, assertRejects } from '@std/assert';
import { join } from '@std/path';
import {
  normalizeProblem,
  parseProblemFromFile,
  parseProblemFromJson,
} from '../src/core/problem/parser.ts';
import type { RawProblemJson } from '../src/core/problem/types.ts';
import { ProblemError } from '../src/utils/errors.ts';

const VALID_PROBLEM_JSON: RawProblemJson = {
  id: '1',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'easy',
  description: 'Find two numbers that add up to target.',
  examples: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      output: [0, 1],
      explanation: 'Because nums[0] + nums[1] == 9',
    },
  ],
  constraints: ['2 <= nums.length <= 10^4'],
  hints: ['Use a hash map'],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-06-20T14:45:00.000Z',
  metadata: {
    source: 'leetcode',
    sourceId: '1',
  },
};

const MINIMAL_PROBLEM_JSON: RawProblemJson = {
  id: '2',
  slug: 'minimal-problem',
  title: 'Minimal Problem',
  difficulty: 'medium',
  description: 'A minimal problem with only required fields.',
  examples: [
    {
      input: { x: 1 },
      output: 2,
    },
  ],
};

Deno.test('parseProblemFromJson - parses valid complete problem', () => {
  const json = JSON.stringify(VALID_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  assertEquals(problem.id, '1');
  assertEquals(problem.slug, 'two-sum');
  assertEquals(problem.title, 'Two Sum');
  assertEquals(problem.difficulty, 'easy');
  assertEquals(problem.examples.length, 1);
  assertEquals(problem.constraints, ['2 <= nums.length <= 10^4']);
  assertEquals(problem.hints, ['Use a hash map']);
  assertEquals(problem.tags, ['array', 'hash-table']);
  assertEquals(problem.companies, ['Amazon', 'Google']);
  assertEquals(problem.leetcodeUrl, 'https://leetcode.com/problems/two-sum/');
});

Deno.test('parseProblemFromJson - parses minimal problem with array normalization', () => {
  const json = JSON.stringify(MINIMAL_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  assertEquals(problem.id, '2');
  assertEquals(problem.slug, 'minimal-problem');
  assertEquals(problem.constraints, []);
  assertEquals(problem.hints, []);
  assertEquals(problem.tags, []);
  assertEquals(problem.companies, undefined);
  assertEquals(problem.leetcodeUrl, undefined);
  assertEquals(problem.metadata, undefined);
});

Deno.test('parseProblemFromJson - converts date strings to Date objects', () => {
  const json = JSON.stringify(VALID_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  assertEquals(problem.createdAt instanceof Date, true);
  assertEquals(problem.updatedAt instanceof Date, true);
  assertEquals(
    problem.createdAt?.toISOString(),
    '2024-01-15T10:30:00.000Z',
  );
  assertEquals(
    problem.updatedAt?.toISOString(),
    '2024-06-20T14:45:00.000Z',
  );
});

Deno.test('parseProblemFromJson - throws on invalid JSON', () => {
  const invalidJson = '{ not valid json }';

  try {
    parseProblemFromJson(invalidJson, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    assertEquals(error instanceof ProblemError, true);
    assertEquals((error as ProblemError).message, 'Invalid JSON format');
  }
});

Deno.test('parseProblemFromJson - throws on missing required fields', () => {
  const missingFields = JSON.stringify({
    id: '1',
    slug: 'test',
  });

  try {
    parseProblemFromJson(missingFields, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    assertEquals(error instanceof ProblemError, true);
    assertEquals(
      (error as ProblemError).message.includes('Invalid problem data'),
      true,
    );
  }
});

Deno.test('parseProblemFromJson - throws on invalid difficulty', () => {
  const invalidDifficulty = JSON.stringify({
    ...VALID_PROBLEM_JSON,
    difficulty: 'super-hard',
  });

  try {
    parseProblemFromJson(invalidDifficulty, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    assertEquals(error instanceof ProblemError, true);
    assertEquals(
      (error as ProblemError).message.includes('Invalid problem data'),
      true,
    );
  }
});

Deno.test('normalizeProblem - normalizes missing arrays to empty arrays', () => {
  const problem = normalizeProblem(MINIMAL_PROBLEM_JSON);

  assertEquals(Array.isArray(problem.constraints), true);
  assertEquals(problem.constraints.length, 0);
  assertEquals(Array.isArray(problem.hints), true);
  assertEquals(problem.hints.length, 0);
  assertEquals(Array.isArray(problem.tags), true);
  assertEquals(problem.tags.length, 0);
});

Deno.test('normalizeProblem - preserves existing arrays', () => {
  const problem = normalizeProblem(VALID_PROBLEM_JSON);

  assertEquals(problem.constraints, ['2 <= nums.length <= 10^4']);
  assertEquals(problem.hints, ['Use a hash map']);
  assertEquals(problem.tags, ['array', 'hash-table']);
});

Deno.test('normalizeProblem - handles invalid date strings gracefully', () => {
  const raw: RawProblemJson = {
    ...MINIMAL_PROBLEM_JSON,
    createdAt: 'not-a-date',
    metadata: {
      source: 'test',
    },
  };

  const problem = normalizeProblem(raw);

  assertEquals(problem.createdAt, undefined);
  assertEquals(problem.metadata?.source, 'test');
});

Deno.test('parseProblemFromFile - parses existing problem file', async () => {
  const path = join(Deno.cwd(), 'src/data/problems/two-sum.json');
  const problem = await parseProblemFromFile(path);

  assertEquals(problem.id, '1');
  assertEquals(problem.slug, 'two-sum');
  assertEquals(problem.title, 'Two Sum');
  assertEquals(problem.difficulty, 'easy');
});

Deno.test('parseProblemFromFile - throws on non-existent file', async () => {
  const path = join(Deno.cwd(), 'src/data/problems/non-existent.json');

  await assertRejects(
    async () => {
      await parseProblemFromFile(path);
    },
    ProblemError,
    'Failed to read problem file',
  );
});

Deno.test('parseProblemFromFile - throws on filename-slug mismatch', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'parser-test-' });

  try {
    const wrongFilename = join(tempDir, 'wrong-name.json');
    await Deno.writeTextFile(
      wrongFilename,
      JSON.stringify(MINIMAL_PROBLEM_JSON),
    );

    await assertRejects(
      async () => {
        await parseProblemFromFile(wrongFilename);
      },
      ProblemError,
      'Filename must match slug',
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('parseProblemFromFile - accepts matching filename-slug', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'parser-test-' });

  try {
    const correctFilename = join(tempDir, 'minimal-problem.json');
    await Deno.writeTextFile(
      correctFilename,
      JSON.stringify(MINIMAL_PROBLEM_JSON),
    );

    const problem = await parseProblemFromFile(correctFilename);
    assertEquals(problem.slug, 'minimal-problem');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
