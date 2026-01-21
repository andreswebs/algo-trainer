/**
 * Problem database builder and indexing
 *
 * Loads all problems from disk and builds indices for fast lookups and filtering.
 * Supports both built-in problems (src/data/problems) and custom user problems
 * (in XDG data home).
 *
 * @module core/problem/database
 */

import { join } from '@std/path';
import type { Difficulty, Problem } from '../../types/global.ts';
import { createErrorContext, ProblemError } from '../../utils/errors.ts';
import { listDirectory, pathExists } from '../../utils/fs.ts';
import { getConfigPaths } from '../../config/paths.ts';
import { logger } from '../../utils/output.ts';
import { parseProblemFromFile, parseProblemFromJson } from './parser.ts';
import { getAllProblemSlugs, getProblemJson } from '../../data/problems.generated.ts';

/**
 * Database loading options
 */
export interface ProblemDatabaseOptions {
  /**
   * Path to built-in problems directory.
   * Default: 'src/data/problems' (relative to project root)
   */
  builtInPath?: string;

  /**
   * Whether to load custom user problems from XDG data home.
   * Default: true
   */
  loadCustomProblems?: boolean;

  /**
   * Custom path for user problems. If not specified, uses XDG data home.
   * Primarily useful for testing.
   */
  customPath?: string;

  /**
   * Behavior when a custom problem fails to parse.
   * - 'fail': Throw error (same as built-in)
   * - 'warn': Log warning and skip
   * - 'silent': Skip silently
   * Default: 'warn'
   */
  customProblemErrorBehavior?: 'fail' | 'warn' | 'silent';
}

/**
 * Index structures for fast lookups
 */
interface ProblemIndices {
  byId: Map<string, Problem>;
  bySlug: Map<string, Problem>;
  byDifficulty: Map<Difficulty, Problem[]>;
  byTag: Map<string, Problem[]>;
  byCompany: Map<string, Problem[]>;
}

/**
 * Database loading result with statistics
 */
export interface ProblemDatabaseLoadResult {
  /** Total number of problems loaded */
  total: number;
  /** Number of built-in problems */
  builtIn: number;
  /** Number of custom problems */
  custom: number;
  /** Problems that failed to load (if using warn/silent mode) */
  skipped: Array<{ path: string; error: string }>;
}

/**
 * Problem database with indexed access
 *
 * Provides fast lookups by various criteria through pre-built indices.
 * The database is immutable after creation - to add/remove problems,
 * create a new database instance.
 */
export class ProblemDatabase {
  private readonly problems: Problem[];
  private readonly indices: ProblemIndices;
  private readonly loadResult: ProblemDatabaseLoadResult;

  private constructor(
    problems: Problem[],
    indices: ProblemIndices,
    loadResult: ProblemDatabaseLoadResult,
  ) {
    this.problems = problems;
    this.indices = indices;
    this.loadResult = loadResult;
  }

