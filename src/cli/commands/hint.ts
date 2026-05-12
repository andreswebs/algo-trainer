/**
 * Hint command handler
 *
 * Gets a hint for the current problem.
 *
 * @module cli/commands/hint
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, Config, Problem, SupportedLanguage } from '../../types/global.ts';
import { ExitCode, getExitCodeForError } from '../exit-codes.ts';
import { logger } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import {
  getProblemMetadata,
  problemExists,
  updateProblemMetadata,
} from '../../core/workspace/generation.ts';
import { requireProblemManager, requireWorkspace, resolveProblem } from './shared.ts';
import { showCommandHelp } from './help.ts';
import { TeachingEngine, TeachingSession } from '../../core/ai/mod.ts';
import { join } from '@std/path';

function showHelp(): void {
  showCommandHelp({
    name: 'hint',
    description: 'Get progressive hints for a problem',
    usage: ['algo-trainer hint <slug>', 'algo-trainer hint <id>'],
    options: [
      { flags: '--level <n>', description: 'Get specific hint level (1-3)' },
      { flags: '-a, --all', description: 'Show all available hints' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      {
        command: 'algo-trainer hint two-sum',
        description: 'Get next hint for "two-sum"',
      },
      {
        command: 'algo-trainer hint 1',
        description: 'Get next hint by problem ID',
      },
      {
        command: 'algo-trainer hint two-sum --level 2',
        description: 'Get hint level 2',
      },
      {
        command: 'algo-trainer hint two-sum --all',
        description: 'Show all hints',
      },
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
  const levelLabel = [
    'General Approach',
    'Algorithm/Data Structure',
    'Solution Strategy',
  ][level];
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
  const nextHintIndex = hints.findIndex(
    (_, index) => !hintsUsed.includes(index),
  );

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
  const progressBar = hints
    .map((_, i) => (newHintsUsed.includes(i) ? '█' : '░'))
    .join('');
  logger.newline();
  logger.log(
    `Progress: ${progressBar} (${newHintsUsed.length}/${hints.length})`,
  );

  if (newHintsUsed.length < hints.length) {
    logger.newline();
    logger.log(
      `💬 Use 'algo-trainer hint --level ${nextHintIndex + 2}' for the next hint`,
    );
  }

  return newHintsUsed.sort((a, b) => a - b);
}

/**
 * Load workspace existence and hint-usage state for a problem.
 */
export async function loadProblemState(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
): Promise<{ exists: boolean; hintsUsed: number[] }> {
  const exists = await problemExists(workspaceRoot, slug, language);
  if (!exists) {
    return { exists: false, hintsUsed: [] };
  }
  const metadata = await getProblemMetadata(workspaceRoot, slug, language);
  return { exists: true, hintsUsed: metadata?.hintsUsed ?? [] };
}

/**
 * Validate the requested hint level against available hints.
 * Returns an error message string if invalid, null if valid (or undefined level).
 */
export function validateHintLevel(
  level: number | undefined,
  hints: string[],
): string | null {
  if (level === undefined) {
    return null;
  }
  if (level < 1 || level > hints.length) {
    return `Invalid hint level: ${level}. Available levels: 1-${hints.length}`;
  }
  return null;
}

/**
 * Persist updated hint usage to workspace metadata.
 * No-op when problem doesn't exist in workspace or no new hints were viewed.
 */
export async function updateHintTracking(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
  exists: boolean,
  updatedHintsUsed: number[],
  originalHintsUsed: number[],
): Promise<void> {
  if (!exists || updatedHintsUsed.length <= originalHintsUsed.length) {
    return;
  }
  const updated = await updateProblemMetadata(workspaceRoot, slug, language, {
    hintsUsed: updatedHintsUsed,
  });
  if (!updated) {
    logger.warn('Could not update hint tracking metadata.');
  }
}

/**
 * Try to emit an AI contextual hint. Returns true if a hint was shown.
 */
async function tryEmitAiHint(
  config: Config,
  problem: Problem,
  options: HintOptions,
  exists: boolean,
): Promise<boolean> {
  if (!config.aiEnabled || !exists || options.all || options.level !== undefined) {
    return false;
  }
  try {
    const session = new TeachingSession(problem.slug);
    const engine = new TeachingEngine(session);
    const problemDir = join(config.workspace, 'problems', problem.slug);
    const loaded = await engine.loadScript(problemDir);
    if (!loaded) {
      return false;
    }
    const aiHint = engine.getHint('');
    if (!aiHint) {
      return false;
    }
    logger.newline();
    logger.log('🤖 AI Teaching Assistant');
    logger.newline();
    logger.separator(50);
    logger.log(aiHint);
    logger.separator(50);
    logger.newline();
    logger.log('💬 For more structured hints, use --all or --level flags');
    logger.newline();
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn(`Note: Could not load AI hints: ${errorMsg}`);
    return false;
  }
}

export async function hintCommand(args: Args): Promise<CommandResult> {
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractHintOptions(args);
    const config = configManager.getConfig();

    await requireWorkspace();
    const manager = await requireProblemManager();

    if (!options.problemSlug) {
      // FUTURE ENHANCEMENT(CLI-021): Auto-detect current problem from workspace
      logger.error('Problem slug is required. Usage: algo-trainer hint <slug>');
      return { success: false, exitCode: ExitCode.USAGE_ERROR, error: 'Problem slug is required' };
    }

    const problem = resolveProblem(options.problemSlug, manager);
    if (!problem) {
      logger.error(`Problem '${options.problemSlug}' not found.`);
      logger.info(
        'Use "algo-trainer list" to see available problems, or provide a valid problem ID or slug',
      );
      return {
        success: false,
        exitCode: ExitCode.PROBLEM_ERROR,
        error: `Problem '${options.problemSlug}' not found`,
      };
    }

    const levelError = validateHintLevel(options.level, problem.hints);
    if (levelError) {
      logger.error(levelError);
      logger.info(`Available hint levels for this problem: 1-${problem.hints.length}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR, error: levelError };
    }

    const { exists, hintsUsed } = await loadProblemState(
      config.workspace,
      problem.slug,
      config.language,
    );

    logger.newline();
    logger.log(`📝 ${problem.title} [${problem.difficulty.toUpperCase()}]`);

    const aiHintShown = await tryEmitAiHint(config, problem, options, exists);

    if (!aiHintShown) {
      const updatedHintsUsed = displayHints(problem.hints, hintsUsed, options.level, options.all);
      await updateHintTracking(
        config.workspace,
        problem.slug,
        config.language,
        exists,
        updatedHintsUsed,
        hintsUsed,
      );
    }

    logger.newline();

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    const exitCode = getExitCodeForError(error);
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error: ${message}`);
    return { success: false, exitCode, error: message };
  }
}
