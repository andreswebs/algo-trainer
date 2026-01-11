/**
 * CLI type definitions
 *
 * Types specific to the CLI interface, aligned with @std/cli parseArgs.
 *
 * @module cli/types
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../types/global.ts';

/**
 * Handler function for a CLI command
 */
export type CommandHandler = (args: Args) => Promise<CommandResult>;

/**
 * CLI command definition
 */
export interface CommandDefinition {
  /** Command name */
  name: string;
  /** Command aliases */
  aliases?: string[] | undefined;
  /** Short description */
  description: string;
  /** Detailed usage information */
  usage?: string | undefined;
  /** Command examples */
  examples?: string[] | undefined;
  /** Command handler function */
  handler: CommandHandler;
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

/**
 * Parse args options configuration
 */
export interface ParseArgsConfig {
  alias: Record<string, string>;
  boolean: string[];
  string: string[];
  negatable: string[];
  default: Record<string, unknown>;
}

/**
 * Global CLI flags that apply to all commands
 */
export interface GlobalFlags {
  help: boolean;
  version: boolean;
  verbose: boolean;
  quiet: boolean;
  config: string | undefined;
  color: boolean;
  emoji: boolean;
}

/**
 * Extract global flags from parsed args
 */
export function extractGlobalFlags(args: Args): GlobalFlags {
  return {
    help: Boolean(args.help),
    version: Boolean(args.version),
    verbose: Boolean(args.verbose),
    quiet: Boolean(args.quiet),
    config: args.config as string | undefined,
    color: args.color !== false,
    emoji: args.emoji !== false,
  };
}
