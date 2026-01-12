/**
 * Workspace layout and path resolution types for the Problem Management System.
 *
 * This module defines the concrete workspace structure under `config.workspace`,
 * including directory layouts, per-problem path conventions, file naming rules,
 * and overwrite/conflict policies.
 *
 * ## Workspace Directory Layout
 *
 * ```
 * <workspace-root>/
 * ├── problems/              # Active problem workspaces
 * │   └── <problem-slug>/    # Per-problem directory
 * │       ├── solution.<ext> # Solution file
 * │       ├── solution.test.<ext>  # Test file
 * │       └── README.md      # Problem description
 * ├── completed/             # Archived/completed problems
 * │   └── <problem-slug>/    # Same structure as problems/
 * ├── templates/             # User template overrides (optional)
 * └── .algo-trainer/         # Workspace-level configuration
 *     └── config.json        # Workspace config
 * ```
 *
 * @module core/workspace/types
 */

import type { SupportedLanguage, WorkspaceStructure } from '../../types/global.ts';

// ============================================================================
// Workspace Directory Constants
// ============================================================================

/**
 * Default directory names for workspace structure.
 *
 * These are the subdirectory names created under the workspace root.
 * They map directly to `WorkspaceStructure` fields.
 */
export const WORKSPACE_DIRS = {
  /** Directory for active problem workspaces */
  problems: 'problems',
  /** Directory for completed/archived problems */
  completed: 'completed',
  /** Directory for user template overrides */
  templates: 'templates',
  /** Hidden directory for workspace configuration */
  config: '.algo-trainer',
} as const;

/**
 * Workspace configuration file name (inside config directory)
 */
export const WORKSPACE_CONFIG_FILE = 'config.json';

/**
 * Progress tracking file name (inside config directory)
 */
export const WORKSPACE_PROGRESS_FILE = 'progress.json';

// ============================================================================
// Per-Problem File Layout
// ============================================================================

/**
 * Standard file names for problem workspace files.
 *
 * Each problem directory contains these files (without extension for solution/test).
 */
export const PROBLEM_FILES = {
  /** Solution file base name (extension added based on language) */
  solution: 'solution',
  /** Test file base name (extension added based on language) */
  test: 'solution.test',
  /** README file (always markdown) */
  readme: 'README.md',
} as const;

/**
 * File extensions for each supported language.
 *
 * Used to generate the correct file names for solution and test files.
 */
export const LANGUAGE_EXTENSIONS: Record<SupportedLanguage, string> = {
  typescript: '.ts',
  javascript: '.js',
  python: '.py',
  java: '.java',
  cpp: '.cpp',
  rust: '.rs',
  go: '.go',
};

/**
 * Test file naming patterns for each supported language.
 *
 * Different languages have different test file conventions:
 * - TypeScript/JavaScript: `<name>.test.ts`
 * - Python: `test_<name>.py` or `<name>_test.py`
 * - Java: `<Name>Test.java`
 * - Go: `<name>_test.go`
 * - Rust: Tests are typically in the same file or `<name>_test.rs`
 * - C++: `<name>_test.cpp`
 *
 * For simplicity and consistency, we use `solution.test.<ext>` pattern
 * with language-specific variations where necessary.
 */
export const TEST_FILE_PATTERNS: Record<SupportedLanguage, { prefix: string; suffix: string }> = {
  typescript: { prefix: 'solution', suffix: '.test.ts' },
  javascript: { prefix: 'solution', suffix: '.test.js' },
  python: { prefix: 'test_', suffix: 'solution.py' },
  java: { prefix: 'Solution', suffix: 'Test.java' },
  cpp: { prefix: 'solution', suffix: '_test.cpp' },
  rust: { prefix: 'solution', suffix: '_test.rs' },
  go: { prefix: 'solution', suffix: '_test.go' },
};

// ============================================================================
// Path Resolution Types
// ============================================================================

/**
 * Information needed to resolve a problem's workspace path
 */
export interface ProblemPathInfo {
  /** Problem slug (kebab-case identifier) */
  slug: string;
  /** Target programming language */
  language: SupportedLanguage;
}

/**
 * Resolved paths for a problem's workspace files
 */
