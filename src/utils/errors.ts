/**
 * Standardized error handling system
 *
 * Provides consistent error types and handling throughout the application.
 * All errors include proper context and actionable information.
 *
 * @module utils/errors
 */

/**
 * Base error class for all application errors
 */
export abstract class AlgoTrainerError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
  }

  /**
   * Get a formatted error message with context
   */
  public getFormattedMessage(): string {
    let message = `${this.code}: ${this.message}`;

    if (this.context && Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(", ");
      message += ` (${contextStr})`;
    }

    return message;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFIG_ERROR", context);
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "FS_ERROR", context);
  }
}

/**
 * Problem-related errors
 */
export class ProblemError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "PROBLEM_ERROR", context);
  }
}

/**
 * Workspace-related errors
 */
export class WorkspaceError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "WORKSPACE_ERROR", context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", context);
  }
}

/**
 * CLI command errors
 */
export class CommandError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "COMMAND_ERROR", context);
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", context);
  }
}

/**
 * Template generation errors
 */
export class TemplateError extends AlgoTrainerError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "TEMPLATE_ERROR", context);
  }
}

/**
 * Error context for better debugging
 */
export interface ErrorContext extends Record<string, unknown> {
  operation?: string;
  file?: string;
  line?: number;
  userId?: string;
  timestamp?: Date;
  version?: string;
  platform?: string;
}

/**
 * Create error context with common information
 */
export function createErrorContext(
  operation: string,
  additional?: Record<string, unknown>
): ErrorContext {
  let platform = "unknown";
  try {
    // @ts-ignore: Deno may not be available in all environments
    platform = Deno.build.os;
  } catch {
    // Fallback for non-Deno environments
    platform = "unknown";
  }

  return {
    operation,
    timestamp: new Date(),
    platform,
    version: "2.0.0", // TODO(#1): Get from package.json equivalent
    ...additional,
  };
}

/**
 * Type guard to check if an error is an AlgoTrainerError
 */
export function isAlgoTrainerError(error: unknown): error is AlgoTrainerError {
  return error instanceof AlgoTrainerError;
}

/**
 * Format any error for display
 */
export function formatError(error: unknown): string {
  if (isAlgoTrainerError(error)) {
    return error.getFormattedMessage();
  }

  if (error instanceof Error) {
    return `UNKNOWN_ERROR: ${error.message}`;
  }

  return `UNKNOWN_ERROR: ${String(error)}`;
}
