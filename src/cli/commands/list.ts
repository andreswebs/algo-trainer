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
import { outputData, logError } from '../../utils/output.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'list',
    description: 'List and filter available problems',
    usage: [
      'at list [options]',
    ],
    options: [
      {
        flags: '-d, --difficulty <level>',
        description: 'Filter by difficulty (easy, medium, hard)',
      },
      { flags: '-c, --category <cat>', description: 'Filter by category' },
      { flags: '-s, --search <text>', description: 'Search in title/description' },
      { flags: '-l, --limit <n>', description: 'Limit results (default: 20)' },
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--verbose', description: 'Show full descriptions' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at list', description: 'List first 20 problems' },
      { command: 'at list -d easy', description: 'List easy problems' },
      { command: 'at list -c arrays', description: 'List array problems' },
      { command: 'at list -s "two sum"', description: 'Search for problems' },
      { command: 'at list -l 50', description: 'List first 50 problems' },
      { command: 'at list --verbose', description: 'Show detailed descriptions' },
      { command: 'at list --json', description: 'Output as JSON' },
    ],
  });
}

/**
 * Options extracted from command arguments
 */
export interface ListOptions {
  difficulty?: Difficulty;
  category?: string;
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
  const category = (args.category as string | undefined) || (args.c as string | undefined);
  const search = (args.search as string | undefined) || (args.s as string | undefined);

  const result: ListOptions = {
    limit: (args.limit as number | undefined) || (args.l as number | undefined) || 20,
    json: !!args.json,
    verbose: !!args.verbose,
  };

  if (difficulty !== undefined) {
    result.difficulty = difficulty;
  }

  if (category !== undefined) {
    result.category = category;
  }

  if (search !== undefined) {
    result.search = search;
  }

  return result;
}

/**
 * Format problems as a table for display
 */
function formatAsTable(
  problems: Array<
    { id: string; difficulty: string; title: string; description: string; tags: string[] }
  >,
  options: { verbose: boolean },
): string {
  if (problems.length === 0) {
    return 'No problems found.';
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('ID     | Difficulty | Title');
  lines.push('-------|------------|------');

  // Rows
  for (const problem of problems) {
    const id = problem.id.padEnd(6);
    const difficulty = problem.difficulty.padEnd(10);
    lines.push(`${id} | ${difficulty} | ${problem.title}`);

    if (options.verbose) {
      // Show description (truncated)
      const desc = problem.description.length > 100
        ? problem.description.substring(0, 100) + '...'
        : problem.description;
      lines.push(`       |            | ${desc}`);

      // Show tags
      if (problem.tags.length > 0) {
        lines.push(`       |            | Tags: ${problem.tags.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push('');
  lines.push(`Total: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);

  return lines.join('\n');
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

    if (options.category) {
      // Use tags field for category filtering (tags are used as categories)
      query.tags = [options.category];
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
      const table = formatAsTable(result.problems, { verbose: options.verbose });
      outputData(table);
    }

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('Error listing problems', message);
    return {
      success: false,
      error: message,
      exitCode: ExitCode.GENERAL_ERROR,
    };
  }
}