  /**
   * Load problems and build database
   *
   * @param options - Database loading options
   * @returns A new ProblemDatabase instance
   * @throws ProblemError if built-in problems fail to load or duplicates are found
   */
  static async load(options: ProblemDatabaseOptions = {}): Promise<ProblemDatabase> {
    const {
      builtInPath = 'src/data/problems',
      loadCustomProblems = true,
      customPath,
      customProblemErrorBehavior = 'warn',
    } = options;

    const problems: Problem[] = [];
    const skipped: Array<{ path: string; error: string }> = [];
    let builtInCount = 0;
    let customCount = 0;

    const loadedIds = new Set<string>();
    const loadedSlugs = new Set<string>();

    const loadProblem = async (
      path: string,
      isBuiltIn: boolean,
    ): Promise<Problem | null> => {
      try {
        const problem = await parseProblemFromFile(path);

        if (loadedIds.has(problem.id)) {
          const errorMsg = isBuiltIn
            ? `Duplicate problem ID: '${problem.id}' in ${path}`
            : `Duplicate problem ID: '${problem.id}' in ${path}. Each problem must have a unique ID.`;
          throw new ProblemError(
            errorMsg,
            createErrorContext('loadProblemDatabase', {
              path,
              reason: 'duplicate_id',
              duplicateId: problem.id,
            }),
          );
        }

        if (loadedSlugs.has(problem.slug)) {
          const errorMsg = isBuiltIn
            ? `Duplicate problem slug: '${problem.slug}' in ${path}`
            : `Duplicate problem slug: '${problem.slug}' in ${path}. Each problem must have a unique slug.`;
          throw new ProblemError(
            errorMsg,
            createErrorContext('loadProblemDatabase', {
              path,
              reason: 'duplicate_slug',
              duplicateSlug: problem.slug,
            }),
          );
        }

        loadedIds.add(problem.id);
        loadedSlugs.add(problem.slug);

        return problem;
      } catch (error) {
        if (isBuiltIn) {
          if (error instanceof ProblemError) {
            throw error;
          }
          throw new ProblemError(
            `Failed to load built-in problem: ${path}`,
            createErrorContext('loadProblemDatabase', {
              path,
              reason: 'parse_error',
              originalError: String(error),
            }),
          );
        }

        const errorMsg = error instanceof Error ? error.message : String(error);

        if (customProblemErrorBehavior === 'fail') {
          throw new ProblemError(
            `Failed to load custom problem: ${path}`,
            createErrorContext('loadProblemDatabase', {
              path,
              reason: 'parse_error',
              originalError: errorMsg,
            }),
          );
        }

        if (customProblemErrorBehavior === 'warn') {
          logger.warn(`Skipping invalid custom problem: ${path} - ${errorMsg}`);
        }

        skipped.push({ path, error: errorMsg });
        return null;
      }
    };

    // Load built-in problems from generated TypeScript module
    // This allows the data to be bundled with `deno compile`
    const builtInSlugs = getAllProblemSlugs();
    for (const slug of builtInSlugs) {
      const jsonData = getProblemJson(slug);
      if (!jsonData) continue;

      try {
        const problem = parseProblemFromJson(jsonData, `${slug}.json`);

        if (loadedIds.has(problem.id)) {
          throw new ProblemError(
            `Duplicate problem ID: '${problem.id}' in ${slug}.json`,
            createErrorContext('loadProblemDatabase', {
              path: `${slug}.json`,
              reason: 'duplicate_id',
              duplicateId: problem.id,
            }),
          );
        }

        if (loadedSlugs.has(problem.slug)) {
          throw new ProblemError(
            `Duplicate problem slug: '${problem.slug}' in ${slug}.json`,
            createErrorContext('loadProblemDatabase', {
              path: `${slug}.json`,
              reason: 'duplicate_slug',
              duplicateSlug: problem.slug,
            }),
          );
        }

        loadedIds.add(problem.id);
        loadedSlugs.add(problem.slug);

        problems.push(problem);
        builtInCount++;
      } catch (error) {
        if (error instanceof ProblemError) {
          throw error;
        }
        throw new ProblemError(
          `Failed to load built-in problem: ${slug}.json`,
          createErrorContext('loadProblemDatabase', {
            path: `${slug}.json`,
            reason: 'parse_error',
            originalError: String(error),
          }),
        );
      }
    }

    if (loadCustomProblems) {
      const customProblemsPath = customPath ?? getCustomProblemsPath();
      if (await pathExists(customProblemsPath)) {
        const customProblems = await loadProblemsFromDirectory(customProblemsPath);
        for (const filePath of customProblems) {
          const problem = await loadProblem(filePath, false);
          if (problem) {
            problems.push(problem);
            customCount++;
          }
        }
      }
    }

    const indices = buildIndices(problems);

    const loadResult: ProblemDatabaseLoadResult = {
      total: problems.length,
      builtIn: builtInCount,
      custom: customCount,
      skipped,
    };

    return new ProblemDatabase(problems, indices, loadResult);
  }

  /**
   * Get loading statistics
   */
  getLoadResult(): ProblemDatabaseLoadResult {
    return { ...this.loadResult };
  }

  /**
   * Get all problems
   */
  getAll(): Problem[] {
    return [...this.problems];
  }

  /**
   * Get total number of problems
   */
  count(): number {
    return this.problems.length;
  }

