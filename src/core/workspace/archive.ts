/**
 * Archive and restore operations for problems (PMS-016)
 *
 * Provides functionality to move problems between the active problems directory
 * and the completed/archived directory. Implements collision handling with
 * timestamp suffixes.
 *
 * ## Features
 *
 * - Archive active problems to completed directory (move operation)
 * - Restore archived problems back to active directory
 * - Collision handling with automatic timestamp suffix
 * - Metadata preservation during moves
 * - Validation and error handling
 *
 * ## Semantics
 *
 * - **Move operation**: Files are moved, not copied (original is removed)
 * - **Collision handling**: Timestamp suffix added if destination exists
 * - **Idempotent**: Safe to call multiple times
 *
 * @module core/workspace/archive
 *
 * @example
 * ```ts
 * import { archiveProblem, unarchiveProblem } from './workspace/archive.ts';
 *
 * // Archive an active problem
 * const result = await archiveProblem({
 *   workspaceRoot: '/home/user/workspace',
 *   slug: 'two-sum',
 *   language: 'typescript',
 * });
 *
 * console.log(result.archivedTo); // /home/user/workspace/completed/two-sum
 *
 * // Restore it back
 * await unarchiveProblem({
 *   workspaceRoot: '/home/user/workspace',
 *   slug: 'two-sum',
 *   language: 'typescript',
 * });
 * ```
 */

import { join } from '@std/path';
import type { SupportedLanguage } from '../../types/global.ts';
import { createErrorContext, WorkspaceError } from '../../utils/errors.ts';
import { pathExists } from '../../utils/fs.ts';
import { getArchivedProblemPaths, getProblemPaths } from './files.ts';
import type { WorkspacePathConfig } from './types.ts';

/**
 * Options for archiving a problem
 */
export interface ArchiveProblemOptions {
  /** Workspace root directory */
  workspaceRoot: string;
  /** Problem slug */
  slug: string;
  /** Programming language */
  language: SupportedLanguage;
  /**
   * Collision handling strategy
   * - 'timestamp': Add timestamp suffix if destination exists (default)
   * - 'overwrite': Overwrite existing archived problem
   * - 'error': Throw error if destination exists
   */
  onCollision?: 'timestamp' | 'overwrite' | 'error';
}

/**
 * Result of archiving a problem
 */
export interface ArchiveResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Original problem directory path */
  from: string;
  /** Destination (archived) directory path */
  archivedTo: string;
  /** Whether a collision was handled (timestamp added) */
  collisionHandled: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Options for restoring an archived problem
 */
export interface UnarchiveProblemOptions {
  /** Workspace root directory */
  workspaceRoot: string;
  /** Problem slug (or slug with timestamp suffix) */
  slug: string;
  /** Programming language */
  language: SupportedLanguage;
  /**
   * Collision handling strategy
   * - 'timestamp': Add timestamp suffix if destination exists (default)
   * - 'overwrite': Overwrite existing active problem
   * - 'error': Throw error if destination exists
   */
  onCollision?: 'timestamp' | 'overwrite' | 'error';
}

/**
 * Result of restoring an archived problem
 */
export interface UnarchiveResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Original archived directory path */
  from: string;
  /** Destination (active) directory path */
  restoredTo: string;
  /** Whether a collision was handled (timestamp added) */
  collisionHandled: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Generate a timestamp suffix for collision handling
 *
 * Format: YYYYMMDD-HHMMSS
 *
 * @returns Timestamp string suitable for use as a directory suffix
 *
 * @example
 * ```ts
 * generateTimestampSuffix(); // '20260114-143045'
 * ```
 */
function generateTimestampSuffix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Move a directory and all its contents
 *
 * This is a wrapper around Deno.rename that provides better error handling.
 *
 * @param from - Source directory path
 * @param to - Destination directory path
 * @throws {WorkspaceError} If move operation fails
 *
 * @internal
 */
