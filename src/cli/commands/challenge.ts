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
  Problem,
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
import {
  confirmAction,
  formatProblemSummary,
  requireProblemManager,
  requireWorkspace,
} from './shared.ts';
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';
import { promptDifficulty, promptLanguage } from '../prompts.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'challenge',
    description: 'Start a new coding challenge',
    usage: [
      'algo-trainer challenge [difficulty]',
      'algo-trainer challenge <slug>',
      'algo-trainer challenge --random',
    ],
    options: [
      {
        flags: '-d, --difficulty <level>',
        description: 'Filter by difficulty (easy, medium, hard)',
      },
      { flags: '-c, --category <cat>', description: 'Filter by category' },
      { flags: '-t, --topic <topic>', description: 'Filter by topic' },
      {
        flags: '-l, --language <lang>',
        description: 'Override default language',
      },
      { flags: '-f, --force', description: 'Overwrite existing files' },
      {
        flags: '--random',
        description: 'Start random problem (any difficulty)',
      },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      {
        command: 'algo-trainer challenge easy',
        description: 'Start an easy random challenge',
      },
      {
        command: 'algo-trainer challenge two-sum',
        description: 'Start the "two-sum" problem',
      },
      {
        command: 'algo-trainer challenge -d medium',
        description: 'Start a medium difficulty challenge',
      },
      {
        command: 'algo-trainer challenge -d hard -c arrays',
        description: 'Start a hard array problem',
      },
      {
        command: 'algo-trainer challenge --random',
        description: 'Start any random problem',
      },
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
    difficulty: isDifficulty ? firstArg : ((args.difficulty || args.d) as string | undefined),
    category: (args.category || args.c) as string | undefined,
    topic: (args.topic || args.t) as string | undefined,
    language: (args.language || args.l) as string | undefined,
    force: Boolean(args.force || args.f),
    random: Boolean(args.random),
  };
}

const VALID_LANGUAGES: SupportedLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'cpp',
  'rust',
  'go',
];

export async function resolveProblemSelection(
  options: ChallengeOptions,
  manager: {
    getBySlug: (slug: string) => Problem | null;
    getRandom: (query: ProblemQuery) => Problem | null;
  },
): Promise<Problem | null> {
  if (options.slug) {
    const problem = manager.getBySlug(options.slug);
    if (!problem) {
      logger.error(`Problem not found: ${options.slug}`);
      logger.info(
        'Use "algo-trainer list" to see available problems, or try a search with "algo-trainer list -s <term>"',
      );
    }
    return problem;
  }

  const query: ProblemQuery = {};

  let difficulty = options.difficulty;
  if (!difficulty && !options.random) {
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
      return null;
    }
    query.difficulty = diffLower as Difficulty;
  }

  if (options.category) {
    query.tags = [options.category];
  }
  if (options.topic) {
    query.tags = query.tags ? [...query.tags, options.topic] : [options.topic];
  }

  const problem = manager.getRandom(query);
  if (!problem) {
    logger.error('No problems found matching the specified filters');
  }
  return problem;
}

export async function resolveLanguage(
  options: ChallengeOptions,
  configLanguage: string | undefined,
): Promise<SupportedLanguage | null> {
  const effectiveLanguage = options.language || configLanguage;

  let language: SupportedLanguage;
  if (!effectiveLanguage) {
    const prompted = await promptLanguage('typescript');
    if (prompted) {
      language = prompted;
      logger.info(`Selected language: ${language}`);
    } else {
      language = 'typescript';
    }
  } else {
    language = effectiveLanguage as SupportedLanguage;
  }

  if (!VALID_LANGUAGES.includes(language)) {
    logger.error(`Invalid language: ${effectiveLanguage}`);
    logger.info(`Valid languages: ${VALID_LANGUAGES.join(', ')}`);
    return null;
  }

  return language;
}

async function ensureWorkspaceInitialized(workspaceRoot: string): Promise<void> {
  const initialized = await isWorkspaceInitialized(workspaceRoot);
  if (!initialized) {
    logger.info('Workspace not initialized. Initializing now...');
    await initWorkspace(workspaceRoot);
    logger.info(`Workspace initialized at: ${workspaceRoot}`);
  }
}

