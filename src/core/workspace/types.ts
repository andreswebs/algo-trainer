/**
 * Workspace types for the Problem Management System.
 *
 * Defines the concrete structure of the user's workspace where problems
 * are solved, templates are stored, and configuration is kept.
 *
 * @module core/workspace/types
 *
 * @example
 * ```ts
 * import { getWorkspacePaths, type WorkspacePaths } from './workspace/mod.ts';
 *
 * const paths = getWorkspacePaths('/home/user/algo-workspace');
 * console.log(paths.problems); // /home/user/algo-workspace/problems
 * ```
 */

import type { SupportedLanguage } from '../../types/global.ts';

/**
 * Concrete layout of the workspace directory structure
 *
 * This interface maps the high-level `WorkspaceStructure` from global types
 * to concrete file system paths and naming conventions.
 *
 * All paths are absolute and resolved from the root directory.
 *
 * @example
 * ```ts
 * const paths: WorkspacePaths = {
 *   root: '/home/user/workspace',
 *   problems: '/home/user/workspace/problems',
 *   completed: '/home/user/workspace/completed',
 *   templates: '/home/user/workspace/templates',
 *   config: '/home/user/workspace/config',
 * };
 * ```
 */
export interface WorkspacePaths {
  /** Root directory of the workspace (absolute path) */
  readonly root: string;

  /**
   * Directory for active problems being solved
   * Path: `<root>/problems`
   */
  readonly problems: string;

  /**
   * Directory for completed/archived problems
   * Path: `<root>/completed`
   */
  readonly completed: string;

  /**
   * Directory for user templates
   * Path: `<root>/templates`
   */
  readonly templates: string;

  /**
   * Directory for workspace configuration
   * Path: `<root>/config`
   */
  readonly config: string;
}

/**
 * File paths for a specific problem within the workspace
 *
 * All paths are absolute and language-specific where applicable.
 *
 * @example
 * ```ts
 * const problemPaths: ProblemWorkspacePaths = {
 *   dir: '/home/user/workspace/problems/two-sum',
 *   solutionFile: '/home/user/workspace/problems/two-sum/solution.ts',
 *   testFile: '/home/user/workspace/problems/two-sum/solution_test.ts',
 *   readmeFile: '/home/user/workspace/problems/two-sum/README.md',
 *   metadataFile: '/home/user/workspace/problems/two-sum/.problem.json',
 * };
 * ```
 */
export interface ProblemWorkspacePaths {
  /**
   * Root directory for the specific problem (absolute path)
   * Path: `<root>/problems/<slug>`
   */
  readonly dir: string;

  /**
   * Path to the solution file (absolute path)
   * Path: `<dir>/solution.<ext>`
   */
  readonly solutionFile: string;

  /**
   * Path to the test file (absolute path)
   * Path: `<dir>/solution_test.<ext>` (or language specific)
   */
  readonly testFile: string;

  /**
   * Path to the problem README (absolute path)
   * Path: `<dir>/README.md`
   */
  readonly readmeFile: string;

  /**
   * Path to the problem metadata/tracking file (hidden, absolute path)
   * Path: `<dir>/.problem.json`
   */
  readonly metadataFile: string;
}

/**
 * Configuration for workspace path resolution
 *
 * @example
 * ```ts
 * const config: WorkspacePathConfig = {
 *   rootDir: '/home/user/workspace',
 *   language: 'typescript',
 * };
 *
 * const paths = getProblemPaths(config, 'two-sum');
 * ```
 */
export interface WorkspacePathConfig {
  /** The workspace root directory (can be relative or absolute) */
  readonly rootDir: string;
  /** The programming language (affects file extensions and naming) */
  readonly language: SupportedLanguage;
}

/**
 * Rules for resolving file paths
 */
export const WORKSPACE_RULES = {
  /** Directory names */
  dirs: {
    problems: 'problems',
    completed: 'completed',
    templates: 'templates',
    config: 'config',
  },

  /** File names */
  files: {
    readme: 'README.md',
    metadata: '.problem.json',
    solutionBase: 'solution',
    testBase: 'solution_test', // Default, may vary by language
  },
} as const;
