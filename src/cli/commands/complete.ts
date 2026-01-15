/**
 * Complete command handler
 *
 * Marks a problem as completed and archives it.
 *
 * @module cli/commands/complete
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, SupportedLanguage } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import {
  archiveProblem,
  problemExists,
  ProblemManager,
} from '../../core/mod.ts';
import { ExitCode } from '../exit-codes.ts';
import { logError, logInfo, logSuccess } from '../../utils/output.ts';
import { requireWorkspace } from './shared.ts';
import { promptSelect, promptText } from '../prompts.ts';
import { join } from '@std/path';

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

    // Get problem slug - prompt if not provided
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
      await archiveProblem({
        workspaceRoot: structure.root,
        slug: problemSlug,
        language,
      });
      logSuccess(`Completed and archived: ${problemSlug}`);
      logInfo(`Files moved to: ${join(structure.completed, problemSlug)}`);
    } else {
      logSuccess(`Marked as completed: ${problemSlug}`);
      logInfo('Files kept in current workspace (--no-archive)');
    }

    // Get problem info for suggestions
    try {
      const manager = new ProblemManager();
      await manager.init();
      const problem = manager.getBySlug(problemSlug);

      if (problem) {
        logInfo(`\nCompleted: ${problem.title} [${problem.difficulty.toUpperCase()}]`);

        // Suggest next problems of similar difficulty
        const similarProblems = manager.list({
          difficulty: problem.difficulty,
          limit: 3,
        });

        if (similarProblems.problems.length > 0) {
          logInfo('\nSuggested next challenges:');
          for (const p of similarProblems.problems.slice(0, 3)) {
            if (p.slug !== problemSlug) {
              logInfo(`  - ${p.title} (${p.slug})`);
            }
          }
        }
      }
    } catch {
      // Ignore errors in suggestion logic
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logError('Failed to complete problem:', error instanceof Error ? error.message : String(error));
    return { success: false, exitCode: ExitCode.GENERAL_ERROR };
  }
}

