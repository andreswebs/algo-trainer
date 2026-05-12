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
 * Tracks loaded problem IDs and slugs to detect duplicates
 */
interface DedupTracker {
  ids: Set<string>;
  slugs: Set<string>;
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

  private constructor(
    problems: Problem[],
    indices: ProblemIndices,
  ) {
    this.problems = problems;
    this.indices = indices;
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

    const tracker: DedupTracker = { ids: new Set(), slugs: new Set() };
    const problems: Problem[] = [];

    let builtIn: Problem[];
    if (builtInPath !== 'src/data/problems') {
      builtIn = await loadBuiltInFromDirectory(builtInPath, tracker);
    } else {
      builtIn = loadBuiltInFromGenerated(tracker);
    }
    problems.push(...builtIn);

    if (loadCustomProblems) {
      const customProblemsPath = customPath ?? getCustomProblemsPath();
      const custom = await loadCustomUserProblems(
        customProblemsPath,
        customProblemErrorBehavior,
        tracker,
      );
      problems.push(...custom);
    }

    return new ProblemDatabase(problems, buildIndices(problems));
  }

  /**
   * Get all problems
   */
  getAll(): Problem[] {
    return [...this.problems];
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
  // fallow-ignore-next-line unused-class-members
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
  // fallow-ignore-next-line unused-class-members
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
  // fallow-ignore-next-line unused-class-members
  getByCompany(company: string): Problem[] {
    return [...(this.indices.byCompany.get(company.toLowerCase()) ?? [])];
  }

  /**
   * Get all unique tags across all problems
   */
  // fallow-ignore-next-line unused-class-members
  getAllTags(): string[] {
    return [...this.indices.byTag.keys()].sort();
  }

  /**
   * Get all unique companies across all problems
   */
  // fallow-ignore-next-line unused-class-members
  getAllCompanies(): string[] {
    return [...this.indices.byCompany.keys()].sort();
  }

  /**
   * Get count of problems per difficulty
   */
  // fallow-ignore-next-line unused-class-members
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
 * Check a problem for duplicate ID/slug and register it in the tracker
 */
function trackProblem(problem: Problem, path: string, tracker: DedupTracker): void {
  if (tracker.ids.has(problem.id)) {
    throw new ProblemError(
      `Duplicate problem ID: '${problem.id}' in ${path}`,
      createErrorContext('loadProblemDatabase', {
        path,
        reason: 'duplicate_id',
        duplicateId: problem.id,
      }),
    );
  }
  if (tracker.slugs.has(problem.slug)) {
    throw new ProblemError(
      `Duplicate problem slug: '${problem.slug}' in ${path}`,
      createErrorContext('loadProblemDatabase', {
        path,
        reason: 'duplicate_slug',
        duplicateSlug: problem.slug,
      }),
    );
  }
  tracker.ids.add(problem.id);
  tracker.slugs.add(problem.slug);
}

/**
 * Parse and track a single built-in problem from a file path
 */
async function parseBuiltInProblem(filePath: string, tracker: DedupTracker): Promise<Problem> {
  try {
    const problem = await parseProblemFromFile(filePath);
    trackProblem(problem, filePath, tracker);
    return problem;
  } catch (error) {
    if (error instanceof ProblemError) throw error;
    throw new ProblemError(
      `Failed to load built-in problem: ${filePath}`,
      createErrorContext('loadProblemDatabase', {
        path: filePath,
        reason: 'parse_error',
        originalError: String(error),
      }),
    );
  }
}

/**
 * Load built-in problems from a file system directory (used in tests)
 */
async function loadBuiltInFromDirectory(
  dirPath: string,
  tracker: DedupTracker,
): Promise<Problem[]> {
  if (!await pathExists(dirPath)) {
    return [];
  }
  const filePaths = await discoverProblemFiles(dirPath);
  const problems: Problem[] = [];
  for (const filePath of filePaths) {
    problems.push(await parseBuiltInProblem(filePath, tracker));
  }
  return problems;
}

/**
 * Parse and track a single problem from the generated module
 */
function parseGeneratedProblem(jsonData: string, slug: string, tracker: DedupTracker): Problem {
  const path = `${slug}.json`;
  try {
    const problem = parseProblemFromJson(jsonData, path);
    trackProblem(problem, path, tracker);
    return problem;
  } catch (error) {
    if (error instanceof ProblemError) throw error;
    throw new ProblemError(
      `Failed to load built-in problem: ${path}`,
      createErrorContext('loadProblemDatabase', {
        path,
        reason: 'parse_error',
        originalError: String(error),
      }),
    );
  }
}

/**
 * Load built-in problems from the generated TypeScript module (production default)
 */
function loadBuiltInFromGenerated(tracker: DedupTracker): Problem[] {
  const problems: Problem[] = [];
  for (const slug of getAllProblemSlugs()) {
    const jsonData = getProblemJson(slug);
    if (!jsonData) continue;
    problems.push(parseGeneratedProblem(jsonData, slug, tracker));
  }
  return problems;
}

/**
 * Parse and track a single custom user problem, applying error behavior policy
 */
async function parseCustomProblem(
  filePath: string,
  behavior: 'fail' | 'warn' | 'silent',
  tracker: DedupTracker,
): Promise<Problem | null> {
  try {
    const problem = await parseProblemFromFile(filePath);
    trackProblem(problem, filePath, tracker);
    return problem;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (behavior === 'fail') {
      throw new ProblemError(
        `Failed to load custom problem: ${filePath}`,
        createErrorContext('loadProblemDatabase', {
          path: filePath,
          reason: 'parse_error',
          originalError: errorMsg,
        }),
      );
    }
    if (behavior === 'warn') {
      logger.warn(`Skipping invalid custom problem: ${filePath} - ${errorMsg}`);
    }
    return null;
  }
}

/**
 * Load custom user problems from a directory, applying error behavior policy
 */
async function loadCustomUserProblems(
  dirPath: string,
  behavior: 'fail' | 'warn' | 'silent',
  tracker: DedupTracker,
): Promise<Problem[]> {
  if (!await pathExists(dirPath)) {
    return [];
  }
  const filePaths = await discoverProblemFiles(dirPath);
  const problems: Problem[] = [];
  for (const filePath of filePaths) {
    const problem = await parseCustomProblem(filePath, behavior, tracker);
    if (problem) {
      problems.push(problem);
    }
  }
  return problems;
}

/**
 * Scan a directory for problem JSON files, returning sorted absolute paths
 */
async function discoverProblemFiles(dirPath: string): Promise<string[]> {
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