export interface ProblemWorkspacePaths {
  /** Problem directory (absolute path) */
  directory: string;
  /** Solution file (absolute path) */
  solution: string;
  /** Test file (absolute path) */
  test: string;
  /** README file (absolute path) */
  readme: string;
}

/**
 * Location type for problem directories
 */
export type ProblemLocation = 'active' | 'completed';

// ============================================================================
// Overwrite/Conflict Policy
// ============================================================================

/**
 * Policy for handling file conflicts when generating problem workspaces.
 *
 * - `error`: Fail with an error if any target file exists. This is the safest
 *   option and prevents accidental data loss.
 *
 * - `skip`: Skip files that already exist, only create missing files. Useful
 *   for resuming interrupted workspace setup.
 *
 * - `overwrite`: Overwrite all existing files. Use with caution as this will
 *   destroy any existing work.
 *
 * - `backup`: Create a backup of existing files before overwriting. Backups
 *   are named with a timestamp suffix (e.g., `solution.ts.backup-20240115-103045`).
 */
export type ConflictPolicy = 'error' | 'skip' | 'overwrite' | 'backup';

/**
 * Default conflict policy for file generation operations.
 *
 * Using 'error' as default to prevent accidental data loss.
 */
export const DEFAULT_CONFLICT_POLICY: ConflictPolicy = 'error';

/**
 * Backup file suffix format
 */
export const BACKUP_SUFFIX_FORMAT = 'backup';

/**
 * Options for workspace file generation
 */
export interface FileGenerationOptions {
  /** How to handle existing files (default: 'error') */
  conflictPolicy?: ConflictPolicy;
  /** Whether to create parent directories if they don't exist (default: true) */
  ensureDirectories?: boolean;
}

/**
 * Default options for file generation
 */
export const DEFAULT_FILE_GENERATION_OPTIONS: Required<FileGenerationOptions> = {
  conflictPolicy: 'error',
  ensureDirectories: true,
};

// ============================================================================
// Path Resolution Functions
// ============================================================================

/**
 * Creates a WorkspaceStructure from a workspace root path.
 *
 * This function computes the absolute paths for all workspace directories
 * based on the root path and the standard directory layout.
 *
 * @param root - Absolute path to the workspace root directory
 * @returns Complete workspace structure with all directory paths
 *
 * @example
 * ```typescript
 * const structure = createWorkspaceStructure('/home/user/algo-workspace');
 * // structure.problems === '/home/user/algo-workspace/problems'
 * // structure.completed === '/home/user/algo-workspace/completed'
 * // structure.templates === '/home/user/algo-workspace/templates'
 * // structure.config === '/home/user/algo-workspace/.algo-trainer'
 * ```
 */
export function createWorkspaceStructure(root: string): WorkspaceStructure {
  return {
    root,
    problems: `${root}/${WORKSPACE_DIRS.problems}`,
    completed: `${root}/${WORKSPACE_DIRS.completed}`,
    templates: `${root}/${WORKSPACE_DIRS.templates}`,
    config: `${root}/${WORKSPACE_DIRS.config}`,
  };
}

/**
 * Gets the directory path for a problem in the workspace.
 *
 * @param workspaceStructure - The workspace structure
 * @param slug - Problem slug (kebab-case)
 * @param location - Whether the problem is active or completed
 * @returns Absolute path to the problem directory
 *
 * @example
 * ```typescript
 * const problemDir = getProblemDirectory(structure, 'two-sum', 'active');
 * // Returns: '/workspace/problems/two-sum'
 * ```
 */
export function getProblemDirectory(
  workspaceStructure: WorkspaceStructure,
  slug: string,
  location: ProblemLocation = 'active',
): string {
  const baseDir = location === 'active'
    ? workspaceStructure.problems
    : workspaceStructure.completed;
  return `${baseDir}/${slug}`;
}

/**
 * Gets the solution file name for a given language.
 *
 * @param language - Target programming language
 * @returns Solution file name with correct extension
 *
 * @example
 * ```typescript
 * getSolutionFileName('typescript'); // 'solution.ts'
 * getSolutionFileName('python');     // 'solution.py'
 * ```
 */
export function getSolutionFileName(language: SupportedLanguage): string {
  return `${PROBLEM_FILES.solution}${LANGUAGE_EXTENSIONS[language]}`;
}

