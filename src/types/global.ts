/**
 * Global type definitions for the Algo Trainer application.
 *
 * This module contains all core interfaces and types used throughout the application.
 * Following the domain-driven design principles, types are organized by functional area.
 *
 * @module types/global
 */

/**
 * Supported programming languages for problem solving
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'rust'
  | 'go';

/**
 * Problem difficulty levels
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Example input/output for a problem
 */
export interface Example {
  /** Input parameters for the example */
  input: Record<string, unknown>;
  /** Expected output for the example */
  output: unknown;
  /** Optional explanation of the example */
  explanation?: string;
}

/**
 * Core problem definition
 */
export interface Problem {
  /** Unique identifier for the problem */
  id: string;
  /** URL-friendly slug for the problem */
  slug: string;
  /** Human-readable title */
  title: string;
  /** Problem difficulty level */
  difficulty: Difficulty;
  /** Detailed problem description */
  description: string;
  /** Example inputs and outputs */
  examples: Example[];
  /** Problem constraints */
  constraints: string[];
  /** Progressive hints for solving the problem */
  hints: string[];
  /** Tags/categories for the problem */
  tags: string[];
  /** Companies that have asked this problem (optional) */
  companies?: string[];
  /** LeetCode URL if available */
  leetcodeUrl?: string;
  /** When the problem was created */
  createdAt?: Date;
  /** When the problem was last updated */
  updatedAt?: Date;
  /** Metadata about the problem source */
  metadata?: ProblemMetadata;
}

/**
 * Source metadata for problems
 */
export interface ProblemMetadata {
  /** Source of the problem (leetcode, original, etc.) */
  source?: string;
  /** Problem ID from original source */
  sourceId?: string;
}

/**
 * User preferences configuration
 */
export interface UserPreferences {
  /** Color theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Output verbosity level */
  verbosity: 'quiet' | 'normal' | 'verbose';
  /** Whether to auto-save progress */
  autoSave: boolean;
  /** Code template style preference */
  templateStyle: 'minimal' | 'documented' | 'comprehensive';
  /** Whether to use emoji in output */
  useEmoji: boolean;
  /** Whether to use colors in output */
  useColors: boolean;
}

/**
 * Main application configuration
 */
export interface Config {
  /** Default programming language */
  language: SupportedLanguage;
  /** Workspace root directory */
  workspace: string;
  /** Whether AI features are enabled */
  aiEnabled: boolean;
  /** Preferred companies for filtering problems */
  companies: string[];
  /** User preferences */
  preferences: UserPreferences;
  /** Configuration schema version */
  version: string;
}

/**
 * Workspace directory structure
 */
export interface WorkspaceStructure {
  /** Workspace root directory */
  root: string;
  /** Problems directory */
  problems: string;
  /** Completed problems directory */
  completed: string;
  /** Templates directory */
  templates: string;
  /** Configuration directory */
  config: string;
}

/**
 * Problem completion status
 */
export type ProblemStatus =
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'archived';

/**
 * User's progress on a problem
 */
export interface ProblemProgress {
  /** Problem identifier */
  problemId: string;
  /** Current status */
  status: ProblemStatus;
  /** Programming language used */
  language: SupportedLanguage;
  /** Number of attempts */
  attempts: number;
  /** Time spent on the problem (in minutes) */
  timeSpent: number;
  /** When first started */
  startedAt: Date;
  /** When completed (if completed) */
  completedAt?: Date;
  /** User's notes */
  notes?: string;
  /** Hints that were used */
  hintsUsed: number[];
  /** Best solution metrics */
  bestSolution?: SolutionMetrics;
}

/**
 * Solution performance metrics
 */
export interface SolutionMetrics {
  /** Time complexity */
  timeComplexity?: string;
  /** Space complexity */
  spaceComplexity?: string;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** Test cases passed */
  testsPassed: number;
  /** Total test cases */
  totalTests: number;
}

/**
 * Template configuration for code generation
 */
