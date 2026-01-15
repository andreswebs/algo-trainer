/**
 * Challenge command handler
 *
 * Starts a new coding challenge with the specified difficulty or topic.
 *
 * @module cli/commands/challenge
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult, Difficulty, ProblemQuery, SupportedLanguage } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import {
  generateProblemFiles,
  initWorkspace,
  isWorkspaceInitialized,
  problemExists,
} from '../../core/mod.ts';
import { ExitCode } from '../exit-codes.ts';
import { logError, logInfo, logSuccess, logWarning } from '../../utils/output.ts';
import { confirmAction, formatProblemSummary, requireProblemManager } from './shared.ts';
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';

export interface ChallengeOptions {
  slug: string | undefined;
  difficulty: string | undefined;
  category: string | undefined;
  topic: string | undefined;
  language: string | undefined;
  force: boolean;
  random: boolean;
}

export function extractChallengeOptions(args: Args): ChallengeOptions {
  // First positional arg can be difficulty or slug
  const positionalArgs = args._.slice(1);
  const firstArg = positionalArgs[0] as string | undefined;

  // Check if first arg is a difficulty level or a slug
  const isDifficulty = firstArg && ['easy', 'medium', 'hard'].includes(firstArg.toLowerCase());

  return {
    slug: !isDifficulty ? firstArg : undefined,
    difficulty: isDifficulty ? firstArg : (args.difficulty || args.d) as string | undefined,
    category: (args.category || args.c) as string | undefined,
    topic: (args.topic || args.t) as string | undefined,
    language: (args.language || args.l) as string | undefined,
    force: Boolean(args.force || args.f),
    random: Boolean(args.random),
  };
}

export async function challengeCommand(args: Args): Promise<CommandResult> {
  try {
    const options = extractChallengeOptions(args);
    const config = configManager.getConfig();

    // Validate workspace is initialized
    const workspaceRoot = config.workspace || Deno.cwd();
    if (!await isWorkspaceInitialized(workspaceRoot)) {
      // Initialize workspace if it doesn't exist
      logInfo(`Workspace not initialized at: ${workspaceRoot}`);
      logInfo('Initializing workspace...');
      await initWorkspace(workspaceRoot);
      logSuccess('Workspace initialized');
    }

    // Initialize problem manager
    const manager = await requireProblemManager();

    // Get problem (by slug or random with filters)
    let problem;
    if (options.slug) {
      // Get specific problem by slug
      problem = manager.getBySlug(options.slug);
      if (!problem) {
        logError(`Problem not found: ${options.slug}`);
        return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
      }
    } else {
      // Get random problem with filters
      const query: ProblemQuery = {};

      if (options.difficulty) {
        const diffLower = options.difficulty.toLowerCase();
        if (!['easy', 'medium', 'hard'].includes(diffLower)) {
          logError(`Invalid difficulty: ${options.difficulty}`);
          logInfo('Valid difficulties: easy, medium, hard');
          return { success: false, exitCode: ExitCode.USAGE_ERROR };
        }
        query.difficulty = diffLower as Difficulty;
      }

      if (options.category) {
        query.tags = [options.category];
      }

      if (options.topic) {
        query.tags = query.tags ? [...query.tags, options.topic] : [options.topic];
      }

      problem = manager.getRandom(query);
      if (!problem) {
        logError('No problems found matching the specified filters');
        return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
      }
    }

    // Determine language (CLI arg > config > default)
    const language = (options.language || config.language || 'typescript') as SupportedLanguage;

    // Validate language
    const validLanguages: SupportedLanguage[] = ['typescript', 'javascript', 'python', 'java', 'cpp', 'rust', 'go'];
    if (!validLanguages.includes(language)) {
      logError(`Invalid language: ${language}`);
      logInfo(`Valid languages: ${validLanguages.join(', ')}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    // Check if problem already exists
    const exists = await problemExists(workspaceRoot, problem.slug, language);
    if (exists && !options.force) {
      logWarning(`Problem '${problem.slug}' already exists in workspace`);
      logInfo('Use --force to overwrite existing files');
      
      const confirmed = await confirmAction('Do you want to overwrite existing files?', false);
      if (!confirmed) {
        logInfo('Operation cancelled');
        return { success: true, exitCode: ExitCode.SUCCESS };
      }
    }

    // Generate problem files
    logInfo(`Generating files for: ${problem.title}`);
    const result = await generateProblemFiles({
      problem,
      workspaceRoot,
      language,
      templateStyle: config.preferences.templateStyle,
      overwritePolicy: options.force || exists ? 'overwrite' : 'skip',
    });

    if (!result.success) {
      logError(`Failed to generate problem files: ${result.error}`);
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }

    // Display success message with problem summary
    logSuccess(`Started challenge: ${problem.title}`);
    console.error(''); // Empty line for spacing
    console.error(formatProblemSummary(problem));
    console.error(''); // Empty line for spacing
    
    logInfo(`Language: ${language}`);
    logInfo(`Template style: ${config.preferences.templateStyle}`);
    logInfo(`Problem directory: ${result.problemDir}`);
    
    if (result.filesCreated.length > 0) {
      logInfo(`Created ${result.filesCreated.length} file(s)`);
    }
    if (result.filesSkipped.length > 0) {
      logInfo(`Skipped ${result.filesSkipped.length} existing file(s)`);
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
