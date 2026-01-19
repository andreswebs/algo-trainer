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
import { logger } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import {
  getProblemMetadata,
  problemExists,
  updateProblemMetadata,
} from '../../core/workspace/generation.ts';
import { requireProblemManager, resolveProblem } from './shared.ts';
import { showCommandHelp } from './help.ts';
import { TeachingEngine, TeachingSession } from '../../core/ai/mod.ts';
import { join } from '@std/path';

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

  logger.newline();
  logger.log(`${usedIndicator} Hint ${level + 1}: ${levelLabel}`);
  logger.separator(50);
  logger.log(hint);
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
    logger.info('No hints available for this problem.');
    return hintsUsed;
  }

  const newHintsUsed = [...hintsUsed];

  if (showAll) {
    // Show all hints
    logger.newline();
    logger.log('📚 All Available Hints:');
    logger.newline();
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
      logger.error(`Invalid hint level. Available levels: 1-${hints.length}`);
      return hintsUsed;
    }

    logger.newline();
    logger.log(`💡 Hint Level ${requestedLevel}:`);
    logger.newline();
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
    logger.newline();
    logger.log('✨ All hints have been viewed!');
    logger.newline();
    hints.forEach((hint, index) => {
      displayHint(index, hint, true);
    });
    return hintsUsed;
  }

  // Show the next hint
  logger.newline();
  logger.log(`💡 Next Hint (Level ${nextHintIndex + 1} of ${hints.length}):`);
  logger.newline();
  displayHint(nextHintIndex, hints[nextHintIndex], false);
  newHintsUsed.push(nextHintIndex);

  // Show progress
  const progressBar = hints.map((_, i) => newHintsUsed.includes(i) ? '█' : '░').join('');
  logger.newline();
  logger.log(`Progress: ${progressBar} (${newHintsUsed.length}/${hints.length})`);

  if (newHintsUsed.length < hints.length) {
    logger.newline();
    logger.log(`💬 Use 'at hint --level ${nextHintIndex + 2}' for the next hint`);
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
      // FUTURE ENHANCEMENT(CLI-021): Auto-detect current problem from workspace
      // This would use the same detection mechanism as CLI-001 in shared.ts
      // to identify which problem the user is currently working on
      // Decision: Deferred to post-v1.0 as explicit problem identifiers work well
      logger.error('Problem slug is required. Usage: at hint <slug>');
      return {
        success: false,
        exitCode: ExitCode.USAGE_ERROR,
        error: 'Problem slug is required',
      };
    }

    // Resolve problem
    const problem = resolveProblem(problemSlug, manager);
    if (!problem) {
      logger.error(`Problem '${problemSlug}' not found.`);
      logger.info('Use "at list" to see available problems, or provide a valid problem ID or slug');
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
    logger.newline();
    logger.log(`📝 ${problem.title} [${problem.difficulty.toUpperCase()}]`);

    // Try to get AI contextual hint if enabled and problem exists in workspace
    let aiHintShown = false;
    if (config.aiEnabled && exists && !options.all && options.level === undefined) {
      try {
        const session = new TeachingSession(problem.slug);
        const engine = new TeachingEngine(session);

        // Load teaching script from workspace problem directory
        const problemDir = join(config.workspace, 'problems', problem.slug);
        const loaded = await engine.loadScript(problemDir);

        if (loaded) {
          // Try to get user's current code for contextual hints
          // For now, we'll use empty code - in the future this could read the solution file
          const userCode = '';
          const aiHint = engine.getHint(userCode);

          if (aiHint) {
            logger.newline();
            logger.log('🤖 AI Teaching Assistant');
            logger.newline();
            logger.separator(50);
            logger.log(aiHint);
            logger.separator(50);
            logger.newline();
            logger.log('💬 For more structured hints, use --all or --level flags');
            logger.newline();
            aiHintShown = true;
          }
        }
      } catch (error) {
        // Teaching system errors are non-fatal, fall back to regular hints
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`Note: Could not load AI hints: ${errorMsg}`);
      }
    }

    // Display regular hints if AI hint wasn't shown or if specific options were used
    if (!aiHintShown) {
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
          logger.warn('Could not update hint tracking metadata.');
        }
      }
    }

    logger.newline(); // Empty line for spacing

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    const exitCode = getExitCodeForError(error);
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error: ${message}`);
    return {
      success: false,
      exitCode,
      error: message,
    };
  }
}
