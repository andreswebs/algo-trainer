/**
 * Workspace management module for the Problem Management System.
 *
 * This module provides workspace layout definitions, path resolution utilities,
 * and file management capabilities for problem workspaces.
 *
 * @module core/workspace
 */

// Types and constants
export {
  // Directory constants
  WORKSPACE_DIRS,
  WORKSPACE_CONFIG_FILE,
  WORKSPACE_PROGRESS_FILE,

  // Per-problem file constants
  PROBLEM_FILES,
  LANGUAGE_EXTENSIONS,
  TEST_FILE_PATTERNS,

  // Conflict policy
  DEFAULT_CONFLICT_POLICY,
  BACKUP_SUFFIX_FORMAT,
  DEFAULT_FILE_GENERATION_OPTIONS,

  // Path resolution functions
  createWorkspaceStructure,
  getProblemDirectory,
  getSolutionFileName,
  getTestFileName,
  getProblemWorkspacePaths,
  getWorkspaceConfigPath,
  getProgressFilePath,
  getBackupFileName,

  // Validation helpers
  isValidSlug,
  validateWorkspaceStructure,
} from './types.ts';

// Type exports
export type {
  ProblemPathInfo,
  ProblemWorkspacePaths,
  ProblemLocation,
  ConflictPolicy,
  FileGenerationOptions,
} from './types.ts';
