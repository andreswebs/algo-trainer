/**
 * Complete command handler
 *
 * Marks a problem as completed by archiving it from the current workspace
 * to the completed directory.
 *
 * @module cli/commands/complete
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, ProblemQuery, SupportedLanguage } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { archiveProblem, problemExists } from '../../core/mod.ts';
import { ExitCode } from '../exit-codes.ts';
import { logError, logInfo, logSuccess } from '../../utils/output.ts';
import {
  formatProblemSummary,
  requireProblemManager,
  requireWorkspace,
  resolveProblem,
} from './shared.ts';
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';

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

export async function completeCommand(args: Args): Promise<CommandResult> {
  try {
    const options = extractCompleteOptions(args);
    const config = configManager.getConfig();

    // Validate workspace is initialized
    const workspace = await requireWorkspace();

    // Get problem slug (from args or detect current)
    let problemSlug = options.problemSlug;
    if (!problemSlug) {
      logError('Problem slug is required');
      logInfo('Usage: at complete <slug>');
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    // Initialize problem manager to get problem details
    const manager = await requireProblemManager();

    // Resolve the problem to get full details
    const problem = resolveProblem(problemSlug, manager, workspace.root);
    if (!problem) {
      logError(`Problem not found: ${problemSlug}`);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    }

    // Use the problem's actual slug (in case they used ID)
    problemSlug = problem.slug;

    // Determine language (from config)
    const language = config.language as SupportedLanguage || 'typescript';

    // Check if problem exists in current workspace
    const exists = await problemExists(workspace.root, problemSlug, language);
    if (!exists) {
      logError(`Problem '${problemSlug}' not found in current workspace`);
      logInfo(`Workspace: ${workspace.root}`);
      logInfo(`Language: ${language}`);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    }

    // Archive the problem (unless --no-archive is set)
    if (!options.noArchive) {
      logInfo(`Archiving problem: ${problem.title}`);
      const archiveResult = await archiveProblem({
        workspaceRoot: workspace.root,
        slug: problemSlug,
        language,
      });

      if (!archiveResult.success) {
        logError(`Failed to archive problem: ${archiveResult.error}`);
        return { success: false, exitCode: ExitCode.GENERAL_ERROR };
      }

      logSuccess(`Completed and archived: ${problem.title}`);
      if (archiveResult.collisionHandled) {
        logInfo(`Note: A previous completion exists. Archived with timestamp.`);
      }
      logInfo(`Archived to: ${archiveResult.archivedTo}`);
    } else {
      logSuccess(`Marked as completed: ${problem.title}`);
      logInfo('Files remain in current workspace (--no-archive was set)');
    }

    // Add completion notes if provided
    if (options.notes) {
      logInfo(`Notes: ${options.notes}`);
    }

    // Display problem summary
    console.error(''); // Empty line for spacing
    console.error(formatProblemSummary(problem));
    console.error(''); // Empty line for spacing

    // Suggest next problems
    logInfo('Looking for next challenge...');
    const query: ProblemQuery = {
      difficulty: problem.difficulty,
    };
    const nextProblem = manager.getRandom(query);
    if (nextProblem) {
      logInfo(`Suggested next problem: ${nextProblem.title} (${nextProblem.difficulty})`);
      logInfo(`Start with: at challenge ${nextProblem.slug}`);
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    if (error instanceof WorkspaceError) {
      logError('Workspace error:', error.message);
      return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
    } else if (error instanceof ProblemError) {
      logError('Problem error:', error.message);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    } else {
      logError('Unexpected error:', error instanceof Error ? error.message : String(error));
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }
  }
}
