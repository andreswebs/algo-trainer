/**
 * Main CLI entry point
 *
 * Entry point for the Algo Trainer CLI application.
 *
 * @module cli/main
 */

import { exitWithError, logError, logSuccess, setOutputOptions } from '../utils/output.ts';
import { formatError } from '../utils/errors.ts';
import { initializeConfig } from '../config/manager.ts';
import type { CommandArgs } from './types.ts';

/**
 * Application version
 */
const VERSION = '2.0.0';

/**
 * Simple argument parser
 */
function parseArguments(args: string[]): {
  flags: Record<string, boolean | string>;
  positional: string[];
} {
  const flags: Record<string, boolean | string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      if (flagName.includes('=')) {
        const [name, value] = flagName.split('=', 2);
        flags[name] = value;
      } else {
        // Check if next arg is a value
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[flagName] = nextArg;
          i++; // Skip next arg
        } else {
          flags[flagName] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const flagName = arg.slice(1);
      if (flagName === 'h') flags.help = true;
      else if (flagName === 'v') flags.version = true;
      else if (flagName === 'c') {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags.config = nextArg;
          i++;
        } else {
          flags.config = true;
        }
      } else {
        flags[flagName] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

/**
 * Main CLI function
 */
export async function main(args: string[] = []): Promise<void> {
  try {
    // Parse command line arguments
    const parsed = parseArguments(args);

    // Handle global flags
    if (parsed.flags.version) {
      console.log(`Algo Trainer v${VERSION}`);
      return;
    }

    // Set output options based on flags
    setOutputOptions({
      useColors: !parsed.flags['no-color'],
      useEmoji: !parsed.flags['no-emoji'],
      verbosity: parsed.flags.verbose ? 'verbose' : parsed.flags.quiet ? 'quiet' : 'normal',
    });

    if (parsed.flags.help || parsed.positional.length === 0) {
      showHelp();
      return;
    }

    // Initialize configuration
    await initializeConfig();

    // Extract command and arguments
    const command = parsed.positional[0];
    const subcommand = parsed.positional.length > 1 ? parsed.positional[1] : undefined;
    const remainingArgs = parsed.positional.slice(subcommand ? 2 : 1);

    const commandArgs: CommandArgs = {
      command,
      args: remainingArgs,
      flags: {
        verbose: parsed.flags.verbose || false,
        quiet: parsed.flags.quiet || false,
        'no-color': parsed.flags['no-color'] || false,
        'no-emoji': parsed.flags['no-emoji'] || false,
        config: parsed.flags.config,
      },
    };

    // Add subcommand if present
    if (subcommand !== undefined) {
      commandArgs.subcommand = subcommand;
    }

    // Route to appropriate command handler
    const result = routeCommand(commandArgs);

    if (!result.success) {
      exitWithError(result.error || 'Command failed', result.exitCode);
    }
  } catch (error) {
    const errorMessage = formatError(error);
    logError('Unexpected error occurred', errorMessage);
    Deno.exit(1);
  }
}

/**
 * Route command to appropriate handler
 */
function routeCommand(
  args: CommandArgs,
): { success: boolean; error?: string; exitCode: number } {
  switch (args.command) {
    case 'challenge':
      logSuccess(`Challenge command called with args: ${JSON.stringify(args)}`);
      return { success: true, exitCode: 0 };

    case 'complete':
      logSuccess(`Complete command called with args: ${JSON.stringify(args)}`);
      return { success: true, exitCode: 0 };

    case 'hint':
      logSuccess(`Hint command called with args: ${JSON.stringify(args)}`);
      return { success: true, exitCode: 0 };

    case 'config':
      logSuccess(`Config command called with args: ${JSON.stringify(args)}`);
      return { success: true, exitCode: 0 };

    case 'init':
      logSuccess(`Init command called with args: ${JSON.stringify(args)}`);
      return { success: true, exitCode: 0 };

    default:
      return {
        success: false,
        error: `Unknown command: ${args.command}`,
        exitCode: 1,
      };
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  const help = `
Algo Trainer v${VERSION} - Practice algorithmic problem solving

USAGE:
    at <command> [subcommand] [options] [args]

COMMANDS:
    challenge    Start a new coding challenge
    complete     Mark a problem as completed
    hint         Get a hint for the current problem
    config       Manage configuration settings
    init         Initialize a new workspace

GLOBAL OPTIONS:
    -h, --help        Show this help message
    -v, --version     Show version information
    --verbose         Enable verbose output
    --quiet           Suppress non-essential output
    --no-color        Disable colored output
    --no-emoji        Disable emoji in output
    -c, --config      Specify custom config file path

EXAMPLES:
    at challenge easy           Start an easy challenge
    at complete two-sum         Mark 'two-sum' as completed
    at hint                     Get a hint for current problem
    at config set language ts   Set default language to TypeScript
    at init ~/my-practice       Initialize workspace

For more information about a specific command, run:
    at <command> --help
`;

  console.error(help.trim());
}

/**
 * Entry point when run as main module
 */
if (import.meta.main) {
  main(Deno.args);
}
