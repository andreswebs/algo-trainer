/**
 * Tests for ProblemManager
 *
 * @module tests/manager
 */

import { assertEquals, assertRejects } from '@std/assert';
import { join } from '@std/path';
import { ProblemManager } from '../src/core/problem/manager.ts';
import { ProblemError } from '../src/utils/errors.ts';
import type { RawProblemJson } from '../src/core/problem/types.ts';
import { normalizeProblem } from '../src/core/problem/parser.ts';
import { pathExists } from '../src/utils/fs.ts';
import type { Problem } from '../src/types/global.ts';

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
  slug: 'hard-problem',
  title: 'Hard Problem',
  difficulty: 'hard',
  description: 'A very hard problem',
  tags: ['dp', 'graph'],
  companies: ['Google'],
  examples: [
    {
      input: { n: 5 },
      output: 120,
    },
  ],
  constraints: [],
  hints: [],
};

// Helper to create test directories
async function createTestProblemsDirectory(
  problems: RawProblemJson[],
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'manager-test-builtin-' });

  for (const problem of problems) {
    const filePath = join(tempDir, `${problem.slug}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(problem));
  }

  return tempDir;
}

Deno.test('ProblemManager.init - loads database', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });

    await manager.init();

    assertEquals(manager.getById('1')?.slug, 'two-sum');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.getById', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const problem = manager.getById('1');
    assertEquals(problem?.title, 'Two Sum');

    const notFound = manager.getById('999');
    assertEquals(notFound, null);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.getBySlug', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const problem = manager.getBySlug('two-sum');
    assertEquals(problem?.title, 'Two Sum');

    const notFound = manager.getBySlug('unknown');
    assertEquals(notFound, null);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.list - filters by difficulty', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const result = manager.list({ difficulty: 'easy' });
    assertEquals(result.total, 2);

    const result2 = manager.list({ difficulty: 'hard' });
    assertEquals(result2.total, 1);
    assertEquals(result2.problems[0].slug, 'hard-problem');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.list - filters by tags (any)', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const result = manager.list({ tags: ['array'] });
    assertEquals(result.total, 1);
    assertEquals(result.problems[0].slug, 'two-sum');

    // Test with tagMatchMode 'all'
    const resultAll = manager.list({
      tags: ['array', 'hash-table'],
      tagMatchMode: 'all',
    });
    assertEquals(resultAll.total, 1);
    assertEquals(resultAll.problems[0].slug, 'two-sum');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.list - filters by companies', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const result = manager.list({ companies: ['Google'] });
    // Should match PROBLEM_1 and PROBLEM_3 which both have Google
    assertEquals(result.total, 2);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.search - filters by text', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const result = manager.search('reverse');
    assertEquals(result.length, 1);
    assertEquals(result[0].slug, 'reverse-string');

    const result2 = manager.search('Sum');
    assertEquals(result2.length, 1);
    assertEquals(result2[0].slug, 'two-sum');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.list - sorting', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const sorted = manager.list({
      sort: { field: 'difficulty', direction: 'asc' },
    });
    // easy -> easy -> hard
    assertEquals(sorted.problems[0].difficulty, 'easy');
    assertEquals(sorted.problems[1].difficulty, 'easy');
    assertEquals(sorted.problems[2].difficulty, 'hard');

    const sortedDesc = manager.list({
      sort: { field: 'difficulty', direction: 'desc' },
    });
    assertEquals(sortedDesc.problems[0].difficulty, 'hard');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.list - pagination', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1, PROBLEM_2, PROBLEM_3]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const page1 = manager.list({ limit: 2, offset: 0 });
    assertEquals(page1.problems.length, 2);
    assertEquals(page1.hasMore, true);

    const page2 = manager.list({ limit: 2, offset: 2 });
    assertEquals(page2.problems.length, 1);
    assertEquals(page2.hasMore, false);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.getRandom', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      loadCustomProblems: false,
    });
    await manager.init();

    const random = manager.getRandom({ difficulty: 'easy' });
    assertEquals(random?.slug, 'two-sum');

    const noMatch = manager.getRandom({ tags: ['non-existent'] });
    assertEquals(noMatch, null);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
  }
});

Deno.test('ProblemManager.add - adds custom problem', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });
    await manager.init();

    const newProblem = {
      ...PROBLEM_2,
      id: 'custom-1', // Ensure unique ID
    };

    await manager.add(normalizeProblem(newProblem));

    // Verify it's in the manager
    const retrieved = manager.getById('custom-1');
    assertEquals(retrieved?.slug, 'reverse-string');

    // Verify file exists
    const filePath = join(customDir, 'reverse-string.json');
    assertEquals(await pathExists(filePath), true);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.add - prevents duplicates', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });
    await manager.init();

    await assertRejects(
      async () => {
        await manager.add(normalizeProblem(PROBLEM_1)); // Same ID as built-in
      },
      ProblemError,
      'Problem with ID',
    );
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.update - updates custom problem', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });

    // Add initial custom problem
    const original = { ...PROBLEM_2, id: 'custom-1' };
    const filePath = join(customDir, `${original.slug}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(original));

    await manager.init();

    // Update it
    await manager.update('custom-1', {
      title: 'Updated Title',
      difficulty: 'hard',
    });

    const updated = manager.getById('custom-1');
    assertEquals(updated?.title, 'Updated Title');
    assertEquals(updated?.difficulty, 'hard');

    // Verify file content
    const fileContent = JSON.parse(await Deno.readTextFile(filePath));
    assertEquals(fileContent.title, 'Updated Title');
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.update - prevents updating built-in problems', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });
    await manager.init();

    await assertRejects(
      async () => {
        await manager.update('1', { title: 'New Title' });
      },
      ProblemError,
      'Cannot update built-in problem',
    );
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.update - handles slug change', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });

    const original = { ...PROBLEM_2, id: 'custom-1' };
    const oldPath = join(customDir, `${original.slug}.json`);
    await Deno.writeTextFile(oldPath, JSON.stringify(original));

    await manager.init();

    // Update slug
    await manager.update('custom-1', {
      slug: 'new-slug',
    });

    // Check memory
    const updated = manager.getById('custom-1');
    assertEquals(updated?.slug, 'new-slug');

    // Check files
    const newPath = join(customDir, 'new-slug.json');
    assertEquals(await pathExists(newPath), true);
    assertEquals(await pathExists(oldPath), false);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.remove - removes custom problem', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });

    const original = { ...PROBLEM_2, id: 'custom-1' };
    const filePath = join(customDir, `${original.slug}.json`);
    await Deno.writeTextFile(filePath, JSON.stringify(original));

    await manager.init();

    await manager.remove('custom-1');

    assertEquals(manager.getById('custom-1'), null);
    assertEquals(await pathExists(filePath), false);
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});

Deno.test('ProblemManager.remove - prevents removing built-in problems', async () => {
  const builtInDir = await createTestProblemsDirectory([PROBLEM_1]);
  const customDir = await Deno.makeTempDir({ prefix: 'manager-test-custom-' });

  try {
    const manager = new ProblemManager({
      builtInPath: builtInDir,
      customPath: customDir,
      loadCustomProblems: true,
    });
    await manager.init();

    await assertRejects(
      async () => {
        await manager.remove('1');
      },
      ProblemError,
      'Cannot remove built-in problem',
    );
  } finally {
    await Deno.remove(builtInDir, { recursive: true });
    await Deno.remove(customDir, { recursive: true });
  }
});
