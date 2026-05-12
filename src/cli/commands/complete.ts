/**
 * Complete command handler
 *
 * Marks a problem as completed by archiving it from the current workspace
 * to the completed directory. Supports interactive prompts for problem selection.
 *
 * @module cli/commands/complete
 */

import type { Args } from '@std/cli/parse-args';
import type {
  CommandResult,
  ProblemQuery,
  SupportedLanguage,
  WorkspaceStructure,
} from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { archiveProblem, problemExists, ProblemManager } from '../../core/mod.ts';
import { ExitCode } from '../exit-codes.ts';
import { logger } from '../../utils/output.ts';
import { formatProblemSummary, requireWorkspace, resolveProblem } from './shared.ts';
import {
  CommandError,
  createErrorContext,
  ProblemError,
  WorkspaceError,
} from '../../utils/errors.ts';
import { promptSelect, promptText } from '../prompts.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'complete',
    description: 'Mark a problem as completed and archive it',
    usage: ['algo-trainer complete <slug>', 'algo-trainer complete'],
    options: [
      { flags: '-n, --notes <text>', description: 'Add completion notes' },
      {
        flags: '--no-archive',
        description: "Keep files in current (don't move)",
      },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      {
        command: 'algo-trainer complete two-sum',
        description: 'Mark "two-sum" as completed',
      },
      {
        command: 'algo-trainer complete',
        description: 'Complete current problem (interactive)',
      },
      {
        command: 'algo-trainer complete two-sum -n "Great problem!"',
        description: 'Complete with notes',
      },
      {
        command: 'algo-trainer complete --no-archive',
        description: 'Mark as complete without archiving',
      },
    ],
  });
}

export interface CompleteOptions {
  problemSlug: string | undefined;
  notes: string | undefined;
  noArchive: boolean;
}

export function extractCompleteOptions(args: Args): CompleteOptions {
  const positionalArgs = args._.slice(1);
  return {
    problemSlug: positionalArgs[0] as string | undefined,
    notes: (args.notes || args.n) as string | undefined,
    noArchive: Boolean(args['no-archive']),
  };
}

/**
 * Resolves the target problem slug from args or by scanning the workspace.
 * Auto-selects if only one problem is present; prompts for multiple.
 * Throws ProblemError if no problems found, CommandError if no selection made.
 */
export async function resolveTargetProblem(
  options: CompleteOptions,
  structure: WorkspaceStructure,
): Promise<string> {
  if (options.problemSlug) {
    try {
      const manager = new ProblemManager();
      await manager.init();
      const problem = resolveProblem(options.problemSlug, manager, structure.root);
      if (problem) {
        return problem.slug;
      }
    } catch {
      // If resolution fails, continue with provided slug
    }
    return options.problemSlug;
  }

  const entries: string[] = [];
  try {
    for await (const entry of Deno.readDir(structure.problems)) {
      if (entry.isDirectory) {
        entries.push(entry.name);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new CommandError(
      `Failed to read problems directory: ${errorMessage}`,
      createErrorContext('resolveTargetProblem', { error: errorMessage }),
    );
  }

  if (entries.length === 0) {
    throw new ProblemError(
      'No problems found in workspace',
      createErrorContext('resolveTargetProblem', { workspace: structure.problems }),
    );
  }

  if (entries.length === 1) {
    logger.info(`Auto-selected problem: ${entries[0]}`);
    return entries[0];
  }

  const selected = await promptSelect('Select problem to complete:', entries);
  if (!selected) {
    throw new CommandError(
      'No problem selected',
      createErrorContext('resolveTargetProblem', { workspace: structure.problems }),
    );
  }
  return selected;
}

/**
 * Validates that the problem exists in the workspace.
 * Throws ProblemError if the problem files are not found.
 */
export async function validateCompletion(
  problemSlug: string,
  workspaceRoot: string,
  language: SupportedLanguage,
): Promise<void> {
  const exists = await problemExists(workspaceRoot, problemSlug, language);
  if (!exists) {
    throw new ProblemError(
      `Problem '${problemSlug}' not found in workspace`,
      createErrorContext('validateCompletion', { slug: problemSlug, workspaceRoot }),
    );
  }
}

/**
 * Archives the problem (or marks it complete without moving files if noArchive).
 * Throws on archive failure. Logs outcome to stderr.
 */
export async function markCompleted(
  problemSlug: string,
  workspaceRoot: string,
  language: SupportedLanguage,
  noArchive: boolean,
): Promise<void> {
  if (!noArchive) {
    logger.info(`Archiving problem: ${problemSlug}`);
    const archiveResult = await archiveProblem({ workspaceRoot, slug: problemSlug, language });
    if (!archiveResult.success) {
      throw new Error(`Failed to archive problem: ${archiveResult.error}`);
    }
    logger.success(`Completed and archived: ${problemSlug}`);
    if (archiveResult.collisionHandled) {
      logger.info('Note: A previous completion exists. Archived with timestamp.');
    }
    logger.info(`Archived to: ${archiveResult.archivedTo}`);
  } else {
    logger.success(`Marked as completed: ${problemSlug}`);
    logger.info('Files kept in current workspace (--no-archive)');
  }
}

/**
 * Emits notes, problem summary, and next-challenge suggestions to stderr.
 * Never throws.
 */
export async function emitCompletionSummary(
  problemSlug: string,
  notes: string | undefined,
): Promise<void> {
  if (notes) {
    logger.info(`Notes: ${notes}`);
  }

  try {
    const manager = new ProblemManager();
    await manager.init();
    const problem = manager.getBySlug(problemSlug);

    if (problem) {
      logger.newline();
      logger.log(formatProblemSummary(problem));
      logger.newline();

      logger.info('Looking for next challenge...');
      const query: ProblemQuery = { difficulty: problem.difficulty, limit: 3 };
      const similarProblems = manager.list(query);

      if (similarProblems.problems.length > 0) {
        const suggestions = similarProblems.problems
          .filter((p) => p.slug !== problemSlug)
          .slice(0, 3);
        if (suggestions.length > 0) {
          for (const p of suggestions) {
            logger.info(`  - ${p.title} (${p.slug})`);
          }
          logger.info(`\nStart with: algo-trainer challenge ${suggestions[0].slug}`);
        }
      }
    }
  } catch {
    // Ignore errors in display/suggestion logic
  }
}

export async function completeCommand(args: Args): Promise<CommandResult> {
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractCompleteOptions(args);
    const config = configManager.getConfig();
    const structure = await requireWorkspace();
    const language = (config.language || 'typescript') as SupportedLanguage;

    const problemSlug = await resolveTargetProblem(options, structure);
    await validateCompletion(problemSlug, structure.root, language);

    let notes = options.notes;
    if (!notes) {
      const prompted = await promptText('Add completion notes (optional):', { allowEmpty: true });
      if (prompted) {
        notes = prompted;
      }
    }

    await markCompleted(problemSlug, structure.root, language, options.noArchive);
    await emitCompletionSummary(problemSlug, notes);

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    if (error instanceof WorkspaceError) {
      logger.error('Workspace error:', error.message);
      return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
    } else if (error instanceof ProblemError) {
      logger.error('Problem error:', error.message);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    } else if (error instanceof CommandError) {
      logger.error('Command error:', error.message);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    } else {
      logger.error(
        'Unexpected error:',
        error instanceof Error ? error.message : String(error),
      );
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }
  }
}