export interface TemplateConfig {
  /** Programming language */
  language: SupportedLanguage;
  /** Template style */
  style: UserPreferences['templateStyle'];
  /** Whether to include imports */
  includeImports: boolean;
  /** Whether to include type annotations */
  includeTypes: boolean;
  /** Whether to include example usage */
  includeExample: boolean;
}

/**
 * CLI command result
 */
export interface CommandResult<T = unknown> {
  /** Whether the command succeeded */
  success: boolean;
  /** Result data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Exit code */
  exitCode: number;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** File path that was operated on */
  path: string;
  /** Error message (if failed) */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Problem Query/Filter/Search API Types (PMS-002)
// ============================================================================

/**
 * Sort field options for problem queries
 */
export type ProblemSortField = 'title' | 'difficulty' | 'createdAt' | 'updatedAt';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sorting configuration for problem queries
 */
export interface ProblemSortConfig {
  /** Field to sort by */
  field: ProblemSortField;
  /** Sort direction (default: 'asc') */
  direction: SortDirection;
}

/**
 * Filter match mode for array fields (tags, companies)
 *
 * - 'any': Match if the problem has at least one of the specified values
 * - 'all': Match only if the problem has all of the specified values
 */
export type ArrayMatchMode = 'any' | 'all';

/**
 * Query parameters for filtering and searching problems
 *
 * ## Matching Semantics
 *
 * - **difficulty**: Matches if problem difficulty equals any of the specified values.
 *   When an array is provided, uses OR logic (match-any).
 *
 * - **tags**: Matching behavior controlled by `tagMatchMode` (default: 'any').
 *   - 'any': Problem matches if it has at least one of the specified tags.
 *   - 'all': Problem matches only if it has all specified tags.
 *   Matching is case-insensitive.
 *
 * - **companies**: Matching behavior controlled by `companyMatchMode` (default: 'any').
 *   - 'any': Problem matches if it has at least one of the specified companies.
 *   - 'all': Problem matches only if it has all specified companies.
 *   Matching is case-insensitive.
 *
 * - **text**: Case-insensitive substring search across title, description, and tags.
 *   Matches if any of these fields contain the search text.
 *
 * ## Combining Criteria
 *
 * Multiple filter criteria are combined with AND logic. A problem must match
 * all specified criteria to be included in the results.
 *
 * ## Ordering
 *
 * Results are sorted by the `sort` configuration. If not specified, defaults to
 * title ascending for stable, deterministic ordering.
 *
 * ## Pagination
 *
 * Use `limit` and `offset` for pagination. `offset` specifies how many results
 * to skip, and `limit` specifies the maximum number of results to return.
 */
export interface ProblemQuery {
  /** Filter by difficulty level(s). When array, matches any of the difficulties. */
  difficulty?: Difficulty | Difficulty[];

  /** Filter by tags. Matching behavior controlled by `tagMatchMode`. */
  tags?: string[];

  /** Match mode for tags filter (default: 'any') */
  tagMatchMode?: ArrayMatchMode;

  /** Filter by companies. Matching behavior controlled by `companyMatchMode`. */
  companies?: string[];

  /** Match mode for companies filter (default: 'any') */
  companyMatchMode?: ArrayMatchMode;

  /** Free-text search (case-insensitive, searches title, description, and tags) */
  text?: string;

  /** Maximum number of results to return */
  limit?: number;

  /** Number of results to skip (for pagination) */
  offset?: number;

  /** Sort configuration (defaults to title ascending if not specified) */
  sort?: ProblemSortConfig;
}

/**
 * Result of a paginated problem query
 */
export interface ProblemQueryResult {
  /** Problems matching the query */
  problems: Problem[];

  /** Total number of matching problems (before pagination) */
  total: number;

  /** Whether there are more results beyond the current page */
  hasMore: boolean;

  /** Query that was executed */
  query: ProblemQuery;
}

/**
 * Result of looking up a single problem
 *
 * Lookup methods (getById, getBySlug) return `null` if the problem is not found,
 * rather than throwing an error. This allows consumers to handle missing problems
 * gracefully without exception handling.
 */
export type ProblemLookupResult = Problem | null;
