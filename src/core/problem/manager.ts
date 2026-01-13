/**
 * Problem Manager read API
 *
 * Provides a high-level API for querying problems from the database.
 * Supports filtering, searching, and random selection.
 * This is the primary interface for CLI commands to interact with problems.
 *
 * @module core/problem/manager-read
 */

import { ProblemDatabase, type ProblemDatabaseOptions } from './database.ts';
import type { Difficulty, Problem } from '../../types/global.ts';

/**
 * Criteria for filtering problems
 */
export interface ProblemQuery {
  /** Filter by difficulty level(s) */
  difficulty?: Difficulty | Difficulty[];
  /** Filter by tags (all tags must match) */
  tags?: string[];
  /** Filter by companies (any company matches) */
  companies?: string[];
  /** Search text in title, slug, or description */
  text?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Field to sort by (default: title) */
  sortBy?: 'title' | 'difficulty' | 'id' | 'slug';
  /** Sort direction (default: asc) */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a problem search/list operation
 */
export interface ProblemListResult {
  /** Matching problems */
  problems: Problem[];
  /** Total number of matches (ignoring limit/offset) */
  total: number;
}

/**
 * Problem Manager (Read-Only)
 *
 * Provides read-only access to the problem database with advanced filtering
 * and search capabilities.
 */
export class ProblemManager {
  private db: ProblemDatabase | null = null;
  private readonly options: ProblemDatabaseOptions;

  constructor(options: ProblemDatabaseOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the manager by loading the database
   */
  async init(): Promise<void> {
    if (!this.db) {
      this.db = await ProblemDatabase.load(this.options);
    }
  }

  /**
   * Get the underlying database instance
   * (Initializes if not already loaded)
   */
  protected async getDb(): Promise<ProblemDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Get a problem by its unique ID
   *
   * @param id - Problem ID
   * @returns Problem or null if not found
   */
  async getById(id: string): Promise<Problem | null> {
    const db = await this.getDb();
    return db.getById(id);
  }

  /**
   * Get a problem by its slug
   *
   * @param slug - Problem slug
   * @returns Problem or null if not found
   */
  async getBySlug(slug: string): Promise<Problem | null> {
    const db = await this.getDb();
    return db.getBySlug(slug);
  }

  /**
   * List problems matching the given query
   *
   * @param query - Filter and sort criteria
   * @returns List of matching problems and total count
   */
  async list(query: ProblemQuery = {}): Promise<ProblemListResult> {
    const db = await this.getDb();
    let problems = db.getAll();

    // 1. Filter by difficulty
    if (query.difficulty) {
      const difficulties = Array.isArray(query.difficulty)
        ? new Set(query.difficulty)
        : new Set([query.difficulty]);
      problems = problems.filter((p) => difficulties.has(p.difficulty));
    }

    // 2. Filter by tags (match ALL)
    if (query.tags && query.tags.length > 0) {
      const queryTags = query.tags.map((t) => t.toLowerCase());
      problems = problems.filter((p) => {
        const problemTags = new Set(p.tags.map((t) => t.toLowerCase()));
        return queryTags.every((qt) => problemTags.has(qt));
      });
    }

    // 3. Filter by companies (match ANY)
    if (query.companies && query.companies.length > 0) {
      const queryCompanies = new Set(query.companies.map((c) => c.toLowerCase()));
      problems = problems.filter((p) => {
        if (!p.companies || p.companies.length === 0) return false;
        return p.companies.some((c) => queryCompanies.has(c.toLowerCase()));
      });
    }

    // 4. Text search
    if (query.text) {
      const text = query.text.toLowerCase();
      problems = problems.filter((p) =>
        p.title.toLowerCase().includes(text) ||
        p.slug.toLowerCase().includes(text) ||
        p.description.toLowerCase().includes(text)
      );
    }

    const total = problems.length;

    // 5. Sorting
    const sortBy = query.sortBy || 'title';
    const sortOrder = query.sortOrder || 'asc';

    problems.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'slug':
          comparison = a.slug.localeCompare(b.slug);
          break;
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'difficulty': {
          const difficultyRank: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
          comparison = difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
          break;
        }
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 6. Pagination
    if (query.offset !== undefined || query.limit !== undefined) {
      const offset = query.offset || 0;
      const limit = query.limit || problems.length;
      problems = problems.slice(offset, offset + limit);
    }

    return { problems, total };
  }

  /**
   * Search for problems (simplified alias for list with text query)
   *
   * @param text - Search text
   * @returns Matching problems
   */
  async search(text: string): Promise<Problem[]> {
    const result = await this.list({ text });
    return result.problems;
  }

  /**
   * Get a random problem matching the query
   *
   * @param query - Filter criteria (limit/offset/sort ignored)
   * @returns Random problem or null if no matches
   */
  async getRandom(
    query: Omit<ProblemQuery, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {},
  ): Promise<Problem | null> {
    // Construct a query without pagination/sorting to ensure we get all matches
    const listQuery: ProblemQuery = {};
    if (query.difficulty) listQuery.difficulty = query.difficulty;
    if (query.tags) listQuery.tags = query.tags;
    if (query.companies) listQuery.companies = query.companies;
    if (query.text) listQuery.text = query.text;

    // Pagination and sorting are omitted from listQuery by default
    const fullResult = await this.list(listQuery);

    if (fullResult.total === 0) return null;
    const index = Math.floor(Math.random() * fullResult.total);
    return fullResult.problems[index];
  }

  /**
   * Get all available tags
   */
  async getAllTags(): Promise<string[]> {
    const db = await this.getDb();
    return db.getAllTags();
  }

  /**
   * Get all available companies
   */
  async getAllCompanies(): Promise<string[]> {
    const db = await this.getDb();
    return db.getAllCompanies();
  }

  /**
   * Get difficulty distribution stats
   */
  async getStats(): Promise<Record<Difficulty, number>> {
    const db = await this.getDb();
    return db.getDifficultyDistribution();
  }
}