  /**
   * Get problem by ID
   *
   * @param id - Problem ID
   * @returns Problem or null if not found
   */
  getById(id: string): Problem | null {
    return this.indices.byId.get(id) ?? null;
  }

  /**
   * Get problem by slug
   *
   * @param slug - Problem slug
   * @returns Problem or null if not found
   */
  getBySlug(slug: string): Problem | null {
    return this.indices.bySlug.get(slug) ?? null;
  }

  /**
   * Get problems by difficulty
   *
   * @param difficulty - Difficulty level
   * @returns Array of matching problems (empty if none)
   */
  getByDifficulty(difficulty: Difficulty): Problem[] {
    return [...(this.indices.byDifficulty.get(difficulty) ?? [])];
  }

  /**
   * Get problems by tag
   *
   * Tags are matched case-insensitively.
   *
   * @param tag - Tag to filter by
   * @returns Array of matching problems (empty if none)
   */
  getByTag(tag: string): Problem[] {
    return [...(this.indices.byTag.get(tag.toLowerCase()) ?? [])];
  }

  /**
   * Get problems by company
   *
   * Companies are matched case-insensitively.
   *
   * @param company - Company to filter by
   * @returns Array of matching problems (empty if none)
   */
  getByCompany(company: string): Problem[] {
    return [...(this.indices.byCompany.get(company.toLowerCase()) ?? [])];
  }

  /**
   * Get all unique tags across all problems
   */
  getAllTags(): string[] {
    return [...this.indices.byTag.keys()].sort();
  }

  /**
   * Get all unique companies across all problems
   */
  getAllCompanies(): string[] {
    return [...this.indices.byCompany.keys()].sort();
  }

  /**
   * Get count of problems per difficulty
   */
  getDifficultyDistribution(): Record<Difficulty, number> {
    return {
      easy: this.indices.byDifficulty.get('easy')?.length ?? 0,
      medium: this.indices.byDifficulty.get('medium')?.length ?? 0,
      hard: this.indices.byDifficulty.get('hard')?.length ?? 0,
    };
  }

  /**
   * Check if a problem ID exists
   */
  hasId(id: string): boolean {
    return this.indices.byId.has(id);
  }

  /**
   * Check if a problem slug exists
   */
  hasSlug(slug: string): boolean {
    return this.indices.bySlug.has(slug);
  }
}

/**
 * Get the path to custom user problems directory
 */
export function getCustomProblemsPath(): string {
  const paths = getConfigPaths();
  return join(paths.data, 'problems');
}

/**
 * Scan a directory for problem JSON files
 *
 * @param dirPath - Directory path to scan
 * @returns Array of absolute paths to problem JSON files
 */
async function loadProblemsFromDirectory(dirPath: string): Promise<string[]> {
  const entries = await listDirectory(dirPath, { recursive: false });
  return entries
    .filter((entry) => !entry.isDirectory && entry.name.endsWith('.json'))
    .map((entry) => entry.path)
    .sort();
}

/**
 * Build all indices from a list of problems
 */
function buildIndices(problems: Problem[]): ProblemIndices {
  const byId = new Map<string, Problem>();
  const bySlug = new Map<string, Problem>();
  const byDifficulty = new Map<Difficulty, Problem[]>();
  const byTag = new Map<string, Problem[]>();
  const byCompany = new Map<string, Problem[]>();

  for (const problem of problems) {
    byId.set(problem.id, problem);
    bySlug.set(problem.slug, problem);

    if (!byDifficulty.has(problem.difficulty)) {
      byDifficulty.set(problem.difficulty, []);
    }
    byDifficulty.get(problem.difficulty)!.push(problem);

    for (const tag of problem.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!byTag.has(normalizedTag)) {
        byTag.set(normalizedTag, []);
      }
      byTag.get(normalizedTag)!.push(problem);
    }

    if (problem.companies) {
      for (const company of problem.companies) {
        const normalizedCompany = company.toLowerCase();
        if (!byCompany.has(normalizedCompany)) {
          byCompany.set(normalizedCompany, []);
        }
        byCompany.get(normalizedCompany)!.push(problem);
      }
    }
  }

  return { byId, bySlug, byDifficulty, byTag, byCompany };
}
