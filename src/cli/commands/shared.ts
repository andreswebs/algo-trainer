/**
 * Shared command utilities
 *
 * Common helper functions used across multiple CLI commands.
 * Provides workspace validation, problem manager initialization,
 * problem resolution, display formatting, and user confirmation.
 *
 * @module cli/commands/shared
 */

import type { Problem, WorkspaceStructure } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { getWorkspaceStructure, isWorkspaceInitialized, ProblemManager } from '../../core/mod.ts';
import { createErrorContext, ProblemError, WorkspaceError } from '../../utils/errors.ts';

/**
 * Validates that the workspace is initialized and returns its structure.
 *
 * This function checks if the workspace directory exists and is properly
 * initialized with all required subdirectories. If not initialized,
 * it throws a WorkspaceError with helpful instructions.
 *
 * @param workspaceRoot - Optional workspace root path. If not provided, uses config.
 * @returns Promise resolving to WorkspaceStructure with absolute paths
 * @throws {WorkspaceError} If workspace is not initialized
 *
 * @example
 * ```ts
 * try {
 *   const structure = await requireWorkspace();
 *   console.log(structure.problems); // /path/to/workspace/problems
 * } catch (error) {
 *   console.error('Workspace not initialized. Run "at init" first.');
 * }
 * ```
 */
