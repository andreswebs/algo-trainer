/**
 * Workspace path resolution logic.
 * 
 * Implements the path resolution rules defined in PMS-013.
 * Handles mapping between logical workspace concepts and physical file paths.
 * 
 * ## Security Considerations
 * 
 * All path operations include validation to prevent:
 * - Path traversal attacks (../ sequences)
 * - Null byte injection
 * - Invalid characters in paths
 * 
 * ## Performance
 * 
 * Resolved paths are cached to improve performance for repeated operations.
 * The cache is simple and memory-efficient, suitable for typical CLI usage.
 * 
 * @module core/workspace/files
 * 
 * @example
 * ```ts
 * import { getProblemPaths, getWorkspacePaths } from './workspace/mod.ts';
 * 
 * // Get workspace structure
 * const workspace = getWorkspacePaths('/home/user/workspace');
 * 
 * // Get paths for a specific problem
 * const problemPaths = getProblemPaths(
 *   { rootDir: '/home/user/workspace', language: 'typescript' },
 *   'two-sum'
 * );
 * ```
 */

import { join, resolve, normalize } from '@std/path';
import type { SupportedLanguage } from '../../types/global.ts';
import type { 
  ProblemWorkspacePaths, 
  WorkspacePathConfig, 
  WorkspacePaths 
} from './types.ts';
import { WORKSPACE_RULES } from './types.ts';
import { WorkspaceError, ValidationError, createErrorContext } from '../../utils/errors.ts';

/**
 * Simple cache for resolved workspace paths to improve performance.
 * Maps root directory to resolved workspace paths.
 */
const workspacePathCache = new Map<string, WorkspacePaths>();

/**
 * Maximum cache size to prevent unbounded memory growth
 */
const MAX_CACHE_SIZE = 100;

/**
 * Validates a root directory path for security and correctness
 * 
 * @param rootDir - The root directory to validate
 * @throws {ValidationError} If the path is invalid or potentially unsafe
 */
function validateRootDirectory(rootDir: string): void {
  if (typeof rootDir !== 'string') {
    throw new ValidationError(
      'Root directory must be a string',
      createErrorContext('validateRootDirectory', { rootDir: typeof rootDir })
    );
  }

  if (rootDir.trim().length === 0) {
    throw new ValidationError(
      'Root directory cannot be empty',
      createErrorContext('validateRootDirectory')
    );
  }

  // Check for null bytes (security concern)
  if (rootDir.includes('\0')) {
    throw new ValidationError(
      'Root directory contains invalid null bytes',
      createErrorContext('validateRootDirectory', { rootDir })
    );
  }

  // Check for path traversal patterns (security concern)
  const normalizedPath = normalize(rootDir);
  if (normalizedPath.includes('/../') || normalizedPath.endsWith('/..')) {
    throw new ValidationError(
      'Root directory contains potentially unsafe path traversal patterns',
      createErrorContext('validateRootDirectory', { rootDir, normalizedPath })
    );
  }
}

/**
 * Validates a problem slug for security and correctness
 * 
 * @param slug - The problem slug to validate
 * @throws {ValidationError} If the slug is invalid or potentially unsafe
 */
function validateSlug(slug: string): void {
  if (typeof slug !== 'string') {
    throw new ValidationError(
      'Problem slug must be a string',
      createErrorContext('validateSlug', { slug: typeof slug })
    );
  }

  if (slug.trim().length === 0) {
    throw new ValidationError(
      'Problem slug cannot be empty',
      createErrorContext('validateSlug')
    );
  }

  // Check for null bytes (security concern)
  if (slug.includes('\0')) {
    throw new ValidationError(
      'Problem slug contains invalid null bytes',
      createErrorContext('validateSlug', { slug })
    );
  }

  // Check for path traversal patterns (security concern)
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    throw new ValidationError(
      'Problem slug contains invalid path characters (must be a simple directory name)',
      createErrorContext('validateSlug', { slug })
    );
  }

  // Validate slug format (kebab-case)
  const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabCasePattern.test(slug)) {
    throw new ValidationError(
      'Problem slug must be in kebab-case format (lowercase letters, numbers, and hyphens only)',
      createErrorContext('validateSlug', { slug })
    );
  }

  if (slug.length > 100) {
    throw new ValidationError(
      'Problem slug must not exceed 100 characters',
      createErrorContext('validateSlug', { slug, length: slug.length })
    );
  }
}

/**
 * Validates a programming language
 * 
 * @param language - The language to validate
 * @throws {ValidationError} If the language is not supported
 */
function validateLanguage(language: SupportedLanguage): void {
  const validLanguages: SupportedLanguage[] = [
    'typescript',
    'javascript',
    'python',
    'java',
    'cpp',
    'rust',
    'go',
  ];

  if (!validLanguages.includes(language)) {
    throw new ValidationError(
      `Unsupported language: ${language}. Must be one of: ${validLanguages.join(', ')}`,
      createErrorContext('validateLanguage', { language, validLanguages })
    );
  }
}

/**
 * Clear the workspace path cache
 * 
 * Useful for testing or when the filesystem structure changes.
 * 
 * @internal
 */
