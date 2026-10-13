/**
 * Tests for problem parser
 *
 * @module tests/parser
 */

import { test } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  normalizeProblem,
  parseProblemFromFile,
  parseProblemFromJson,
} from '../src/core/problem/parser.ts';
import type { RawProblemJson } from '../src/core/problem/types.ts';
import { ProblemError } from '../src/utils/errors.ts';
import { assertRejectsWith } from './helpers/assert.ts';

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

test('parseProblemFromJson - parses valid complete problem', () => {
  const json = JSON.stringify(VALID_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  deepStrictEqual(problem.id, '1');
  deepStrictEqual(problem.slug, 'two-sum');
  deepStrictEqual(problem.title, 'Two Sum');
  deepStrictEqual(problem.difficulty, 'easy');
  deepStrictEqual(problem.examples.length, 1);
  deepStrictEqual(problem.constraints, ['2 <= nums.length <= 10^4']);
  deepStrictEqual(problem.hints, ['Use a hash map']);
  deepStrictEqual(problem.tags, ['array', 'hash-table']);
  deepStrictEqual(problem.companies, ['Amazon', 'Google']);
  deepStrictEqual(problem.leetcodeUrl, 'https://leetcode.com/problems/two-sum/');
});

test('parseProblemFromJson - parses minimal problem with array normalization', () => {
  const json = JSON.stringify(MINIMAL_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  deepStrictEqual(problem.id, '2');
  deepStrictEqual(problem.slug, 'minimal-problem');
  deepStrictEqual(problem.constraints, []);
  deepStrictEqual(problem.hints, []);
  deepStrictEqual(problem.tags, []);
  deepStrictEqual(problem.companies, undefined);
  deepStrictEqual(problem.leetcodeUrl, undefined);
  deepStrictEqual(problem.metadata, undefined);
});

test('parseProblemFromJson - converts date strings to Date objects', () => {
  const json = JSON.stringify(VALID_PROBLEM_JSON);
  const problem = parseProblemFromJson(json);

  deepStrictEqual(problem.createdAt instanceof Date, true);
  deepStrictEqual(problem.updatedAt instanceof Date, true);
  deepStrictEqual(problem.createdAt?.toISOString(), '2024-01-15T10:30:00.000Z');
  deepStrictEqual(problem.updatedAt?.toISOString(), '2024-06-20T14:45:00.000Z');
});

test('parseProblemFromJson - throws on invalid JSON', () => {
  const invalidJson = '{ not valid json }';

  try {
    parseProblemFromJson(invalidJson, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    deepStrictEqual(error instanceof ProblemError, true);
    deepStrictEqual((error as ProblemError).message, 'Invalid JSON format');
  }
});

test('parseProblemFromJson - throws on missing required fields', () => {
  const missingFields = JSON.stringify({
    id: '1',
    slug: 'test',
  });

  try {
    parseProblemFromJson(missingFields, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    deepStrictEqual(error instanceof ProblemError, true);
    deepStrictEqual((error as ProblemError).message.includes('Invalid problem data'), true);
  }
});

test('parseProblemFromJson - throws on invalid difficulty', () => {
  const invalidDifficulty = JSON.stringify({
    ...VALID_PROBLEM_JSON,
    difficulty: 'super-hard',
  });

  try {
    parseProblemFromJson(invalidDifficulty, 'test.json');
    throw new Error('Expected ProblemError to be thrown');
  } catch (error) {
    deepStrictEqual(error instanceof ProblemError, true);
    deepStrictEqual((error as ProblemError).message.includes('Invalid problem data'), true);
  }
});

test('normalizeProblem - normalizes missing arrays to empty arrays', () => {
  const problem = normalizeProblem(MINIMAL_PROBLEM_JSON);

  deepStrictEqual(Array.isArray(problem.constraints), true);
  deepStrictEqual(problem.constraints.length, 0);
  deepStrictEqual(Array.isArray(problem.hints), true);
  deepStrictEqual(problem.hints.length, 0);
  deepStrictEqual(Array.isArray(problem.tags), true);
  deepStrictEqual(problem.tags.length, 0);
});

test('normalizeProblem - preserves existing arrays', () => {
  const problem = normalizeProblem(VALID_PROBLEM_JSON);

  deepStrictEqual(problem.constraints, ['2 <= nums.length <= 10^4']);
  deepStrictEqual(problem.hints, ['Use a hash map']);
  deepStrictEqual(problem.tags, ['array', 'hash-table']);
});

test('normalizeProblem - handles invalid date strings gracefully', () => {
  const raw: RawProblemJson = {
    ...MINIMAL_PROBLEM_JSON,
    createdAt: 'not-a-date',
    metadata: {
      source: 'test',
    },
  };

  const problem = normalizeProblem(raw);

  deepStrictEqual(problem.createdAt, undefined);
  deepStrictEqual(problem.metadata?.source, 'test');
});

test('parseProblemFromFile - parses existing problem file', async () => {
  const path = join(import.meta.dir, '..', 'src', 'data', 'problems', 'two-sum.json');
  const problem = await parseProblemFromFile(path);

  deepStrictEqual(problem.id, '1');
  deepStrictEqual(problem.slug, 'two-sum');
  deepStrictEqual(problem.title, 'Two Sum');
  deepStrictEqual(problem.difficulty, 'easy');
});

test('parseProblemFromFile - throws on non-existent file', async () => {
  const path = join(import.meta.dir, '..', 'src', 'data', 'problems', 'non-existent.json');

  await assertRejectsWith(
    async () => {
      await parseProblemFromFile(path);
    },
    ProblemError,
    'Failed to read problem file',
  );
});

test('parseProblemFromFile - throws on filename-slug mismatch', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'parser-test-'));

  try {
    const wrongFilename = join(tempDir, 'wrong-name.json');
    await writeFile(wrongFilename, JSON.stringify(MINIMAL_PROBLEM_JSON));

    await assertRejectsWith(
      async () => {
        await parseProblemFromFile(wrongFilename);
      },
      ProblemError,
      'Filename must match slug',
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('parseProblemFromFile - accepts matching filename-slug', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'parser-test-'));

  try {
    const correctFilename = join(tempDir, 'minimal-problem.json');
    await writeFile(correctFilename, JSON.stringify(MINIMAL_PROBLEM_JSON));

    const problem = await parseProblemFromFile(correctFilename);
    deepStrictEqual(problem.slug, 'minimal-problem');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
