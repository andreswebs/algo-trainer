/**
 * Workspace manager for the Problem Management System.
 *
 * Implements workspace initialization and structure creation as defined in PMS-014.
 * Provides operations for creating and validating workspace directories.
 *
 * ## Responsibilities
 *
 * - Create and initialize workspace directory structure
 * - Validate workspace directories exist and are accessible
 * - Provide workspace structure information
 * - Handle errors with proper context
 *
 * @module core/workspace/manager
 *
 * @example
 * ```ts
 * import { initWorkspace, getWorkspaceStructure } from './workspace/manager.ts';
 *
 * // Initialize a new workspace
 * await initWorkspace('/home/user/my-workspace');
 *
 * // Get workspace structure
 * const structure = getWorkspaceStructure('/home/user/my-workspace');
 * console.log(structure.problems); // /home/user/my-workspace/problems
 * ```
 */

import type { WorkspaceStructure } from '../../types/global.ts';
import { createErrorContext, WorkspaceError } from '../../utils/errors.ts';
import { createDirectory, pathExists } from '../../utils/fs.ts';
import { getWorkspacePaths } from './files.ts';

/**
 * Get the workspace structure for a given root directory
 *
 * Returns a WorkspaceStructure object with absolute paths to all
 * key workspace directories. This function does NOT create directories;
 * it only resolves and returns the paths.
 *
 * @param root - The root directory of the workspace (can be relative or absolute)
 * @returns WorkspaceStructure object with paths to workspace directories
 * @throws {ValidationError} If root is invalid (thrown by getWorkspacePaths)
 *
 * @example
 * ```ts
 * const structure = getWorkspaceStructure('./my-workspace');
 * console.log(structure.root);      // /absolute/path/to/my-workspace
 * console.log(structure.problems);  // /absolute/path/to/my-workspace/problems
 * console.log(structure.completed); // /absolute/path/to/my-workspace/completed
 * ```
 */
export function getWorkspaceStructure(root: string): WorkspaceStructure {
  const paths = getWorkspacePaths(root);

  // Convert WorkspacePaths to WorkspaceStructure
  // Both interfaces have the same shape, but WorkspaceStructure is the
  // type used in the global types, while WorkspacePaths is workspace-specific
  const structure: WorkspaceStructure = {
    root: paths.root,
    problems: paths.problems,
    completed: paths.completed,
    templates: paths.templates,
    config: paths.config,
  };

  return structure;
}

/**
 * Initialize a workspace by creating all required directories
 *
 * Creates the workspace directory structure including:
 * - Root directory
 * - Problems directory (for active problems)
 * - Completed directory (for archived/completed problems)
 * - Templates directory (for user templates)
 * - Config directory (for workspace configuration)
 *
 * This operation is idempotent - it's safe to call multiple times.
 * If directories already exist, they will not be modified.
 *
 * @param root - The root directory of the workspace (can be relative or absolute)
 * @returns Promise that resolves when all directories are created
 * @throws {ValidationError} If root is invalid
 * @throws {WorkspaceError} If directory creation fails
 *
 * @example
 * ```ts
 * // Initialize a new workspace
 * await initWorkspace('./my-workspace');
 *
 * // Safe to call again - won't fail if directories exist
 * await initWorkspace('./my-workspace');
 * ```
 */