/**
 * Gets the test file name for a given language.
 *
 * Uses language-specific test file naming conventions.
 *
 * @param language - Target programming language
 * @returns Test file name with correct pattern and extension
 *
 * @example
 * ```typescript
 * getTestFileName('typescript'); // 'solution.test.ts'
 * getTestFileName('python');     // 'test_solution.py'
 * getTestFileName('java');       // 'SolutionTest.java'
 * ```
 */
export function getTestFileName(language: SupportedLanguage): string {
  const pattern = TEST_FILE_PATTERNS[language];
  return `${pattern.prefix}${pattern.suffix}`;
}

/**
 * Gets all workspace file paths for a problem.
 *
 * This is the primary function for resolving where problem files should be
 * created or read from.
 *
 * @param workspaceStructure - The workspace structure
 * @param info - Problem path information (slug and language)
 * @param location - Whether the problem is active or completed
 * @returns Complete paths for all problem workspace files
 *
 * @example
 * ```typescript
 * const paths = getProblemWorkspacePaths(
 *   structure,
 *   { slug: 'two-sum', language: 'typescript' },
 *   'active'
 * );
 * // paths.directory === '/workspace/problems/two-sum'
 * // paths.solution === '/workspace/problems/two-sum/solution.ts'
 * // paths.test === '/workspace/problems/two-sum/solution.test.ts'
 * // paths.readme === '/workspace/problems/two-sum/README.md'
 * ```
 */
export function getProblemWorkspacePaths(
  workspaceStructure: WorkspaceStructure,
  info: ProblemPathInfo,
  location: ProblemLocation = 'active',
): ProblemWorkspacePaths {
  const directory = getProblemDirectory(workspaceStructure, info.slug, location);
  return {
    directory,
    solution: `${directory}/${getSolutionFileName(info.language)}`,
    test: `${directory}/${getTestFileName(info.language)}`,
    readme: `${directory}/${PROBLEM_FILES.readme}`,
  };
}

/**
 * Gets the workspace configuration file path.
 *
 * @param workspaceStructure - The workspace structure
 * @returns Absolute path to the workspace config file
 */
export function getWorkspaceConfigPath(workspaceStructure: WorkspaceStructure): string {
  return `${workspaceStructure.config}/${WORKSPACE_CONFIG_FILE}`;
}

/**
 * Gets the progress tracking file path.
 *
 * @param workspaceStructure - The workspace structure
 * @returns Absolute path to the progress file
 */
export function getProgressFilePath(workspaceStructure: WorkspaceStructure): string {
  return `${workspaceStructure.config}/${WORKSPACE_PROGRESS_FILE}`;
}

/**
 * Generates a backup file name with timestamp.
 *
 * @param originalFileName - The original file name to back up
 * @param date - Date to use for timestamp (defaults to now)
 * @returns Backup file name with timestamp suffix
 *
 * @example
 * ```typescript
 * getBackupFileName('solution.ts', new Date('2024-01-15T10:30:45Z'));
 * // Returns: 'solution.ts.backup-20240115-103045'
 * ```
 */
export function getBackupFileName(originalFileName: string, date: Date = new Date()): string {
  const timestamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15);
  return `${originalFileName}.${BACKUP_SUFFIX_FORMAT}-${timestamp}`;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates that a slug follows the expected kebab-case format.
 *
 * Valid slugs:
 * - Contain only lowercase letters, numbers, and hyphens
 * - Start and end with a letter or number
 * - Do not contain consecutive hyphens
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  // Must be lowercase alphanumeric with hyphens, no leading/trailing or consecutive hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Validates workspace structure paths.
 *
 * Ensures all required paths are present and non-empty.
 *
 * @param structure - The workspace structure to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateWorkspaceStructure(structure: WorkspaceStructure): string[] {
  const errors: string[] = [];

  if (!structure.root) {
    errors.push('Workspace root path is required');
  }
  if (!structure.problems) {
    errors.push('Problems directory path is required');
  }
  if (!structure.completed) {
    errors.push('Completed directory path is required');
  }
  if (!structure.templates) {
    errors.push('Templates directory path is required');
  }
  if (!structure.config) {
    errors.push('Config directory path is required');
  }

  return errors;
}
