/**
 * Tests for problem database builder and indexing
 *
 * @module tests/database
 */

import { test } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProblemDatabase } from '../src/core/problem/database.ts';
import type { RawProblemJson } from '../src/core/problem/types.ts';
import { ProblemError } from '../src/utils/errors.ts';
import { assertRejectsWith } from './helpers/assert.ts';

const PROBLEM_1: RawProblemJson = {
  id: '1',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'easy',
  description: 'Find two numbers that add up to target.',
  examples: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      output: [0, 1],
    },
  ],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google'],
};

const PROBLEM_2: RawProblemJson = {
  id: '2',
  slug: 'reverse-string',
  title: 'Reverse String',
  difficulty: 'easy',
  description: 'Reverse a string.',
  examples: [
    {
      input: { s: 'hello' },
      output: 'olleh',
    },
  ],
  tags: ['string', 'two-pointers'],
  companies: ['Facebook'],
};

const PROBLEM_3: RawProblemJson = {
  id: '3',
  slug: 'binary-search',
  title: 'Binary Search',
  difficulty: 'medium',
  description: 'Implement binary search.',
  examples: [
    {
      input: { nums: [1, 2, 3, 4, 5], target: 3 },
      output: 2,
    },
  ],
  tags: ['array', 'binary-search'],
};

const PROBLEM_4: RawProblemJson = {
  id: '4',
  slug: 'merge-intervals',
  title: 'Merge Intervals',
  difficulty: 'hard',
  description: 'Merge overlapping intervals.',
  examples: [
    {
      input: {
        intervals: [
          [1, 3],
          [2, 6],
        ],
      },
      output: [[1, 6]],
    },
  ],
  tags: ['array', 'sorting'],
  companies: ['Google', 'Microsoft'],
};

async function createTestProblemsDirectory(problems: RawProblemJson[]): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'db-test-'));

  for (const problem of problems) {
    const filePath = join(tempDir, `${problem.slug}.json`);
    await writeFile(filePath, JSON.stringify(problem));
  }

  return tempDir;
}