async function moveDirectory(from: string, to: string): Promise<void> {
  try {
    await Deno.rename(from, to);
  } catch (error) {
    throw new WorkspaceError(
      `Failed to move directory: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('moveDirectory', {
        from,
        to,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Archive an active problem to the completed directory
 *
 * Moves a problem folder from the active problems directory to the completed
 * directory. If a problem with the same slug already exists in the completed
 * directory, the collision is handled according to the `onCollision` strategy.
 *
 * The default strategy is to add a timestamp suffix to avoid data loss.
 *
 * @param options - Archive options
 * @returns Result containing the destination path and collision information
 * @throws {WorkspaceError} If the problem doesn't exist or move fails
 *
 * @example
 * ```ts
 * // Archive with default collision handling (timestamp)
 * const result = await archiveProblem({
 *   workspaceRoot: '/workspace',
 *   slug: 'two-sum',
 *   language: 'typescript',
 * });
 *
 * // Archive with overwrite
 * const result = await archiveProblem({
 *   workspaceRoot: '/workspace',
 *   slug: 'two-sum',
 *   language: 'typescript',
 *   onCollision: 'overwrite',
 * });
 * ```
 */
export async function archiveProblem(
  options: ArchiveProblemOptions,
): Promise<ArchiveResult> {
  const {
    workspaceRoot,
    slug,
    language,
    onCollision = 'timestamp',
  } = options;

  try {
    // Get source and destination paths
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };

    const sourcePaths = getProblemPaths(config, slug);
    const destinationPaths = getArchivedProblemPaths(config, slug);

    // Check if source exists
    const sourceExists = await pathExists(sourcePaths.dir);
    if (!sourceExists) {
      throw new WorkspaceError(
        `Problem not found in active directory: ${slug}`,
        createErrorContext('archiveProblem', {
          slug,
          sourcePath: sourcePaths.dir,
        }),
      );
    }

    // Check if destination exists
    const destinationExists = await pathExists(destinationPaths.dir);
    let finalDestination = destinationPaths.dir;
    let collisionHandled = false;

    if (destinationExists) {
      if (onCollision === 'error') {
        throw new WorkspaceError(
          `Archived problem already exists: ${slug}`,
          createErrorContext('archiveProblem', {
            slug,
            destinationPath: destinationPaths.dir,
          }),
        );
      } else if (onCollision === 'overwrite') {
        // Remove existing archived problem
        await Deno.remove(destinationPaths.dir, { recursive: true });
      } else {
        // onCollision === 'timestamp'
        // Add timestamp suffix to avoid collision
        // Keep trying with new timestamps until we find one that doesn't exist
        let attempts = 0;
        const maxAttempts = 100;
        while (attempts < maxAttempts) {
          const timestamp = generateTimestampSuffix();
          const slugWithTimestamp = `${slug}-${timestamp}`;
          const destinationWithTimestamp = getArchivedProblemPaths(config, slugWithTimestamp);
          const timestampedExists = await pathExists(destinationWithTimestamp.dir);
          
          if (!timestampedExists) {
            finalDestination = destinationWithTimestamp.dir;
            collisionHandled = true;
            break;
          }
          
          // Wait 1ms before trying again to ensure different timestamp
          await new Promise((resolve) => setTimeout(resolve, 1));
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new WorkspaceError(
            `Could not find unique timestamp suffix after ${maxAttempts} attempts`,
            createErrorContext('archiveProblem', {
              slug,
              destinationPath: destinationPaths.dir,
            }),
          );
        }
      }
    }

    // Move the directory
    await moveDirectory(sourcePaths.dir, finalDestination);

    return {
      success: true,
      from: sourcePaths.dir,
      archivedTo: finalDestination,
      collisionHandled,
    };
  } catch (error) {
    // If it's already a WorkspaceError, let it propagate
    if (error instanceof WorkspaceError) {
      throw error;
    }

    // Otherwise, wrap in WorkspaceError
    throw new WorkspaceError(
      `Failed to archive problem: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('archiveProblem', {
        slug,
        language,
        workspaceRoot,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Restore an archived problem to the active directory
 *
 * Moves a problem folder from the completed directory back to the active
 * problems directory. If a problem with the same slug already exists in the
 * active directory, the collision is handled according to the `onCollision` strategy.
 *
 * The default strategy is to add a timestamp suffix to avoid data loss.
 *
 * Note: The slug parameter can include a timestamp suffix if the archived
 * problem was renamed during a previous archive operation.
 *
 * @param options - Unarchive options
 * @returns Result containing the destination path and collision information
 * @throws {WorkspaceError} If the archived problem doesn't exist or move fails
 *
 * @example
 * ```ts
 * // Restore a simple archived problem
 * const result = await unarchiveProblem({
 *   workspaceRoot: '/workspace',
 *   slug: 'two-sum',
 *   language: 'typescript',
 * });
 *
 * // Restore a problem that was archived with a timestamp
 * const result = await unarchiveProblem({
 *   workspaceRoot: '/workspace',
 *   slug: 'two-sum-20260114-143045',
 *   language: 'typescript',
 * });
 * ```
 */
export async function unarchiveProblem(
  options: UnarchiveProblemOptions,
): Promise<UnarchiveResult> {
  const {
    workspaceRoot,
    slug,
    language,
    onCollision = 'timestamp',
  } = options;

  try {
    // Get source and destination paths
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };

    // For unarchive, source is in archived directory
    const sourcePaths = getArchivedProblemPaths(config, slug);

    // Extract base slug (remove timestamp if present)
    // Timestamp format: slug-YYYYMMDD-HHMMSS
    const timestampPattern = /-\d{8}-\d{6}$/;
    const baseSlug = slug.replace(timestampPattern, '');

    // Destination is in problems directory (using base slug)
    const destinationPaths = getProblemPaths(config, baseSlug);

    // Check if source exists
    const sourceExists = await pathExists(sourcePaths.dir);
    if (!sourceExists) {
      throw new WorkspaceError(
        `Archived problem not found: ${slug}`,
        createErrorContext('unarchiveProblem', {
          slug,
          sourcePath: sourcePaths.dir,
        }),
      );
    }

    // Check if destination exists
    const destinationExists = await pathExists(destinationPaths.dir);
    let finalDestination = destinationPaths.dir;
    let collisionHandled = false;

    if (destinationExists) {
      if (onCollision === 'error') {
        throw new WorkspaceError(
          `Active problem already exists: ${baseSlug}`,
          createErrorContext('unarchiveProblem', {
            slug: baseSlug,
            destinationPath: destinationPaths.dir,
          }),
        );
      } else if (onCollision === 'overwrite') {
        // Remove existing active problem
        await Deno.remove(destinationPaths.dir, { recursive: true });
      } else {
        // onCollision === 'timestamp'
        // Add timestamp suffix to avoid collision
        // Keep trying with new timestamps until we find one that doesn't exist
        let attempts = 0;
        const maxAttempts = 100;
        while (attempts < maxAttempts) {
          const timestamp = generateTimestampSuffix();
          const slugWithTimestamp = `${baseSlug}-${timestamp}`;
          const destinationWithTimestamp = getProblemPaths(config, slugWithTimestamp);
          const timestampedExists = await pathExists(destinationWithTimestamp.dir);
          
          if (!timestampedExists) {
            finalDestination = destinationWithTimestamp.dir;
            collisionHandled = true;
            break;
          }
          
          // Wait 1ms before trying again to ensure different timestamp
          await new Promise((resolve) => setTimeout(resolve, 1));
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new WorkspaceError(
            `Could not find unique timestamp suffix after ${maxAttempts} attempts`,
            createErrorContext('unarchiveProblem', {
              slug: baseSlug,
              destinationPath: destinationPaths.dir,
            }),
          );
        }
      }
    }

    // Move the directory
    await moveDirectory(sourcePaths.dir, finalDestination);

    return {
      success: true,
      from: sourcePaths.dir,
      restoredTo: finalDestination,
      collisionHandled,
    };
  } catch (error) {
    // If it's already a WorkspaceError, let it propagate
    if (error instanceof WorkspaceError) {
      throw error;
    }

    // Otherwise, wrap in WorkspaceError
    throw new WorkspaceError(
      `Failed to unarchive problem: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('unarchiveProblem', {
        slug,
        language,
        workspaceRoot,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Check if a problem exists in the archived directory
 *
 * @param workspaceRoot - Workspace root directory
 * @param slug - Problem slug (can include timestamp suffix)
 * @param language - Programming language
 * @returns True if the archived problem exists, false otherwise
 *
 * @example
 * ```ts
 * const exists = await isArchived('/workspace', 'two-sum', 'typescript');
 * if (exists) {
 *   console.log('Problem is archived');
 * }
 * ```
 */
export async function isArchived(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
): Promise<boolean> {
  try {
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };
    const paths = getArchivedProblemPaths(config, slug);
    return await pathExists(paths.dir);
  } catch (_error) {
    // If there's an error checking, assume it doesn't exist
    return false;
  }
}

/**
 * List all archived problems in the workspace
 *
 * Scans the completed directory and returns the slugs of all archived problems.
 *
 * @param workspaceRoot - Workspace root directory
 * @returns Array of problem slugs (including timestamp suffixes if present)
 *
 * @example
 * ```ts
 * const archived = await listArchivedProblems('/workspace');
 * console.log(archived); // ['two-sum', 'add-two-numbers-20260114-143045']
 * ```
 */
export async function listArchivedProblems(workspaceRoot: string): Promise<string[]> {
  try {
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language: 'typescript', // Language doesn't matter for listing directories
    };
    const archivedPaths = getArchivedProblemPaths(config, 'dummy');
    const completedDir = join(archivedPaths.dir, '..');

    // Check if completed directory exists
    const exists = await pathExists(completedDir);
    if (!exists) {
      return [];
    }

    // List all directories in completed
    const entries: string[] = [];
    for await (const entry of Deno.readDir(completedDir)) {
      if (entry.isDirectory) {
        entries.push(entry.name);
      }
    }

    return entries.sort();
  } catch (_error) {
    // If there's an error listing, return empty array
    return [];
  }
}
