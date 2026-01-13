/**
 * Workspace path resolution logic.
 * 
 * Implements the path resolution rules defined in PMS-013.
 * Handles mapping between logical workspace concepts and physical file paths.
 * 
 * @module core/workspace/files
 */

import { join, resolve } from '@std/path';
import type { SupportedLanguage } from '../../types/global.ts';
import type { 
  ProblemWorkspacePaths, 
  WorkspacePathConfig, 
  WorkspacePaths 
} from './types.ts';
import { WORKSPACE_RULES } from './types.ts';
import { WorkspaceError, createErrorContext } from '../../utils/errors.ts';

/**
 * Get the main workspace directory structure
 * 
 * @param rootDir - The root directory of the workspace
 * @returns Object containing absolute paths to key workspace directories
 */
export function getWorkspacePaths(rootDir: string): WorkspacePaths {
  // Ensure we're working with an absolute path
  const absRoot = resolve(rootDir);
  
  return {
    root: absRoot,
    problems: join(absRoot, WORKSPACE_RULES.dirs.problems),
    completed: join(absRoot, WORKSPACE_RULES.dirs.completed),
    templates: join(absRoot, WORKSPACE_RULES.dirs.templates),
    config: join(absRoot, WORKSPACE_RULES.dirs.config),
  };
}

/**
 * Get the file extension for a given language
 * 
 * @param language - The programming language
 * @returns The file extension (including the dot)
 */
export function getFileExtension(language: SupportedLanguage): string {
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
 * 
 * @param language - The programming language
 * @returns The test file name including extension
 */
export function getTestFileName(language: SupportedLanguage): string {
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
 * @param language - The programming language
 * @returns The solution file name including extension
 */
export function getSolutionFileName(language: SupportedLanguage): string {
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
 * @param config - Workspace configuration
 * @param slug - The problem slug
 * @returns Object containing paths for all problem files
 */
export function getProblemPaths(
  config: WorkspacePathConfig,
  slug: string
): ProblemWorkspacePaths {
  const wsPaths = getWorkspacePaths(config.rootDir);
  const problemDir = join(wsPaths.problems, slug);
  return resolveProblemPaths(problemDir, config.language);
}

/**
 * Resolve paths for an archived/completed problem
 * 
 * @param config - Workspace configuration
 * @param slug - The problem slug
 * @returns Object containing paths for the problem in the completed directory
 */
export function getArchivedProblemPaths(
  config: WorkspacePathConfig,
  slug: string
): ProblemWorkspacePaths {
  const wsPaths = getWorkspacePaths(config.rootDir);
  const problemDir = join(wsPaths.completed, slug);
  return resolveProblemPaths(problemDir, config.language);
}

/**
 * Internal helper to resolve paths within a problem directory
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
 * @param workspaceRoot - The workspace root directory
 * @param path - The path to check
 * @returns True if the path is inside the workspace
 */
export function isPathInWorkspace(workspaceRoot: string, path: string): boolean {
  const absRoot = resolve(workspaceRoot);
  const absPath = resolve(path);
  return absPath.startsWith(absRoot);
}