export async function initWorkspace(root: string): Promise<void> {
  try {
    // Get workspace structure (validates root directory)
    const structure = getWorkspaceStructure(root);

    // Create all required directories
    // These operations are idempotent - won't fail if directories exist
    const directories = [
      structure.root,
      structure.problems,
      structure.completed,
      structure.templates,
      structure.config,
    ];

    // Create directories in order
    // Using sequential creation to ensure parent is created before children
    // (though createDirectory uses ensureDir which handles this)
    for (const dir of directories) {
      await createDirectory(dir);
    }
  } catch (error) {
    // If it's a ValidationError, let it propagate (from getWorkspaceStructure)
    if (error instanceof Error && error.name === 'ValidationError') {
      throw error;
    }

    // Otherwise, wrap in WorkspaceError
    throw new WorkspaceError(
      `Failed to initialize workspace: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('initWorkspace', {
        root,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Check if a workspace is already initialized
 *
 * A workspace is considered initialized if all required directories exist.
 * This does not validate the contents of those directories.
 *
 * @param root - The root directory of the workspace (can be relative or absolute)
 * @returns Promise that resolves to true if workspace is initialized, false otherwise
 * @throws {ValidationError} If root is invalid
 *
 * @example
 * ```ts
 * const isInit = await isWorkspaceInitialized('./my-workspace');
 * if (!isInit) {
 *   await initWorkspace('./my-workspace');
 * }
 * ```
 */
export async function isWorkspaceInitialized(root: string): Promise<boolean> {
  try {
    // Get workspace structure (validates root directory)
    const structure = getWorkspaceStructure(root);

    // Check if all required directories exist
    const directories = [
      structure.root,
      structure.problems,
      structure.completed,
      structure.templates,
      structure.config,
    ];

    // Check all directories exist
    for (const dir of directories) {
      if (!(await pathExists(dir))) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // If it's a ValidationError, let it propagate
    if (error instanceof Error && error.name === 'ValidationError') {
      throw error;
    }

    // For other errors, throw WorkspaceError
    throw new WorkspaceError(
      `Failed to check workspace initialization: ${
        error instanceof Error ? error.message : String(error)
      }`,
      createErrorContext('isWorkspaceInitialized', {
        root,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Validate workspace structure
 *
 * Checks that all required directories exist and are accessible.
 * More thorough than isWorkspaceInitialized - verifies directory permissions.
 *
 * @param root - The root directory of the workspace (can be relative or absolute)
 * @returns Promise that resolves if workspace is valid
 * @throws {ValidationError} If root is invalid
 * @throws {WorkspaceError} If workspace structure is invalid or inaccessible
 *
 * @example
 * ```ts
 * try {
 *   await validateWorkspace('./my-workspace');
 *   console.log('Workspace is valid');
 * } catch (error) {
 *   console.error('Workspace validation failed:', error.message);
 * }
 * ```
 */
export async function validateWorkspace(root: string): Promise<void> {
  try {
    // Get workspace structure (validates root directory)
    const structure = getWorkspaceStructure(root);

    // Check if all required directories exist
    const directories = [
      { path: structure.root, name: 'root' },
      { path: structure.problems, name: 'problems' },
      { path: structure.completed, name: 'completed' },
      { path: structure.templates, name: 'templates' },
      { path: structure.config, name: 'config' },
    ];

    const missingDirs: string[] = [];

    for (const { path, name } of directories) {
      if (!(await pathExists(path))) {
        missingDirs.push(name);
      }
    }

    if (missingDirs.length > 0) {
      throw new WorkspaceError(
        `Workspace is not properly initialized. Missing directories: ${missingDirs.join(', ')}`,
        createErrorContext('validateWorkspace', {
          root,
          missingDirectories: missingDirs,
        }),
      );
    }

    // Additional validation: verify directories are actually directories
    // and are accessible
    for (const { path, name } of directories) {
      try {
        const stat = await Deno.stat(path);
        if (!stat.isDirectory) {
          throw new WorkspaceError(
            `Workspace path exists but is not a directory: ${name}`,
            createErrorContext('validateWorkspace', {
              root,
              invalidPath: path,
              pathName: name,
            }),
          );
        }
      } catch (error) {
        if (error instanceof WorkspaceError) {
          throw error;
        }
        throw new WorkspaceError(
          `Cannot access workspace directory: ${name}`,
          createErrorContext('validateWorkspace', {
            root,
            directory: name,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  } catch (error) {
    // If it's already a WorkspaceError or ValidationError, let it propagate
    if (
      error instanceof Error &&
      (error.name === 'WorkspaceError' || error.name === 'ValidationError')
    ) {
      throw error;
    }

    // Otherwise, wrap in WorkspaceError
    throw new WorkspaceError(
      `Failed to validate workspace: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('validateWorkspace', {
        root,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
