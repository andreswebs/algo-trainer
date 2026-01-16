/**
 * Hint command handler
 *
 * Gets a hint for the current problem.
 *
 * @module cli/commands/hint
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode, getExitCodeForError } from '../exit-codes.ts';
import { logError, logInfo } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import {
  getProblemMetadata,
  problemExists,
  updateProblemMetadata,
} from '../../core/workspace/generation.ts';
import { requireProblemManager, resolveProblem } from './shared.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'hint',
    description: 'Get progressive hints for a problem',
    usage: [
      'at hint <slug>',
      'at hint <id>',
    ],
    options: [
      { flags: '--level <n>', description: 'Get specific hint level (1-3)' },
      { flags: '-a, --all', description: 'Show all available hints' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at hint two-sum', description: 'Get next hint for "two-sum"' },
      { command: 'at hint 1', description: 'Get next hint by problem ID' },
      { command: 'at hint two-sum --level 2', description: 'Get hint level 2' },
      { command: 'at hint two-sum --all', description: 'Show all hints' },
    ],
  });
}

export interface HintOptions {
  problemSlug: string | undefined;
  level: number | undefined;
  all: boolean;
}

export function extractHintOptions(args: Args): HintOptions {
  const positionalArgs = args._.slice(1);
  return {
    problemSlug: positionalArgs[0] as string | undefined,
    level: args.level !== undefined ? Number(args.level) : undefined,
    all: !!args.all || !!args.a,
  };
}

/**
 * Format and display a single hint
 */
function displayHint(level: number, hint: string, isUsed: boolean): void {
  const levelLabel = ['General Approach', 'Algorithm/Data Structure', 'Solution Strategy'][level];
  const usedIndicator = isUsed ? '✓' : '•';

  console.log(`\n${usedIndicator} Hint ${level + 1}: ${levelLabel}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(hint);
}

/**
 * Display hints based on the requested level or all hints
 */
function displayHints(
  hints: string[],
  hintsUsed: number[],
  requestedLevel?: number,
  showAll?: boolean,
): number[] {
  if (hints.length === 0) {
    logInfo('No hints available for this problem.');
    return hintsUsed;
  }

  const newHintsUsed = [...hintsUsed];

  if (showAll) {
    // Show all hints
    console.log('\n📚 All Available Hints:\n');
    hints.forEach((hint, index) => {
      displayHint(index, hint, hintsUsed.includes(index));
      if (!hintsUsed.includes(index)) {
        newHintsUsed.push(index);
      }
    });
    return newHintsUsed.sort((a, b) => a - b);
  }

  if (requestedLevel !== undefined) {
    // Show specific level
    const index = requestedLevel - 1; // Convert 1-based to 0-based
    if (index < 0 || index >= hints.length) {
      logError(`Invalid hint level. Available levels: 1-${hints.length}`);
      return hintsUsed;
    }

    console.log(`\n💡 Hint Level ${requestedLevel}:\n`);
    displayHint(index, hints[index], hintsUsed.includes(index));
    if (!hintsUsed.includes(index)) {
      newHintsUsed.push(index);
    }
    return newHintsUsed.sort((a, b) => a - b);
  }

  // Progressive hint display: show the next hint that hasn't been used
  const nextHintIndex = hints.findIndex((_, index) => !hintsUsed.includes(index));

  if (nextHintIndex === -1) {
    // All hints have been used, show summary
    console.log('\n✨ All hints have been viewed!\n');
    hints.forEach((hint, index) => {
      displayHint(index, hint, true);
    });
    return hintsUsed;
  }

  // Show the next hint
  console.log(`\n💡 Next Hint (Level ${nextHintIndex + 1} of ${hints.length}):\n`);
  displayHint(nextHintIndex, hints[nextHintIndex], false);
  newHintsUsed.push(nextHintIndex);

  // Show progress
  const progressBar = hints.map((_, i) => newHintsUsed.includes(i) ? '█' : '░').join('');
  console.log(`\nProgress: ${progressBar} (${newHintsUsed.length}/${hints.length})`);

  if (newHintsUsed.length < hints.length) {
    console.log(`\n💬 Use 'at hint --level ${nextHintIndex + 2}' for the next hint`);
  }

  return newHintsUsed.sort((a, b) => a - b);
}

export async function hintCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractHintOptions(args);
    const config = configManager.getConfig();

    // Initialize problem manager
    const manager = await requireProblemManager();

    // Resolve problem identifier
    const problemSlug = options.problemSlug;

    // If no slug provided, try to detect from workspace
    if (!problemSlug) {
      // TODO(CLI-021): For now, we require explicit slug
      // In the future, this could detect the current problem from workspace
      logError('Problem slug is required. Usage: at hint <slug>');
      return {
        success: false,
        exitCode: ExitCode.USAGE_ERROR,
        error: 'Problem slug is required',
      };
    }

    // Resolve problem
    const problem = resolveProblem(problemSlug, manager);
    if (!problem) {
      logError(`Problem '${problemSlug}' not found.`);
      return {
        success: false,
        exitCode: ExitCode.PROBLEM_ERROR,
        error: `Problem '${problemSlug}' not found`,
      };
    }

    // Check if problem exists in workspace
    const exists = await problemExists(
      config.workspace,
      problem.slug,
      config.language,
    );

    let metadata = null;
    if (exists) {
      // Get metadata to track hint usage
      metadata = await getProblemMetadata(
        config.workspace,
        problem.slug,
        config.language,
      );
    }

    const hintsUsed = metadata?.hintsUsed ?? [];

    // Display problem information
    console.log(`\n📝 ${problem.title} [${problem.difficulty.toUpperCase()}]`);

    // Display hints
    const updatedHintsUsed = displayHints(
      problem.hints,
      hintsUsed,
      options.level,
      options.all,
    );

    // Update metadata if problem exists in workspace and hints were viewed
    if (exists && updatedHintsUsed.length > hintsUsed.length) {
      const updated = await updateProblemMetadata(
        config.workspace,
        problem.slug,
        config.language,
        { hintsUsed: updatedHintsUsed },
      );

      if (!updated) {
        logError('Warning: Could not update hint tracking metadata.');
      }
    }

    console.log(); // Empty line for spacing

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    const exitCode = getExitCodeForError(error);
    const message = error instanceof Error ? error.message : String(error);
    logError(`Error: ${message}`);
    return {
      success: false,
      exitCode,
      error: message,
    };
  }
}
