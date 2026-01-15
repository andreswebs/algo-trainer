/**
 * Standardized exit codes for the CLI
 *
 * Following POSIX conventions and best practices for CLI applications.
 * Exit codes provide meaningful information about why a command failed.
 *
 * @module cli/exit-codes
 */

/**
 * Standard exit codes for CLI commands
 *
 * Usage:
 * ```typescript
 * import { ExitCode, exitWithCode } from './exit-codes.ts';
 *
 * // Return from command
 * return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
 *
 * // Or exit immediately
 * exitWithCode(ExitCode.CONFIG_ERROR, 'Configuration file not found');
 * ```
 */
export const ExitCode = {
  /** Command completed successfully */
  SUCCESS: 0,

  /** General or unexpected error */
  GENERAL_ERROR: 1,

  /** Invalid arguments or incorrect command usage */
  USAGE_ERROR: 2,

  /** Configuration file issues or invalid settings */
  CONFIG_ERROR: 3,

  /** Workspace not initialized or invalid workspace structure */
  WORKSPACE_ERROR: 4,

  /** Problem not found or invalid problem identifier */
  PROBLEM_ERROR: 5,

  /** Network connectivity issues or API errors */
  NETWORK_ERROR: 6,

  /** File permission errors or access denied */
  PERMISSION_ERROR: 7,
} as const;

/**
 * Type for exit code values
 */
export type ExitCodeValue = typeof ExitCode[keyof typeof ExitCode];

/**
 * Exit immediately with the specified exit code and optional message
 *
 * This function logs the error message (if provided) and exits the process.
 * Use this for fatal errors that should immediately terminate the CLI.
 *
 * @param code - Exit code from ExitCode enum
 * @param message - Optional error message to display
 *
 * @example
 * ```typescript
 * if (!await isWorkspaceInitialized(workspace)) {
 *   exitWithCode(ExitCode.WORKSPACE_ERROR, 'Workspace not initialized. Run "at init" first.');
 * }
 * ```
 */
export function exitWithCode(code: ExitCodeValue, message?: string): never {
  if (message) {
    // Use stderr for error messages
    console.error(message);
  }
  Deno.exit(code);
}

/**
 * Map error types to exit codes
 *
 * This helps automatically determine the appropriate exit code
 * based on the error type thrown.
 *
 * @param error - The error object to map
 * @returns The appropriate exit code for this error type
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   const exitCode = getExitCodeForError(error);
 *   return { success: false, exitCode, error: error.message };
 * }
 * ```
 */
export function getExitCodeForError(error: unknown): ExitCodeValue {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const errorName = String((error as { name: string }).name);

    switch (errorName) {
      case 'ConfigError':
        return ExitCode.CONFIG_ERROR;
      case 'WorkspaceError':
        return ExitCode.WORKSPACE_ERROR;
      case 'ProblemError':
        return ExitCode.PROBLEM_ERROR;
      case 'NetworkError':
        return ExitCode.NETWORK_ERROR;
      case 'ValidationError':
        return ExitCode.USAGE_ERROR;
      case 'CommandError':
        return ExitCode.USAGE_ERROR;
      case 'FileSystemError': {
        // Check if it's a permission error
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes('permission') || message.includes('access denied') ||
            message.includes('eacces')
          ) {
            return ExitCode.PERMISSION_ERROR;
          }
        }
        return ExitCode.GENERAL_ERROR;
      }
      default:
        return ExitCode.GENERAL_ERROR;
    }
  }

  return ExitCode.GENERAL_ERROR;
}

/**
 * Get human-readable description for an exit code
 *
 * @param code - Exit code value
 * @returns Description of what the exit code means
 */
export function getExitCodeDescription(code: ExitCodeValue): string {
  switch (code) {
    case ExitCode.SUCCESS:
      return 'Command completed successfully';
    case ExitCode.GENERAL_ERROR:
      return 'General or unexpected error occurred';
    case ExitCode.USAGE_ERROR:
      return 'Invalid arguments or incorrect command usage';
    case ExitCode.CONFIG_ERROR:
      return 'Configuration file issues or invalid settings';
    case ExitCode.WORKSPACE_ERROR:
      return 'Workspace not initialized or invalid structure';
    case ExitCode.PROBLEM_ERROR:
      return 'Problem not found or invalid identifier';
    case ExitCode.NETWORK_ERROR:
      return 'Network connectivity issues or API errors';
    case ExitCode.PERMISSION_ERROR:
      return 'File permission errors or access denied';
    default:
      return 'Unknown error';
  }
}
