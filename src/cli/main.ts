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
import { getExitCodeForError } from './exit-codes.ts';
import { initializeConfig } from '../config/manager.ts';
import { dispatch, getAvailableCommands } from './commands/mod.ts';
import { extractGlobalFlags } from './types.ts';
import { VERSION } from '../version.ts';

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

function formatCommandList(): string {
  return getAvailableCommands()
    .map((cmd) => `    ${cmd.name.padEnd(12)} ${cmd.description}`)
    .join('\n');
}

function showHelp(): void {
  const help = `
Algo Trainer v${VERSION} - Practice algorithmic problem solving

USAGE:
    at <command> [subcommand] [options] [args]

COMMANDS:
${formatCommandList()}

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

EXIT CODES:
    0    Success - Command completed successfully
    1    General error - Unexpected error occurred
    2    Usage error - Invalid arguments or usage
    3    Config error - Configuration issues
    4    Workspace error - Workspace not initialized or invalid
    5    Problem error - Problem not found or invalid
    6    Network error - Network or API issues
    7    Permission error - File permission denied

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
    const exitCode = getExitCodeForError(error);
    Deno.exit(exitCode);
  }
}