test('ProblemDatabase.load - loads problems from directory', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    deepStrictEqual(db.getAll().length, 2);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - builds byId index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const problem1 = db.getById('1');
    const problem2 = db.getById('2');
    const missing = db.getById('999');

    deepStrictEqual(problem1?.slug, 'two-sum');
    deepStrictEqual(problem2?.slug, 'reverse-string');
    deepStrictEqual(missing, null);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - builds bySlug index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const problem1 = db.getBySlug('two-sum');
    const problem2 = db.getBySlug('reverse-string');
    const missing = db.getBySlug('non-existent');

    deepStrictEqual(problem1?.id, '1');
    deepStrictEqual(problem2?.id, '2');
    deepStrictEqual(missing, null);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - builds byDifficulty index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3, PROBLEM_4]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const easy = db.getByDifficulty('easy');
    const medium = db.getByDifficulty('medium');
    const hard = db.getByDifficulty('hard');

    deepStrictEqual(easy.length, 2);
    deepStrictEqual(medium.length, 1);
    deepStrictEqual(hard.length, 1);

    deepStrictEqual(easy.map((p) => p.slug).sort(), ['reverse-string', 'two-sum']);
    deepStrictEqual(medium[0].slug, 'binary-search');
    deepStrictEqual(hard[0].slug, 'merge-intervals');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - builds byTag index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3, PROBLEM_4]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const arrayProblems = db.getByTag('array');
    const stringProblems = db.getByTag('string');
    const sortingProblems = db.getByTag('sorting');
    const nonExistent = db.getByTag('non-existent');

    deepStrictEqual(arrayProblems.length, 3);
    deepStrictEqual(stringProblems.length, 1);
    deepStrictEqual(sortingProblems.length, 1);
    deepStrictEqual(nonExistent.length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - builds byCompany index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_4]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const googleProblems = db.getByCompany('google');
    const amazonProblems = db.getByCompany('amazon');
    const facebookProblems = db.getByCompany('facebook');
    const nonExistent = db.getByCompany('non-existent');

    deepStrictEqual(googleProblems.length, 2);
    deepStrictEqual(amazonProblems.length, 1);
    deepStrictEqual(facebookProblems.length, 1);
    deepStrictEqual(nonExistent.length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - byTag is case-insensitive', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const lower = db.getByTag('array');
    const upper = db.getByTag('ARRAY');
    const mixed = db.getByTag('Array');

    deepStrictEqual(lower.length, 1);
    deepStrictEqual(upper.length, 1);
    deepStrictEqual(mixed.length, 1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - byCompany is case-insensitive', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const lower = db.getByCompany('google');
    const upper = db.getByCompany('GOOGLE');
    const mixed = db.getByCompany('Google');

    deepStrictEqual(lower.length, 1);
    deepStrictEqual(upper.length, 1);
    deepStrictEqual(mixed.length, 1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - fails on duplicate ID in built-in problems', async () => {
  const duplicate = { ...PROBLEM_2, id: '1', slug: 'duplicate-id' };
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, duplicate]);

  try {
    await assertRejectsWith(
      async () => {
        await ProblemDatabase.load({
          builtInPath: tempDir,
          loadCustomProblems: false,
        });
      },
      ProblemError,
      'Duplicate problem ID',
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - fails on duplicate slug across directories', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await mkdtemp(join(tmpdir(), 'db-test-custom-'));

  try {
    const duplicateSlug = { ...PROBLEM_2, id: '99', slug: 'two-sum' };
    const customFilePath = join(customDir, 'two-sum.json');
    await writeFile(customFilePath, JSON.stringify(duplicateSlug));

    await assertRejectsWith(
      async () => {
        await ProblemDatabase.load({
          builtInPath: builtInDir,
          loadCustomProblems: true,
          customPath: customDir,
          customProblemErrorBehavior: 'fail',
        });
      },
      ProblemError,
      'Failed to load custom problem',
    );
  } finally {
    await rm(builtInDir, { recursive: true, force: true });
    await rm(customDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - handles empty directory', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'db-test-empty-'));

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    deepStrictEqual(db.getAll().length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - handles non-existent directory', async () => {
  const db = await ProblemDatabase.load({
    builtInPath: '/non/existent/path',
    loadCustomProblems: false,
  });

  deepStrictEqual(db.getAll().length, 0);
});

test('ProblemDatabase - getAll returns copy of problems array', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const all1 = db.getAll();
    const all2 = db.getAll();

    deepStrictEqual(all1 !== all2, true);
    deepStrictEqual(all1.length, all2.length);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase - getAllTags returns sorted unique tags', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const tags = db.getAllTags();

    deepStrictEqual(tags.length, 5);
    deepStrictEqual(tags, ['array', 'binary-search', 'hash-table', 'string', 'two-pointers']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase - getAllCompanies returns sorted unique companies', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_4]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const companies = db.getAllCompanies();

    deepStrictEqual(companies.length, 4);
    deepStrictEqual(companies, ['amazon', 'facebook', 'google', 'microsoft']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase - getDifficultyDistribution returns correct counts', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3, PROBLEM_4]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const dist = db.getDifficultyDistribution();

    deepStrictEqual(dist.easy, 2);
    deepStrictEqual(dist.medium, 1);
    deepStrictEqual(dist.hard, 1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase - hasId returns correct values', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    deepStrictEqual(db.hasId('1'), true);
    deepStrictEqual(db.hasId('999'), false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase - hasSlug returns correct values', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    deepStrictEqual(db.hasSlug('two-sum'), true);
    deepStrictEqual(db.hasSlug('non-existent'), false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('ProblemDatabase.load - loads from real src/data/problems', async () => {
  const db = await ProblemDatabase.load({
    builtInPath: 'src/data/problems',
    loadCustomProblems: false,
  });

  deepStrictEqual(db.getAll().length >= 1, true);

  const twoSum = db.getBySlug('two-sum');
  deepStrictEqual(twoSum !== null, true);
  deepStrictEqual(twoSum?.title, 'Two Sum');
});
