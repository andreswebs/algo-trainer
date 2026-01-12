/**
 * Tests for problem database builder and indexing
 *
 * @module tests/database
 */

import { assertEquals, assertRejects } from '@std/assert';
import { join } from '@std/path';
import { ProblemDatabase } from '../src/core/problem/database.ts';
import { ProblemError } from '../src/utils/errors.ts';
import type { RawProblemJson } from '../src/core/problem/types.ts';

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
      input: { intervals: [[1, 3], [2, 6]] },
      output: [[1, 6]],
    },
  ],
  tags: ['array', 'sorting'],
  companies: ['Google', 'Microsoft'],
};

async function createTestProblemsDirectory(
  problems: RawProblemJson[],
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'db-test-' });

  for (const problem of problems) {
    const filePath = join(tempDir, `${problem.slug}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(problem));
  }

  return tempDir;
}

Deno.test('ProblemDatabase.load - loads problems from directory', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    assertEquals(db.count(), 2);
    assertEquals(db.getLoadResult().builtIn, 2);
    assertEquals(db.getLoadResult().custom, 0);
    assertEquals(db.getLoadResult().skipped.length, 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - builds byId index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const problem1 = db.getById('1');
    const problem2 = db.getById('2');
    const missing = db.getById('999');

    assertEquals(problem1?.slug, 'two-sum');
    assertEquals(problem2?.slug, 'reverse-string');
    assertEquals(missing, null);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - builds bySlug index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const problem1 = db.getBySlug('two-sum');
    const problem2 = db.getBySlug('reverse-string');
    const missing = db.getBySlug('non-existent');

    assertEquals(problem1?.id, '1');
    assertEquals(problem2?.id, '2');
    assertEquals(missing, null);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - builds byDifficulty index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_3,
    PROBLEM_4,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const easy = db.getByDifficulty('easy');
    const medium = db.getByDifficulty('medium');
    const hard = db.getByDifficulty('hard');

    assertEquals(easy.length, 2);
    assertEquals(medium.length, 1);
    assertEquals(hard.length, 1);

    assertEquals(easy.map((p) => p.slug).sort(), ['reverse-string', 'two-sum']);
    assertEquals(medium[0].slug, 'binary-search');
    assertEquals(hard[0].slug, 'merge-intervals');
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - builds byTag index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_3,
    PROBLEM_4,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const arrayProblems = db.getByTag('array');
    const stringProblems = db.getByTag('string');
    const sortingProblems = db.getByTag('sorting');
    const nonExistent = db.getByTag('non-existent');

    assertEquals(arrayProblems.length, 3);
    assertEquals(stringProblems.length, 1);
    assertEquals(sortingProblems.length, 1);
    assertEquals(nonExistent.length, 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - builds byCompany index correctly', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_4,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const googleProblems = db.getByCompany('google');
    const amazonProblems = db.getByCompany('amazon');
    const facebookProblems = db.getByCompany('facebook');
    const nonExistent = db.getByCompany('non-existent');

    assertEquals(googleProblems.length, 2);
    assertEquals(amazonProblems.length, 1);
    assertEquals(facebookProblems.length, 1);
    assertEquals(nonExistent.length, 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - byTag is case-insensitive', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const lower = db.getByTag('array');
    const upper = db.getByTag('ARRAY');
    const mixed = db.getByTag('Array');

    assertEquals(lower.length, 1);
    assertEquals(upper.length, 1);
    assertEquals(mixed.length, 1);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - byCompany is case-insensitive', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const lower = db.getByCompany('google');
    const upper = db.getByCompany('GOOGLE');
    const mixed = db.getByCompany('Google');

    assertEquals(lower.length, 1);
    assertEquals(upper.length, 1);
    assertEquals(mixed.length, 1);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - fails on duplicate ID in built-in problems', async () => {
  const duplicate = { ...PROBLEM_2, id: '1', slug: 'duplicate-id' };
  const tempDir = await createTestProblemsDirectory([PROBLEM_1, duplicate]);

  try {
    await assertRejects(
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
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - fails on duplicate slug across directories', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'db-test-custom-' });

  try {
    const duplicateSlug = { ...PROBLEM_2, id: '99', slug: 'two-sum' };
    const customFilePath = join(customDir, 'two-sum.json');
    await Deno.writeTextFile(customFilePath, JSON.stringify(duplicateSlug));

    await assertRejects(
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
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - handles empty directory', async () => {
  const tempDir = await Deno.makeTempDir({ prefix: 'db-test-empty-' });

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    assertEquals(db.count(), 0);
    assertEquals(db.getAll().length, 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - handles non-existent directory', async () => {
  const db = await ProblemDatabase.load({
    builtInPath: '/non/existent/path',
    loadCustomProblems: false,
  });

  assertEquals(db.count(), 0);
});

Deno.test('ProblemDatabase - getAll returns copy of problems array', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const all1 = db.getAll();
    const all2 = db.getAll();

    assertEquals(all1 !== all2, true);
    assertEquals(all1.length, all2.length);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase - getAllTags returns sorted unique tags', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_3,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const tags = db.getAllTags();

    assertEquals(tags.length, 5);
    assertEquals(tags, ['array', 'binary-search', 'hash-table', 'string', 'two-pointers']);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase - getAllCompanies returns sorted unique companies', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_4,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const companies = db.getAllCompanies();

    assertEquals(companies.length, 4);
    assertEquals(companies, ['amazon', 'facebook', 'google', 'microsoft']);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase - getDifficultyDistribution returns correct counts', async () => {
  const tempDir = await createTestProblemsDirectory([
    PROBLEM_1,
    PROBLEM_2,
    PROBLEM_3,
    PROBLEM_4,
  ]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    const dist = db.getDifficultyDistribution();

    assertEquals(dist.easy, 2);
    assertEquals(dist.medium, 1);
    assertEquals(dist.hard, 1);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase - hasId returns correct values', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    assertEquals(db.hasId('1'), true);
    assertEquals(db.hasId('999'), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase - hasSlug returns correct values', async () => {
  const tempDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const db = await ProblemDatabase.load({
      builtInPath: tempDir,
      loadCustomProblems: false,
    });

    assertEquals(db.hasSlug('two-sum'), true);
    assertEquals(db.hasSlug('non-existent'), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('ProblemDatabase.load - loads from real src/data/problems', async () => {
  const db = await ProblemDatabase.load({
    builtInPath: 'src/data/problems',
    loadCustomProblems: false,
  });

  assertEquals(db.count() >= 1, true);

  const twoSum = db.getBySlug('two-sum');
  assertEquals(twoSum !== null, true);
  assertEquals(twoSum?.title, 'Two Sum');
});
