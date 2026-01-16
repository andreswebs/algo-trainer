/**
 * Complete command handler
 *
 * Marks a problem as completed by archiving it from the current workspace
 * to the completed directory. Supports interactive prompts for problem selection.
 *
 * @module cli/commands/complete
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, ProblemQuery, SupportedLanguage } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { archiveProblem, problemExists, ProblemManager } from '../../core/mod.ts';
import { ExitCode } from '../exit-codes.ts';
import { logError, logInfo, logSuccess } from '../../utils/output.ts';
import { formatProblemSummary, requireWorkspace, resolveProblem } from './shared.ts';
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';
import { promptSelect, promptText } from '../prompts.ts';

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
    const structure = await requireWorkspace();

    // Get language from config
    const language = (config.language || 'typescript') as SupportedLanguage;

    // Get problem slug - prompt if not provided or resolve by ID
    let problemSlug = options.problemSlug;
    if (!problemSlug) {
      // Try to find current problems in workspace
      const problemsDir = structure.problems;
      try {
        const entries = [];
        for await (const entry of Deno.readDir(problemsDir)) {
          if (entry.isDirectory) {
            entries.push(entry.name);
          }
        }

        if (entries.length === 0) {
          logError('No problems found in workspace');
          logInfo('Start a challenge with: at challenge');
          return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
        }

        if (entries.length === 1) {
          // Only one problem, use it
          problemSlug = entries[0];
          logInfo(`Auto-selected problem: ${problemSlug}`);
        } else {
          // Multiple problems, prompt user to select
          const selected = await promptSelect(
            'Select problem to complete:',
            entries,
          );
          if (!selected) {
            logError('No problem selected');
            return { success: false, exitCode: ExitCode.USAGE_ERROR };
          }
          problemSlug = selected;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Failed to read problems directory: ${errorMessage}`);
        return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
      }
    } else {
      // Try to resolve by ID or slug
      try {
        const manager = new ProblemManager();
        await manager.init();
        const problem = resolveProblem(problemSlug, manager, structure.root);
        if (problem) {
          // Use the resolved slug (in case they provided an ID)
          problemSlug = problem.slug;
        }
      } catch {
        // If resolution fails, continue with the provided slug
      }
    }

    // Verify problem exists in workspace
    const exists = await problemExists(structure.root, problemSlug, language);
    if (!exists) {
      logError(`Problem '${problemSlug}' not found in workspace`);
      logInfo('Available problems are in: ' + structure.problems);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    }

    // Prompt for notes if not provided
    let notes = options.notes;
    if (!notes) {
      const prompted = await promptText('Add completion notes (optional):', {
        allowEmpty: true,
      });
      if (prompted) {
        notes = prompted;
      }
    }

    // Archive the problem unless --no-archive is set
    if (!options.noArchive) {
      logInfo(`Archiving problem: ${problemSlug}`);
      const archiveResult = await archiveProblem({
        workspaceRoot: structure.root,
        slug: problemSlug,
        language,
      });

      if (!archiveResult.success) {
        logError(`Failed to archive problem: ${archiveResult.error}`);
        return { success: false, exitCode: ExitCode.GENERAL_ERROR };
      }

      logSuccess(`Completed and archived: ${problemSlug}`);
      if (archiveResult.collisionHandled) {
        logInfo('Note: A previous completion exists. Archived with timestamp.');
      }
      logInfo(`Archived to: ${archiveResult.archivedTo}`);
    } else {
      logSuccess(`Marked as completed: ${problemSlug}`);
      logInfo('Files kept in current workspace (--no-archive)');
    }

    // Show notes if provided
    if (notes) {
      logInfo(`Notes: ${notes}`);
    }

    // Get problem info for detailed display and suggestions
    try {
      const manager = new ProblemManager();
      await manager.init();
      const problem = manager.getBySlug(problemSlug);

      if (problem) {
        // Display problem summary
        console.error(''); // Empty line for spacing
        console.error(formatProblemSummary(problem));
        console.error(''); // Empty line for spacing

        // Suggest next problems of similar difficulty
        logInfo('Looking for next challenge...');
        const query: ProblemQuery = {
          difficulty: problem.difficulty,
          limit: 3,
        };
        const similarProblems = manager.list(query);

        if (similarProblems.problems.length > 0) {
          const suggestions = similarProblems.problems.filter((p) => p.slug !== problemSlug).slice(
            0,
            3,
          );
          if (suggestions.length > 0) {
            for (const p of suggestions) {
              logInfo(`  - ${p.title} (${p.slug})`);
            }
            logInfo(`\nStart with: at challenge ${suggestions[0].slug}`);
          }
        }
      }
    } catch {
      // Ignore errors in display/suggestion logic
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
