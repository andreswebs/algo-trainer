/**
 * CLI type definitions
 *
 * Types specific to the CLI interface.
 *
 * @module cli/types
 */

import type { CommandResult } from "../types/global.ts";

/**
 * CLI command definition
 */
export interface Command {
  /** Command name */
  name: string;
  /** Command aliases */
  aliases?: string[];
  /** Short description */
  description: string;
  /** Detailed usage information */
  usage?: string;
  /** Command examples */
  examples?: string[];
  /** Command flags */
  flags?: Flag[];
  /** Subcommands */
  subcommands?: Command[];
  /** Command handler function */
  handler: (args: CommandArgs) => Promise<CommandResult>;
}

/**
 * CLI flag definition
 */
export interface Flag {
  /** Flag name (without dashes) */
  name: string;
  /** Short flag alias */
  short?: string;
  /** Flag description */
  description: string;
  /** Flag type */
  type: "boolean" | "string" | "number";
  /** Default value */
  default?: unknown;
  /** Whether the flag is required */
  required?: boolean;
  /** Allowed values (for validation) */
  choices?: string[];
}

/**
 * Parsed command arguments
 */
export interface CommandArgs {
  /** Command name */
  command: string;
  /** Subcommand name (if any) */
  subcommand?: string;
  /** Positional arguments */
  args: string[];
  /** Flag values */
  flags: Record<string, unknown>;
}

/**
 * CLI context
 */
export interface CliContext {
  /** Current working directory */
  cwd: string;
  /** Environment variables */
  env: Record<string, string>;
  /** CLI version */
  version: string;
  /** Whether running in CI/automated mode */
  ci: boolean;
}
