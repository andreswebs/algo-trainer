/**
 * Problem Manager
 *
 * Central entry point for problem management operations.
 * Handles reading, searching, and managing problems (both built-in and custom).
 * Provides both read-only operations (querying, filtering, searching) and
 * write operations (adding, updating, removing custom problems).
 *
 * @module core/problem/manager
 */

import { join } from '@std/path';
import type {
  Difficulty,
  Problem,
  ProblemQuery,
  ProblemQueryResult,
  ProblemSortConfig,
} from '../../types/global.ts';
import { getCustomProblemsPath, ProblemDatabase, type ProblemDatabaseOptions } from './database.ts';
import { createErrorContext, ProblemError } from '../../utils/errors.ts';
import { pathExists, remove as removeFile, writeTextFile } from '../../utils/fs.ts';
import { validateProblem } from '../../utils/validation.ts';

/**
 * Problem Manager class
 */
export class ProblemManager {
  private db: ProblemDatabase | null = null;
  private options: ProblemDatabaseOptions;

  constructor(options: ProblemDatabaseOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the manager by loading the database
   */
  async init(): Promise<void> {
    this.db = await ProblemDatabase.load(this.options);
  }

  /**
   * Ensure the database is initialized
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new ProblemError(
        'ProblemManager not initialized',
        createErrorContext('ProblemManager', { reason: 'not_initialized' }),
      );
    }
  }

  /**
   * Get the underlying database instance (for direct access if needed)
   * Ensures the database is initialized first
   */
  async getDatabase(): Promise<ProblemDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Get the underlying database instance (sync version)
   * Throws if not initialized - use init() first
   */
  getDatabaseSync(): ProblemDatabase {
    this.ensureInitialized();
    return this.db!;
  }

  /**
   * Get a problem by ID
   */
  getById(id: string): Problem | null {
    this.ensureInitialized();
    return this.db!.getById(id);
  }

  /**
   * Get a problem by slug
   */
  getBySlug(slug: string): Problem | null {
    this.ensureInitialized();
    return this.db!.getBySlug(slug);
  }

  /**
   * List problems matching a query
   */
  list(query: ProblemQuery = {}): ProblemQueryResult {
    this.ensureInitialized();
    let problems = this.db!.getAll();

    // 1. Filter by difficulty
    if (query.difficulty) {
      const difficulties = Array.isArray(query.difficulty) ? query.difficulty : [query.difficulty];

      if (difficulties.length > 0) {
        problems = problems.filter((p) => difficulties.includes(p.difficulty));
      }
    }

    // 2. Filter by tags
    if (query.tags && query.tags.length > 0) {
      const searchTags = query.tags.map((t) => t.toLowerCase());
      const mode = query.tagMatchMode || 'any';

      problems = problems.filter((p) => {
        const problemTags = p.tags.map((t) => t.toLowerCase());
        if (mode === 'all') {
          return searchTags.every((t) => problemTags.includes(t));
        } else {
          return searchTags.some((t) => problemTags.includes(t));
        }
      });
    }

    // 3. Filter by companies
    if (query.companies && query.companies.length > 0) {
      const searchCompanies = query.companies.map((c) => c.toLowerCase());
      const mode = query.companyMatchMode || 'any';

      problems = problems.filter((p) => {
        if (!p.companies) return false;
        const problemCompanies = p.companies.map((c) => c.toLowerCase());
        if (mode === 'all') {
          return searchCompanies.every((c) => problemCompanies.includes(c));
        } else {
          return searchCompanies.some((c) => problemCompanies.includes(c));
        }
      });
    }

    // 4. Filter by text (search)
    if (query.text) {
      const searchText = query.text.toLowerCase();
      problems = problems.filter((p) => {
        return (
          p.title.toLowerCase().includes(searchText) ||
          p.description.toLowerCase().includes(searchText) ||
          p.tags.some((t) => t.toLowerCase().includes(searchText))
        );
      });
    }

    // 5. Sort
    const sortConfig = query.sort || { field: 'title', direction: 'asc' };
    problems.sort((a, b) => this.compareProblems(a, b, sortConfig));

    // 6. Pagination
    const total = problems.length;
    const offset = query.offset || 0;
    const limit = query.limit || total; // Default to all if not specified

    const paginatedProblems = problems.slice(offset, offset + limit);

    return {
      problems: paginatedProblems,
      total,
      hasMore: offset + limit < total,
      query,
    };
  }

  /**
   * Search problems by text (shorthand for list with text query)
   */
  search(text: string): Problem[] {
    return this.list({ text }).problems;
  }

  /**
   * Get a random problem matching criteria
   */
  getRandom(query: Omit<ProblemQuery, 'limit' | 'offset' | 'sort'> = {}): Problem | null {
    // Get all matching problems without pagination
    const result = this.list({ ...query, offset: 0 });
    if (result.total === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * result.total);
    return result.problems[randomIndex];
  }

  /**
   * Get all available tags
   */
  getAllTags(): string[] {
    this.ensureInitialized();
    return this.db!.getAllTags();
  }

  /**
   * Get all available companies
   */
  getAllCompanies(): string[] {
    this.ensureInitialized();
    return this.db!.getAllCompanies();
  }

  /**
   * Get difficulty distribution stats
   */
  getStats(): Record<Difficulty, number> {
    this.ensureInitialized();
    return this.db!.getDifficultyDistribution();
  }

  /**
   * Add a new custom problem
   */
  async add(problem: Problem): Promise<void> {
    this.ensureInitialized();

    // 1. Validate
    const validation = validateProblem(problem);
    if (!validation.valid) {
      throw new ProblemError(
        `Invalid problem data: ${validation.errors.join('; ')}`,
        createErrorContext('addProblem', { errors: validation.errors }),
      );
    }

    // 2. Check for uniqueness
    if (this.db!.hasId(problem.id)) {
      throw new ProblemError(
        `Problem with ID '${problem.id}' already exists`,
        createErrorContext('addProblem', { id: problem.id, reason: 'duplicate_id' }),
      );
    }
    if (this.db!.hasSlug(problem.slug)) {
      throw new ProblemError(
        `Problem with slug '${problem.slug}' already exists`,
        createErrorContext('addProblem', { slug: problem.slug, reason: 'duplicate_slug' }),
      );
    }

    // 3. Prepare data
    const newProblem = { ...problem };
    if (!newProblem.createdAt) {
      newProblem.createdAt = new Date();
    }
    newProblem.updatedAt = new Date();

    // 4. Write to file
    const customPath = this.options.customPath || getCustomProblemsPath();
    const filePath = join(customPath, `${newProblem.slug}.json`);

    // Ensure we don't overwrite an existing file (redundant with db check, but safe)
    if (await pathExists(filePath)) {
      throw new ProblemError(
        `File already exists at ${filePath}`,
        createErrorContext('addProblem', { path: filePath, reason: 'file_exists' }),
      );
    }

    await this.writeProblemFile(filePath, newProblem);

    // 5. Reload database
    await this.init();
  }

  /**
   * Update an existing custom problem
   */
  async update(idOrSlug: string, updates: Partial<Problem>): Promise<void> {
    this.ensureInitialized();

    // 1. Find existing
    const existing = this.db!.getById(idOrSlug) || this.db!.getBySlug(idOrSlug);
    if (!existing) {
      throw new ProblemError(
        `Problem not found: ${idOrSlug}`,
        createErrorContext('updateProblem', { idOrSlug, reason: 'not_found' }),
      );
    }

    // 2. Check if custom (cannot update built-ins)
    // We determine this by checking the file location or relying on DB metadata if we had it.
    // Since we don't store source path in Problem, we can re-derive it or assume
    // based on whether it exists in custom path.
    const customPath = this.options.customPath || getCustomProblemsPath();
    const expectedOldPath = join(customPath, `${existing.slug}.json`);

    if (!(await pathExists(expectedOldPath))) {
      throw new ProblemError(
        `Cannot update built-in problem: ${existing.slug}`,
        createErrorContext('updateProblem', { slug: existing.slug, reason: 'readonly_builtin' }),
      );
    }

    // 3. Merge updates
    const updatedProblem = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // 4. Validate
    const validation = validateProblem(updatedProblem);
    if (!validation.valid) {
      throw new ProblemError(
        `Invalid problem data after update: ${validation.errors.join('; ')}`,
        createErrorContext('updateProblem', { errors: validation.errors }),
      );
    }

    // 5. Check ID uniqueness if changed
    if (updatedProblem.id !== existing.id && this.db!.hasId(updatedProblem.id)) {
      throw new ProblemError(
        `New ID '${updatedProblem.id}' is already in use`,
        createErrorContext('updateProblem', { id: updatedProblem.id, reason: 'duplicate_id' }),
      );
    }

    // 6. Check Slug uniqueness if changed
    const slugChanged = updatedProblem.slug !== existing.slug;
    if (slugChanged && this.db!.hasSlug(updatedProblem.slug)) {
      throw new ProblemError(
        `New slug '${updatedProblem.slug}' is already in use`,
        createErrorContext('updateProblem', {
          slug: updatedProblem.slug,
          reason: 'duplicate_slug',
        }),
      );
    }

    // 7. Write new file
    const newPath = join(customPath, `${updatedProblem.slug}.json`);

    // If slug changed, we are writing to a new file. Check existence just in case.
    if (slugChanged && (await pathExists(newPath))) {
      // Should be caught by hasSlug check, but file system might be out of sync
      throw new ProblemError(
        `File already exists: ${newPath}`,
        createErrorContext('updateProblem', { path: newPath, reason: 'file_exists' }),
      );
    }

    await this.writeProblemFile(newPath, updatedProblem);

    // 8. Remove old file if slug changed
    if (slugChanged) {
      await removeFile(expectedOldPath);
    }

    // 9. Reload DB
    await this.init();
  }

  /**
   * Remove a custom problem
   */
  async remove(idOrSlug: string): Promise<void> {
    this.ensureInitialized();

    const problem = this.db!.getById(idOrSlug) || this.db!.getBySlug(idOrSlug);
    if (!problem) {
      throw new ProblemError(
        `Problem not found: ${idOrSlug}`,
        createErrorContext('removeProblem', { idOrSlug, reason: 'not_found' }),
      );
    }

    const customPath = this.options.customPath || getCustomProblemsPath();
    const filePath = join(customPath, `${problem.slug}.json`);

    if (!(await pathExists(filePath))) {
      throw new ProblemError(
        `Cannot remove built-in problem: ${problem.slug}`,
        createErrorContext('removeProblem', { slug: problem.slug, reason: 'readonly_builtin' }),
      );
    }

    await removeFile(filePath);
    await this.init();
  }

  /**
   * Helper to write problem to file safely
   */
  private async writeProblemFile(path: string, problem: Problem): Promise<void> {
    const tempPath = `${path}.tmp`;
    const content = JSON.stringify(problem, null, 2);

    try {
      await writeTextFile(tempPath, content, { ensureParents: true, overwrite: true });
      await Deno.rename(tempPath, path);
    } catch (error) {
      // Clean up temp file if rename fails
      try {
        await removeFile(tempPath);
      } catch { /* ignore */ }

      throw new ProblemError(
        `Failed to write problem file: ${path}`,
        createErrorContext('writeProblemFile', { path, error: String(error) }),
      );
    }
  }

  /**
   * Compare two problems for sorting
   */
  private compareProblems(a: Problem, b: Problem, config: ProblemSortConfig): number {
    const { field, direction } = config;
    const modifier = direction === 'desc' ? -1 : 1;

    let valueA: string | number | Date | undefined;
    let valueB: string | number | Date | undefined;

    switch (field) {
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      case 'difficulty': {
        const difficultyRank: Record<Difficulty, number> = {
          easy: 1,
          medium: 2,
          hard: 3,
        };
        valueA = difficultyRank[a.difficulty];
        valueB = difficultyRank[b.difficulty];
        break;
      }
      case 'createdAt':
        valueA = a.createdAt;
        valueB = b.createdAt;
        break;
      case 'updatedAt':
        valueA = a.updatedAt;
        valueB = b.updatedAt;
        break;
    }

    if (valueA === valueB) return 0;
    if (valueA === undefined) return 1; // undefined last
    if (valueB === undefined) return -1;

    return (valueA < valueB ? -1 : 1) * modifier;
  }
}