export function clearWorkspacePathCache(): void {
  workspacePathCache.clear();
}

/**
 * Get the main workspace directory structure
 * 
 * Returns absolute paths to all key workspace directories.
 * Results are cached for improved performance on repeated calls.
 * 
 * @param rootDir - The root directory of the workspace (can be relative or absolute)
 * @returns Object containing absolute paths to key workspace directories
 * @throws {ValidationError} If rootDir is invalid or unsafe
 * 
 * @example
 * ```ts
 * const paths = getWorkspacePaths('./my-workspace');
 * console.log(paths.root);      // /absolute/path/to/my-workspace
 * console.log(paths.problems);  // /absolute/path/to/my-workspace/problems
 * ```
 */
export function getWorkspacePaths(rootDir: string): WorkspacePaths {
  // Validate input
  validateRootDirectory(rootDir);
  
  // Ensure we're working with an absolute path
  const absRoot = resolve(rootDir);
  
  // Check cache first
  const cached = workspacePathCache.get(absRoot);
  if (cached) {
    return cached;
  }
  
  // Create new workspace paths object
  const paths: WorkspacePaths = {
    root: absRoot,
    problems: join(absRoot, WORKSPACE_RULES.dirs.problems),
    completed: join(absRoot, WORKSPACE_RULES.dirs.completed),
    templates: join(absRoot, WORKSPACE_RULES.dirs.templates),
    config: join(absRoot, WORKSPACE_RULES.dirs.config),
  };
  
  // Cache the result (with size limit)
  if (workspacePathCache.size >= MAX_CACHE_SIZE) {
    // Simple LRU: clear oldest half when cache is full
    const keysToDelete = Array.from(workspacePathCache.keys()).slice(0, MAX_CACHE_SIZE / 2);
    keysToDelete.forEach(key => workspacePathCache.delete(key));
  }
  workspacePathCache.set(absRoot, paths);
  
  return paths;
}

/**
 * Get the file extension for a given language
 * 
 * @param language - The programming language
 * @returns The file extension (including the dot)
 * @throws {ValidationError} If the language is not supported
 * 
 * @example
 * ```ts
 * getFileExtension('typescript'); // '.ts'
 * getFileExtension('python');     // '.py'
 * getFileExtension('java');       // '.java'
 * ```
 */
export function getFileExtension(language: SupportedLanguage): string {
  // Validate input
  validateLanguage(language);
  
  switch (language) {
    case 'typescript': return '.ts';
    case 'javascript': return '.js';
    case 'python': return '.py';
    case 'java': return '.java';
    case 'cpp': return '.cpp';
    case 'rust': return '.rs';
    case 'go': return '.go';
    default:
      // This should be unreachable if typed correctly, but good for runtime safety
      throw new WorkspaceError(
        `Unsupported language: ${language}`,
        createErrorContext('getFileExtension', { language })
      );
  }
}

/**
 * Get the test file name for a given language
 * 
 * Different languages have different conventions for test files.
 * This function returns the conventional test file name for each language.
 * 
 * @param language - The programming language
 * @returns The test file name including extension
 * @throws {ValidationError} If the language is not supported
 * 
 * @example
 * ```ts
 * getTestFileName('typescript'); // 'solution_test.ts'
 * getTestFileName('python');     // 'test_solution.py'
 * getTestFileName('go');         // 'solution_test.go'
 * getTestFileName('java');       // 'SolutionTest.java'
 * ```
 */
export function getTestFileName(language: SupportedLanguage): string {
  // Validate input
  validateLanguage(language);
  
  const ext = getFileExtension(language);
  
  switch (language) {
    case 'python':
      // Python usually prefers test_*.py or *_test.py
      return `test_solution${ext}`;
    case 'go':
      // Go requires _test.go suffix
      return `solution_test${ext}`;
    case 'java':
      // Java usually creates a separate Test class
      return `SolutionTest${ext}`;
    case 'rust':
      // Rust tests are often in the same file, but if separate:
      return `tests${ext}`;
    case 'typescript':
    case 'javascript':
    case 'cpp':
    default:
      // Default convention
      return `${WORKSPACE_RULES.files.testBase}${ext}`;
  }
}

/**
 * Get the solution file name for a given language
 * 
 * Returns the conventional solution file name for the specified language.
 * Some languages (like Java) have specific naming requirements.
 * 
 * @param language - The programming language
 * @returns The solution file name including extension
 * @throws {ValidationError} If the language is not supported
 * 
 * @example
 * ```ts
 * getSolutionFileName('typescript'); // 'solution.ts'
 * getSolutionFileName('python');     // 'solution.py'
 * getSolutionFileName('java');       // 'Solution.java'
 * ```
 */
export function getSolutionFileName(language: SupportedLanguage): string {
  // Validate input
  validateLanguage(language);
  
  const ext = getFileExtension(language);
  
  switch (language) {
    case 'java':
      // Java file name must match class name
      return `Solution${ext}`;
    default:
      return `${WORKSPACE_RULES.files.solutionBase}${ext}`;
  }
}

