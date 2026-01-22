/**
 * List command handler
 *
 * Lists and filters available problems with support for various filters
 * and output formats.
 *
 * @module cli/commands/list
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, Difficulty, ProblemQuery } from '../../types/global.ts';
import { ExitCode } from '../exit-codes.ts';
import { requireProblemManager } from './shared.ts';
import { showCommandHelp } from './help.ts';
import { logger, outputData } from '../../utils/output.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'list',
    description: 'List and filter available problems',
    usage: ['algo-trainer list [options]'],
    options: [
      {
        flags: '-d, --difficulty <level>',
        description: 'Filter by difficulty (easy, medium, hard)',
      },
      { flags: '-t, --tag <tag>', description: 'Filter by tag' },
      {
        flags: '-c, --category <cat>',
        description: 'Filter by category (alias for --tag)',
      },
      {
        flags: '-s, --search <text>',
        description: 'Search in title/description',
      },
      { flags: '-l, --limit <n>', description: 'Limit results (default: 20)' },
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--verbose', description: 'Show full descriptions' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'algo-trainer list', description: 'List first 20 problems' },
      {
        command: 'algo-trainer list -d easy',
        description: 'List easy problems',
      },
      {
        command: 'algo-trainer list -t array',
        description: 'List problems with array tag',
      },
      {
        command: 'algo-trainer list -c arrays',
        description: 'List array problems (same as -t)',
      },
      {
        command: 'algo-trainer list -s "two sum"',
        description: 'Search for problems',
      },
      {
        command: 'algo-trainer list -l 50',
        description: 'List first 50 problems',
      },
      {
        command: 'algo-trainer list --verbose',
        description: 'Show detailed descriptions',
      },
      { command: 'algo-trainer list --json', description: 'Output as JSON' },
    ],
  });
}

/**
 * Options extracted from command arguments
 */
export interface ListOptions {
  difficulty?: Difficulty;
  tag?: string;
  search?: string;
  limit: number;
  json: boolean;
  verbose: boolean;
}

/**
 * Extract list options from command arguments
 */
export function extractListOptions(args: Args): ListOptions {
  const difficulty = (args.difficulty as Difficulty | undefined) ||
    (args.d as Difficulty | undefined);
  // Support both -t/--tag and -c/--category (aliases for the same thing)
  const tag = (args.tag as string | undefined) ||
    (args.t as string | undefined) ||
    (args.category as string | undefined) ||
    (args.c as string | undefined);
  const search = (args.search as string | undefined) || (args.s as string | undefined);

  const result: ListOptions = {
    limit: (args.limit as number | undefined) ||
      (args.l as number | undefined) ||
      20,
    json: !!args.json,
    verbose: !!args.verbose,
  };

  if (difficulty !== undefined) {
    result.difficulty = difficulty;
  }

  if (tag !== undefined) {
    result.tag = tag;
  }

  if (search !== undefined) {
    result.search = search;
  }

  return result;
}

/**
 * Display problems as a table
 */
function displayProblemsTable(
  problems: Array<{
    id: string;
    difficulty: string;
    title: string;
    description: string;
    tags: string[];
  }>,
  options: { verbose: boolean },
): void {
  if (problems.length === 0) {
    logger.info('No problems found.');
    return;
  }

  logger.newline();

  // Display main table using logger.table()
  logger.table(problems, {
    columns: [
      { key: 'id', label: 'ID', width: 6, align: 'left' },
      { key: 'difficulty', label: 'Difficulty', width: 10, align: 'left' },
      { key: 'title', label: 'Title', align: 'left' },
    ],
  });

  // Show verbose details if requested
  if (options.verbose) {
    logger.newline();
    for (const problem of problems) {
      logger.log(`${problem.id}:`);
      logger.group();

      // Show description (truncated)
      const desc = problem.description.length > 100
        ? problem.description.substring(0, 100) + '...'
        : problem.description;
      logger.log(`Description: ${desc}`);

      // Show tags
      if (problem.tags.length > 0) {
        logger.log(`Tags: ${problem.tags.join(', ')}`);
      }

      logger.groupEnd();
      logger.newline();
    }
  }

  logger.newline();
  logger.log(
    `Total: ${problems.length} problem${problems.length === 1 ? '' : 's'}`,
  );
}

/**
 * List command implementation
 *
 * Lists problems with optional filtering by difficulty, category, and search text.
 * Supports JSON output and verbose mode for detailed information.
 */
export async function listCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    // Extract options
    const options = extractListOptions(args);

    // Initialize problem manager
    const manager = await requireProblemManager();

    // Build query
    const query: ProblemQuery = {
      limit: options.limit,
    };

    if (options.difficulty) {
      // Validate difficulty
      if (!['easy', 'medium', 'hard'].includes(options.difficulty)) {
        return {
          success: false,
          error: `Invalid difficulty: ${options.difficulty}. Must be one of: easy, medium, hard`,
          exitCode: ExitCode.USAGE_ERROR,
        };
      }
      query.difficulty = options.difficulty;
    }

    if (options.tag) {
      // Use tags field for tag/category filtering
      query.tags = [options.tag];
    }

    if (options.search) {
      query.text = options.search;
    }

    // Execute query
    const result = manager.list(query);

    // Output results
    if (options.json) {
      // JSON output
      outputData({
        problems: result.problems,
        total: result.total,
        hasMore: result.hasMore,
      });
    } else {
      // Table output
      displayProblemsTable(result.problems, { verbose: options.verbose });
    }

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error listing problems: ${message}`);
    return {
      success: false,
      error: message,
      exitCode: ExitCode.GENERAL_ERROR,
    };
  }
}
