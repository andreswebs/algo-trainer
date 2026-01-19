/**
 * Challenge command handler
 *
 * Starts a new coding challenge with the specified difficulty or topic.
 *
 * @module cli/commands/challenge
 */

import type { Args } from '@std/cli/parse-args';
import type {
  CommandResult,
  Difficulty,
  ProblemQuery,
  SupportedLanguage,
} from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import {
  generateProblemFiles,
  initWorkspace,
  isWorkspaceInitialized,
  problemExists,
} from '../../core/mod.ts';
import { TeachingEngine, TeachingSession } from '../../core/ai/mod.ts';
import { join } from '@std/path';
import { ExitCode } from '../exit-codes.ts';
import { logger } from '../../utils/output.ts';
import { confirmAction, formatProblemSummary, requireProblemManager } from './shared.ts';
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';
import { promptDifficulty, promptLanguage } from '../prompts.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'challenge',
    description: 'Start a new coding challenge',
    usage: [
      'at challenge [difficulty]',
      'at challenge <slug>',
      'at challenge --random',
    ],
    options: [
      {
        flags: '-d, --difficulty <level>',
        description: 'Filter by difficulty (easy, medium, hard)',
      },
      { flags: '-c, --category <cat>', description: 'Filter by category' },
      { flags: '-t, --topic <topic>', description: 'Filter by topic' },
      { flags: '-l, --language <lang>', description: 'Override default language' },
      { flags: '-f, --force', description: 'Overwrite existing files' },
      { flags: '--random', description: 'Start random problem (any difficulty)' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at challenge easy', description: 'Start an easy random challenge' },
      { command: 'at challenge two-sum', description: 'Start the "two-sum" problem' },
      { command: 'at challenge -d medium', description: 'Start a medium difficulty challenge' },
      { command: 'at challenge -d hard -c arrays', description: 'Start a hard array problem' },
      { command: 'at challenge --random', description: 'Start any random problem' },
    ],
  });
}

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
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractChallengeOptions(args);
    const config = configManager.getConfig();

    // Validate workspace is initialized
    const workspaceRoot = config.workspace || Deno.cwd();
    if (!await isWorkspaceInitialized(workspaceRoot)) {
      // Initialize workspace if it doesn't exist
      logger.info(`Workspace not initialized at: ${workspaceRoot}`);
      logger.info('Initializing workspace...');
      await initWorkspace(workspaceRoot);
      logger.success('Workspace initialized');
    }

    // Initialize problem manager
    const manager = await requireProblemManager();

    // Get problem (by slug or random with filters)
    let problem;
    if (options.slug) {
      // Get specific problem by slug
      problem = manager.getBySlug(options.slug);
      if (!problem) {
        logger.error(`Problem not found: ${options.slug}`);
        logger.info('Use "at list" to see available problems, or try a search with "at list -s <term>"');
        return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
      }
    } else {
      // Get random problem with filters
      const query: ProblemQuery = {};

      // Prompt for difficulty if not provided and interactive
      let difficulty = options.difficulty;
      if (!difficulty && !options.random) {
        // Note: config.preferences doesn't have difficulty field,
        // so we default to undefined (will show all options)
        const prompted = await promptDifficulty();
        if (prompted) {
          difficulty = prompted;
          logger.info(`Selected difficulty: ${difficulty}`);
        }
      }

      if (difficulty) {
        const diffLower = difficulty.toLowerCase();
        if (!['easy', 'medium', 'hard'].includes(diffLower)) {
          logger.error(`Invalid difficulty: ${difficulty}`);
          logger.info('Valid difficulties: easy, medium, hard');
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
        logger.error('No problems found matching the specified filters');
        return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
      }
    }

    // Determine language (prompt if not provided)
    let language: SupportedLanguage;
    const configLanguage = options.language || config.language;
    if (!configLanguage) {
      const prompted = await promptLanguage('typescript');
      if (prompted) {
        language = prompted;
        logger.info(`Selected language: ${language}`);
      } else {
        // Use default if prompt returns null (non-interactive)
        language = 'typescript';
      }
    } else {
      language = configLanguage as SupportedLanguage;
    }

    // Validate language
    const validLanguages: SupportedLanguage[] = [
      'typescript',
      'javascript',
      'python',
      'java',
      'cpp',
      'rust',
      'go',
    ];
    if (!validLanguages.includes(language)) {
      logger.error(`Invalid language: ${configLanguage}`);
      logger.info(`Valid languages: ${validLanguages.join(', ')}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    // Check if problem already exists
    const exists = await problemExists(workspaceRoot, problem.slug, language);
    if (exists && !options.force) {
      logger.warn(`Problem '${problem.slug}' already exists in workspace`);
      logger.info('Use --force to overwrite existing files');

      const confirmed = await confirmAction('Do you want to overwrite existing files?', false);
      if (!confirmed) {
        logger.info('Operation cancelled');
        return { success: true, exitCode: ExitCode.SUCCESS };
      }
    }

    // Generate problem files
    logger.info(`Generating files for: ${problem.title}`);
    const result = await generateProblemFiles({
      problem,
      workspaceRoot,
      language,
      templateStyle: config.preferences.templateStyle,
      overwritePolicy: options.force || exists ? 'overwrite' : 'skip',
    });

    if (!result.success) {
      logger.error(`Failed to generate problem files: ${result.error}`);
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }

    // Display success message with problem summary
    logger.success(`Started challenge: ${problem.title}`);
    logger.newline();
    logger.log(formatProblemSummary(problem));
    logger.newline();

    logger.info(`Language: ${language}`);
    logger.info(`Template style: ${config.preferences.templateStyle}`);
    logger.info(`Problem directory: ${result.problemDir}`);

    if (result.filesCreated.length > 0) {
      logger.info(`Created ${result.filesCreated.length} file(s)`);
    }
    if (result.filesSkipped.length > 0) {
      logger.info(`Skipped ${result.filesSkipped.length} existing file(s)`);
    }

    // Load and display teaching script if AI is enabled
    if (config.aiEnabled) {
      try {
        const session = new TeachingSession(problem.slug);
        const engine = new TeachingEngine(session);

        // Try to load teaching script from problem directory
        const problemDir = join(workspaceRoot, 'problems', problem.slug);
        const loaded = await engine.loadScript(problemDir);

        if (loaded) {
          logger.newline();

          // Display introduction message
          const intro = engine.getIntroduction();
          if (intro) {
            logger.log('📚 Teaching Guide');
            logger.separator(50, '═');
            logger.newline();
            logger.log(intro);
            logger.newline();
          }

          // Display pre-prompt guidance
          const prePrompt = engine.getPrePrompt();
          if (prePrompt) {
            logger.log('💡 Getting Started');
            logger.separator(50, '═');
            logger.newline();
            logger.log(prePrompt);
            logger.newline();
          }

          if (intro || prePrompt) {
            logger.info('💬 Use \'at hint\' for contextual hints during coding');
          }
        }
      } catch (error) {
        // Teaching system errors are non-fatal, just log a warning
        logger.warn('Note: Could not load teaching guidance: ' + (error instanceof Error ? error.message : String(error)));
      }
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    if (error instanceof WorkspaceError) {
      logger.error('Workspace error:', error.message);
      return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
    } else if (error instanceof ProblemError) {
      logger.error('Problem error:', error.message);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    } else {
      logger.error('Unexpected error:', error instanceof Error ? error.message : String(error));
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }
  }
}
