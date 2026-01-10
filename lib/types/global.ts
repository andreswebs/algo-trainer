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
  /** Metadata about the problem */
  metadata?: ProblemMetadata;
}

/**
 * Additional metadata for problems
 */
export interface ProblemMetadata {
  /** When the problem was created */
  createdAt?: Date;
  /** When the problem was last updated */
  updatedAt?: Date;
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
