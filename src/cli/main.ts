/**
 * Main CLI entry point
 *
 * Entry point for the Algo Trainer CLI application.
 *
 * @module cli/main
 */

import { parseArgs } from '@std/cli/parse-args';
import { exitWithError, logError, setOutputOptions } from '../utils/output.ts';
import { formatError } from '../utils/errors.ts';
import { initializeConfig } from '../config/manager.ts';
import { dispatch, getAvailableCommands } from './commands/mod.ts';
import { extractGlobalFlags } from './types.ts';

const VERSION = '2.0.0';

const PARSE_OPTIONS = {
  alias: {
    h: 'help',
    v: 'version',
    c: 'config',
  },
  boolean: ['help', 'version', 'verbose', 'quiet'],
  string: ['config'],
  negatable: ['color', 'emoji'],
  default: {
    verbose: false,
    quiet: false,
    color: true,
    emoji: true,
  },
} as const;

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

export async function main(inputArgs: string[] = Deno.args): Promise<void> {
  try {
    const args = parseArgs(inputArgs, PARSE_OPTIONS);
    const globalFlags = extractGlobalFlags(args);

    if (globalFlags.version) {
      console.log(`Algo Trainer v${VERSION}`);
      return;
    }

    setOutputOptions({
      useColors: globalFlags.color,
      useEmoji: globalFlags.emoji,
      verbosity: globalFlags.verbose ? 'verbose' : globalFlags.quiet ? 'quiet' : 'normal',
    });

    if (globalFlags.help || args._.length === 0) {
      showHelp();
      return;
    }

    await initializeConfig();

    const command = String(args._[0]);
    const result = await dispatch(command, args);

    if (!result.success) {
      exitWithError(result.error ?? 'Command failed', result.exitCode);
    }
  } catch (error) {
    const errorMessage = formatError(error);
    logError('Unexpected error occurred', errorMessage);
    Deno.exit(1);
  }
}
