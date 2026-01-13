import { assertEquals } from '@std/assert';
import { ProblemManager } from '../src/core/problem/manager.ts';
import type { Problem } from '../src/types/global.ts';

// Mock problem data
const MOCK_PROBLEMS: Problem[] = [
  {
    id: '1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Find two numbers that add up to target',
    tags: ['array', 'hash-table'],
    companies: ['google', 'amazon'],
    examples: [],
    constraints: [],
    hints: [],
  },
  {
    id: '2',
    slug: 'add-two-numbers',
    title: 'Add Two Numbers',
    difficulty: 'medium',
    description: 'Add two numbers represented by linked lists',
    tags: ['linked-list', 'math'],
    companies: ['amazon', 'microsoft'],
    examples: [],
    constraints: [],
    hints: [],
  },
  {
    id: '3',
    slug: 'hard-problem',
    title: 'Hard Problem',
    difficulty: 'hard',
    description: 'A very hard problem',
    tags: ['dp', 'graph'],
    companies: ['google'],
    examples: [],
    constraints: [],
    hints: [],
  },
];

// Mock database
class MockProblemDatabase {
  getAll() {
    return [...MOCK_PROBLEMS];
  }
  getById(id: string) {
    return MOCK_PROBLEMS.find((p) => p.id === id) || null;
  }
  getBySlug(slug: string) {
    return MOCK_PROBLEMS.find((p) => p.slug === slug) || null;
  }
  getAllTags() {
    return ['array', 'hash-table', 'linked-list', 'math', 'dp', 'graph'];
  }
  getAllCompanies() {
    return ['google', 'amazon', 'microsoft'];
  }
  getDifficultyDistribution() {
    return { easy: 1, medium: 1, hard: 1 };
  }
}

// We need to mock ProblemDatabase.load
// Since we can't easily mock static methods in ESM without a library like sinon/testdouble
// or dependency injection, we'll create a subclass of ProblemManager that overrides getDb
class TestProblemManager extends ProblemManager {
  // @ts-ignore: overriding private method for testing
  // deno-lint-ignore no-explicit-any
  protected getDb(): Promise<any> {
    return Promise.resolve(new MockProblemDatabase());
  }
}

Deno.test('ProblemManager - getById', async () => {
  const manager = new TestProblemManager();
  const problem = await manager.getById('1');
  assertEquals(problem?.title, 'Two Sum');

  const notFound = await manager.getById('999');
  assertEquals(notFound, null);
});

Deno.test('ProblemManager - getBySlug', async () => {
  const manager = new TestProblemManager();
  const problem = await manager.getBySlug('two-sum');
  assertEquals(problem?.title, 'Two Sum');

  const notFound = await manager.getBySlug('unknown');
  assertEquals(notFound, null);
});

Deno.test('ProblemManager - list filtering', async () => {
  const manager = new TestProblemManager();

  // Filter by difficulty
  const easy = await manager.list({ difficulty: 'easy' });
  assertEquals(easy.total, 1);
  assertEquals(easy.problems[0].slug, 'two-sum');

  // Filter by tags (AND logic)
  const arrayProblems = await manager.list({ tags: ['array'] });
  assertEquals(arrayProblems.total, 1);
  assertEquals(arrayProblems.problems[0].slug, 'two-sum');

  // Filter by companies (OR logic)
  const amazonOrMicrosoft = await manager.list({ companies: ['amazon', 'microsoft'] });
  // amazon matches 1 & 2, microsoft matches 2. unique are 1 & 2.
  assertEquals(amazonOrMicrosoft.total, 2);

  // Text search
  const sumSearch = await manager.list({ text: 'Sum' });
  assertEquals(sumSearch.total, 1); // "Two Sum" matches
});

Deno.test('ProblemManager - list sorting', async () => {
  const manager = new TestProblemManager();

  const sorted = await manager.list({ sortBy: 'difficulty', sortOrder: 'asc' });
  // easy -> medium -> hard
  assertEquals(sorted.problems[0].difficulty, 'easy');
  assertEquals(sorted.problems[1].difficulty, 'medium');
  assertEquals(sorted.problems[2].difficulty, 'hard');

  const sortedDesc = await manager.list({ sortBy: 'difficulty', sortOrder: 'desc' });
  assertEquals(sortedDesc.problems[0].difficulty, 'hard');
});

Deno.test('ProblemManager - pagination', async () => {
  const manager = new TestProblemManager();

  const page1 = await manager.list({ limit: 2, offset: 0 });
  assertEquals(page1.problems.length, 2);

  const page2 = await manager.list({ limit: 2, offset: 2 });
  assertEquals(page2.problems.length, 1);
});

Deno.test('ProblemManager - getRandom', async () => {
  const manager = new TestProblemManager();

  const random = await manager.getRandom({ difficulty: 'easy' });
  assertEquals(random?.slug, 'two-sum');

  const noMatch = await manager.getRandom({ tags: ['non-existent'] });
  assertEquals(noMatch, null);
});