type PrepareOutcome =
  | { status: 'ok'; result: Awaited<ReturnType<typeof generateProblemFiles>> }
  | { status: 'cancelled' }
  | { status: 'error' };

async function prepareWorkspaceForChallenge(
  problem: Problem,
  workspaceRoot: string,
  language: SupportedLanguage,
  config: ReturnType<typeof configManager.getConfig>,
  force: boolean,
): Promise<PrepareOutcome> {
  const exists = await problemExists(workspaceRoot, problem.slug, language);
  if (exists && !force) {
    logger.warn(`Problem '${problem.slug}' already exists in workspace`);
    logger.info('Use --force to overwrite existing files');

    const confirmed = await confirmAction('Do you want to overwrite existing files?', false);
    if (!confirmed) {
      logger.info('Operation cancelled');
      return { status: 'cancelled' };
    }
  }

  logger.info(`Generating files for: ${problem.title}`);
  const result = await generateProblemFiles({
    problem,
    workspaceRoot,
    language,
    templateStyle: config.preferences.templateStyle,
    overwritePolicy: force || exists ? 'overwrite' : 'skip',
  });

  if (!result.success) {
    logger.error(`Failed to generate problem files: ${result.error}`);
    return { status: 'error' };
  }

  return { status: 'ok', result };
}

function renderChallengeOutput(
  problem: Problem,
  result: Awaited<ReturnType<typeof generateProblemFiles>>,
  language: SupportedLanguage,
  config: ReturnType<typeof configManager.getConfig>,
): void {
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
}

async function loadTeachingGuidance(
  problem: Problem,
  workspaceRoot: string,
  config: ReturnType<typeof configManager.getConfig>,
): Promise<void> {
  if (!config.aiEnabled) return;

  try {
    const session = new TeachingSession(problem.slug);
    const engine = new TeachingEngine(session);
    const problemDir = join(workspaceRoot, 'problems', problem.slug);
    const loaded = await engine.loadScript(problemDir);

    if (!loaded) return;

    logger.newline();
    const intro = engine.getIntroduction();
    if (intro) {
      logger.log('📚 Teaching Guide');
      logger.separator(50, '═');
      logger.newline();
      logger.log(intro);
      logger.newline();
    }

    const prePrompt = engine.getPrePrompt();
    if (prePrompt) {
      logger.log('💡 Getting Started');
      logger.separator(50, '═');
      logger.newline();
      logger.log(prePrompt);
      logger.newline();
    }

    if (intro || prePrompt) {
      logger.info("💬 Use 'algo-trainer hint' for contextual hints during coding");
    }
  } catch (error) {
    logger.warn(
      'Note: Could not load teaching guidance: ' +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

export async function challengeCommand(args: Args): Promise<CommandResult> {
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractChallengeOptions(args);
    const config = configManager.getConfig();
    const workspaceRoot = config.workspace || Deno.cwd();

    await ensureWorkspaceInitialized(workspaceRoot);
    const _workspace = await requireWorkspace();
    const manager = await requireProblemManager();

    const problem = await resolveProblemSelection(options, manager);
    if (!problem) {
      if (
        options.difficulty && !['easy', 'medium', 'hard'].includes(options.difficulty.toLowerCase())
      ) {
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    }

    const language = await resolveLanguage(options, config.language);
    if (!language) {
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    const prepared = await prepareWorkspaceForChallenge(
      problem,
      workspaceRoot,
      language,
      config,
      options.force,
    );
    if (prepared.status === 'cancelled') {
      return { success: true, exitCode: ExitCode.SUCCESS };
    }
    if (prepared.status === 'error') {
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }

    renderChallengeOutput(problem, prepared.result, language, config);
    await loadTeachingGuidance(problem, workspaceRoot, config);

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    if (error instanceof WorkspaceError) {
      logger.error('Workspace error:', error.message);
      return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
    } else if (error instanceof ProblemError) {
      logger.error('Problem error:', error.message);
      return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
    } else {
      logger.error(
        'Unexpected error:',
        error instanceof Error ? error.message : String(error),
      );
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }
  }
}