/**
 * Resolve paths for a specific problem in the workspace
 * 
 * Returns all file paths for a problem, including solution, test,
 * README, and metadata files. All paths are absolute.
 * 
 * @param config - Workspace configuration with root directory and language
 * @param slug - The problem slug (must be kebab-case, no path separators)
 * @returns Object containing paths for all problem files
 * @throws {ValidationError} If config or slug are invalid
 * 
 * @example
 * ```ts
 * const config = { rootDir: '/workspace', language: 'typescript' };
 * const paths = getProblemPaths(config, 'two-sum');
 * console.log(paths.solutionFile); // /workspace/problems/two-sum/solution.ts
 * console.log(paths.testFile);     // /workspace/problems/two-sum/solution_test.ts
 * ```
 */
export function getProblemPaths(
  config: WorkspacePathConfig,
  slug: string
): ProblemWorkspacePaths {
  // Validate inputs
  if (!config || typeof config !== 'object') {
    throw new ValidationError(
      'Config must be a valid WorkspacePathConfig object',
      createErrorContext('getProblemPaths', { config: typeof config })
    );
  }
  
  validateRootDirectory(config.rootDir);
  validateLanguage(config.language);
  validateSlug(slug);
  
  const wsPaths = getWorkspacePaths(config.rootDir);
  const problemDir = join(wsPaths.problems, slug);
  return resolveProblemPaths(problemDir, config.language);
}

/**
 * Resolve paths for an archived/completed problem
 * 
 * Returns file paths for a problem in the completed directory.
 * All paths are absolute.
 * 
 * @param config - Workspace configuration with root directory and language
 * @param slug - The problem slug (must be kebab-case, no path separators)
 * @returns Object containing paths for the problem in the completed directory
 * @throws {ValidationError} If config or slug are invalid
 * 
 * @example
 * ```ts
 * const config = { rootDir: '/workspace', language: 'typescript' };
 * const paths = getArchivedProblemPaths(config, 'two-sum');
 * console.log(paths.dir); // /workspace/completed/two-sum
 * ```
 */
export function getArchivedProblemPaths(
  config: WorkspacePathConfig,
  slug: string
): ProblemWorkspacePaths {
  // Validate inputs
  if (!config || typeof config !== 'object') {
    throw new ValidationError(
      'Config must be a valid WorkspacePathConfig object',
      createErrorContext('getArchivedProblemPaths', { config: typeof config })
    );
  }
  
  validateRootDirectory(config.rootDir);
  validateLanguage(config.language);
  validateSlug(slug);
  
  const wsPaths = getWorkspacePaths(config.rootDir);
  const problemDir = join(wsPaths.completed, slug);
  return resolveProblemPaths(problemDir, config.language);
}

/**
 * Internal helper to resolve paths within a problem directory
 * 
 * Creates a ProblemWorkspacePaths object with all necessary file paths
 * for a problem directory.
 * 
 * @param problemDir - The problem directory (absolute path)
 * @param language - The programming language
 * @returns Object containing all file paths for the problem
 * @internal
 */
function resolveProblemPaths(
  problemDir: string, 
  language: SupportedLanguage
): ProblemWorkspacePaths {
  return {
    dir: problemDir,
    solutionFile: join(problemDir, getSolutionFileName(language)),
    testFile: join(problemDir, getTestFileName(language)),
    readmeFile: join(problemDir, WORKSPACE_RULES.files.readme),
    metadataFile: join(problemDir, WORKSPACE_RULES.files.metadata),
  };
}

/**
 * Check if a path is within the workspace
 * 
 * Validates that a given path is inside the workspace boundaries.
 * This is useful for security checks to prevent operations outside
 * the workspace directory.
 * 
 * @param workspaceRoot - The workspace root directory (can be relative or absolute)
 * @param path - The path to check (can be relative or absolute)
 * @returns True if the path is inside the workspace, false otherwise
 * @throws {ValidationError} If workspaceRoot is invalid
 * 
 * @example
 * ```ts
 * isPathInWorkspace('/workspace', '/workspace/problems/two-sum'); // true
 * isPathInWorkspace('/workspace', '/tmp/other'); // false
 * isPathInWorkspace('/workspace', '/workspace/../etc'); // false
 * ```
 */
export function isPathInWorkspace(workspaceRoot: string, path: string): boolean {
  // Validate inputs
  try {
    validateRootDirectory(workspaceRoot);
  } catch (error) {
    // If workspace root is invalid, we can't determine if path is in workspace
    throw error;
  }
  
  if (typeof path !== 'string' || path.trim().length === 0) {
    return false;
  }
  
  // Check for null bytes in path (security)
  if (path.includes('\0')) {
    return false;
  }
  
  // Resolve both paths to absolute, normalized paths
  const absRoot = resolve(workspaceRoot);
  const absPath = resolve(path);
  
  // Check if absPath starts with absRoot
  // Add trailing separator to prevent false positives
  // (e.g., /workspace should not match /workspace-other)
  const rootWithSep = absRoot.endsWith('/') ? absRoot : absRoot + '/';
  
  return absPath === absRoot || absPath.startsWith(rootWithSep);
}
