/**
 * Main CLI entry point
 *
 * Entry point for the Algo Trainer CLI application.
 *
 * @module cli/main
 */

import { parseArgs } from '@std/cli/parse-args';
import { exitWithError, logger, outputData, setOutputOptions } from '../utils/output.ts';
import { formatError } from '../utils/errors.ts';
import { getExitCodeForError, ExitCode } from './exit-codes.ts';
import { initializeConfig } from '../config/manager.ts';
import { dispatch, getAvailableCommands } from './commands/mod.ts';
import { extractGlobalFlags } from './types.ts';
import { getEnvVarDocumentation, validateEnvironmentVariables } from './env.ts';
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
    algo-trainer <command> [subcommand] [options] [args]

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

${getEnvVarDocumentation()}

EXAMPLES:
    algo-trainer challenge easy           Start an easy challenge
    algo-trainer complete two-sum         Mark 'two-sum' as completed
    algo-trainer hint                     Get a hint for current problem
    algo-trainer config set language ts   Set default language to TypeScript
    algo-trainer init ~/my-practice       Initialize workspace

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
    algo-trainer <command> --help
`;

  logger.log(help.trim());
}

export async function main(inputArgs: string[] = Deno.args): Promise<void> {
  try {
    // Validate environment variables early
    try {
      validateEnvironmentVariables();
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      Deno.exit(ExitCode.USAGE_ERROR);
    }

    const args = parseArgs(inputArgs, PARSE_OPTIONS);
    const globalFlags = extractGlobalFlags(args);

    if (globalFlags.version) {
      outputData(`Algo Trainer v${VERSION}`);
      return;
    }

    setOutputOptions({
      useColors: globalFlags.color,
      useEmoji: globalFlags.emoji,
      verbosity: globalFlags.verbose ? 'verbose' : globalFlags.quiet ? 'quiet' : 'normal',
    });

    // Show global help only if no command is specified
    if ((globalFlags.help || args._.length === 0) && args._.length === 0) {
      showHelp();
      return;
    }

    // If help flag is present but a command is specified, let the command handle it
    if (args._.length === 0) {
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
    logger.error('Unexpected error occurred', errorMessage);
    const exitCode = getExitCodeForError(error);
    Deno.exit(exitCode);
  }
}