export async function requireWorkspace(
  workspaceRoot?: string,
): Promise<WorkspaceStructure> {
  try {
    // Get workspace root from config if not provided
    const root = workspaceRoot || configManager.getConfig().workspace;

    // Check if workspace is initialized
    const initialized = await isWorkspaceInitialized(root);

    if (!initialized) {
      throw new WorkspaceError(
        'Workspace not initialized. Run "at init" to create workspace structure.',
        createErrorContext('requireWorkspace', {
          workspaceRoot: root,
          reason: 'not_initialized',
        }),
      );
    }

    // Return workspace structure
    return getWorkspaceStructure(root);
  } catch (error) {
    // If it's already a WorkspaceError, re-throw it
    if (error instanceof WorkspaceError) {
      throw error;
    }

    // Wrap other errors in WorkspaceError
    throw new WorkspaceError(
      `Failed to validate workspace: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('requireWorkspace', {
        workspaceRoot: workspaceRoot || 'config',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Initializes and returns a ProblemManager instance.
 *
 * This function creates a new ProblemManager, initializes it with the problem
 * database, and returns the ready-to-use instance. It handles initialization
 * errors gracefully.
 *
 * @returns Promise resolving to initialized ProblemManager instance
 * @throws {ProblemError} If initialization fails
 *
 * @example
 * ```ts
 * const manager = await requireProblemManager();
 * const problem = manager.getBySlug('two-sum');
 * ```
 */
export async function requireProblemManager(): Promise<ProblemManager> {
  try {
    const manager = new ProblemManager();
    await manager.init();
    return manager;
  } catch (error) {
    throw new ProblemError(
      `Failed to initialize problem database. Ensure the problem data files are accessible and properly formatted.`,
      createErrorContext('requireProblemManager', {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Resolves a problem by identifier (ID, slug, or 'current').
 *
 * This function provides flexible problem resolution:
 * - If identifier is a number or numeric string, treats it as an ID
 * - If identifier is a non-numeric string, treats it as a slug
 * - If identifier is 'current', attempts to detect current problem from workspace
 * - If identifier is undefined, defaults to 'current'
 *
 * @param identifier - Problem ID, slug, or 'current'. If undefined, defaults to 'current'.
 * @param manager - Initialized ProblemManager instance
 * @param _workspaceRoot - Reserved for future 'current' problem detection (unused)
 * @returns Problem if found, null otherwise
 *
 * @example
 * ```ts
 * const manager = await requireProblemManager();
 *
 * // By slug
 * const problem1 = resolveProblem('two-sum', manager);
 *
 * // By ID
 * const problem2 = resolveProblem('1', manager);
 *
 * // Current problem (auto-detect from workspace)
 * const problem3 = resolveProblem('current', manager);
 * ```
 */
export function resolveProblem(
  identifier: string | number | undefined,
  manager: ProblemManager,
  _workspaceRoot?: string,
): Problem | null {
  // Default to 'current' if no identifier provided
  if (identifier === undefined || identifier === 'current') {
    // FUTURE ENHANCEMENT(CLI-001): Auto-detect current problem from workspace
    // This feature would scan the workspace to identify the active problem based on:
    // - Most recently modified problem directory
    // - Presence of a .current marker file
    // - Workspace state tracking
    // Decision: Deferred to post-v1.0 as explicit problem identifiers work well
    return null;
  }

  // Try to resolve by ID if numeric
  const idAsString = String(identifier);
  if (/^\d+$/.test(idAsString)) {
    const problem = manager.getById(idAsString);
    if (problem) {
      return problem;
    }
  }

  // Try to resolve by slug
  return manager.getBySlug(idAsString);
}

/**
 * Formats a problem summary for consistent display.
 *
 * Creates a human-readable summary of a problem including:
 * - Title and difficulty
 * - Problem ID and slug
 * - Categories/tags
 * - Brief description (truncated if too long)
 *
 * @param problem - Problem to format
 * @param options - Display options
 * @returns Formatted string for display
 *
 * @example
 * ```ts
 * const problem = manager.getBySlug('two-sum');
 * const summary = formatProblemSummary(problem);
 * console.log(summary);
 * // Output:
 * // Two Sum (easy)
 * // ID: 1 | Slug: two-sum
 * // Tags: array, hash-table
 * // Description: Given an array...
 * ```
 */
export function formatProblemSummary(
  problem: Problem,
  options: { verbose?: boolean } = {},
): string {
  const lines: string[] = [];

  // Title with difficulty badge
  const difficultyBadge = problem.difficulty.toUpperCase();
  lines.push(`${problem.title} [${difficultyBadge}]`);

  // ID and slug
  lines.push(`ID: ${problem.id} | Slug: ${problem.slug}`);

  // Tags
  if (problem.tags && problem.tags.length > 0) {
    lines.push(`Tags: ${problem.tags.join(', ')}`);
  }

  // Description (truncated unless verbose)
  if (options.verbose) {
    lines.push('');
    lines.push('Description:');
    lines.push(problem.description);
  } else {
    // Truncate description to first 100 characters
    const truncated = problem.description.length > 100
      ? problem.description.substring(0, 100) + '...'
      : problem.description;
    lines.push('');
    lines.push(truncated);
  }

  // Examples count
  if (problem.examples && problem.examples.length > 0) {
    lines.push('');
    lines.push(`Examples: ${problem.examples.length}`);
  }

  // Hints count
  if (problem.hints && problem.hints.length > 0) {
    lines.push(`Hints available: ${problem.hints.length}`);
  }

  return lines.join('\n');
}

/**
 * Prompts user for yes/no confirmation.
 *
 * Displays a confirmation message and waits for user input.
 * Accepts 'y', 'yes', 'Y', 'YES' for confirmation.
 * Accepts 'n', 'no', 'N', 'NO' for rejection.
 * Any other input is treated as rejection.
 *
 * @param message - Confirmation message to display
 * @param defaultValue - Default value if user just presses Enter (default: false)
 * @returns Promise resolving to true if confirmed, false otherwise
 *
 * @example
 * ```ts
 * const confirmed = await confirmAction('Overwrite existing files?');
 * if (confirmed) {
 *   // Proceed with overwrite
 * } else {
 *   // Cancel operation
 * }
 * ```
 */
export async function confirmAction(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  // Format prompt with default indicator
  const defaultIndicator = defaultValue ? '[Y/n]' : '[y/N]';
  const prompt = `${message} ${defaultIndicator}: `;

  // Write prompt to stderr (for user interaction)
  await Deno.stderr.write(new TextEncoder().encode(prompt));

  // Read user input from stdin
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);

  if (n === null) {
    // EOF or error, return default
    return defaultValue;
  }

  // Parse input
  const input = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();

  // Empty input means use default
  if (input === '') {
    return defaultValue;
  }

  // Check for positive confirmation
  if (input === 'y' || input === 'yes') {
    return true;
  }

  // Check for negative confirmation
  if (input === 'n' || input === 'no') {
    return false;
  }

  // Any other input is treated as negative
  return false;
}
