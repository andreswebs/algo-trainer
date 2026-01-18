/**
 * Teach command handler
 *
 * Manages AI teaching scripts - generate, validate, and view information.
 *
 * @module cli/commands/teach
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode, getExitCodeForError } from '../exit-codes.ts';
import { logger } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import {
  TeachingScriptGenerator,
  validateTeachingScript,
} from '../../core/ai/mod.ts';
import { requireProblemManager, resolveProblem } from './shared.ts';
import { showCommandHelp } from './help.ts';
import { join } from '@std/path';
import { parse as parseYaml } from '@std/yaml';

function showHelp(): void {
  showCommandHelp({
    name: 'teach',
    description: 'Manage AI teaching scripts',
    usage: [
      'at teach generate <slug>',
      'at teach validate <path>',
      'at teach info',
    ],
    options: [
      { flags: '--output <path>', description: 'Output path for generated script' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at teach generate two-sum', description: 'Generate teaching script for "two-sum"' },
      { command: 'at teach generate two-sum --output ./trainer.yaml', description: 'Generate to specific file' },
      { command: 'at teach validate ./trainer.yaml', description: 'Validate a teaching script' },
      { command: 'at teach info', description: 'Show current teaching session info' },
    ],
  });
}

export interface TeachOptions {
  subcommand: string | undefined;
  problemSlug: string | undefined;
  path: string | undefined;
  output: string | undefined;
}

export function extractTeachOptions(args: Args): TeachOptions {
  const positionalArgs = args._.slice(1);
  return {
    subcommand: positionalArgs[0] as string | undefined,
    problemSlug: positionalArgs[1] as string | undefined,
    path: positionalArgs[1] as string | undefined,
    output: args.output as string | undefined,
  };
}

export async function teachCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractTeachOptions(args);
    const config = configManager.getConfig();

    if (!options.subcommand) {
      logger.error('Subcommand required. Usage: at teach <generate|validate|info>');
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    switch (options.subcommand) {
      case 'generate':
        return await handleGenerate(options, config);
      case 'validate':
        return await handleValidate(options);
      case 'info':
        return handleInfo(config);
      default:
        logger.error(`Unknown subcommand: ${options.subcommand}`);
        logger.info('Valid subcommands: generate, validate, info');
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }
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

async function handleGenerate(
  options: TeachOptions,
  config: ReturnType<typeof configManager.getConfig>,
): Promise<CommandResult> {
  if (!options.problemSlug) {
    logger.error('Problem slug required. Usage: at teach generate <slug>');
    return { success: false, exitCode: ExitCode.USAGE_ERROR };
  }

  // Get problem
  const manager = await requireProblemManager();
  const problem = resolveProblem(options.problemSlug, manager);
  if (!problem) {
    logger.error(`Problem '${options.problemSlug}' not found.`);
    return { success: false, exitCode: ExitCode.PROBLEM_ERROR };
  }

  // Generate script
  logger.info(`Generating teaching script for: ${problem.title}`);
  const generator = new TeachingScriptGenerator();
  const yamlContent = generator.generateYaml(problem);

  // Determine output path
  let outputPath: string;
  if (options.output) {
    outputPath = options.output;
  } else {
    // Default to workspace problem directory
    const problemDir = join(config.workspace, 'problems', problem.slug);
    outputPath = join(problemDir, 'trainer.yaml');
  }

  // Write file
  await Deno.writeTextFile(outputPath, yamlContent);

  logger.success(`Teaching script generated: ${outputPath}`);
  logger.info(`Language: ${problem.difficulty}`);
  logger.info(`Topics: ${problem.tags.join(', ')}`);

  return { success: true, exitCode: ExitCode.SUCCESS };
}

async function handleValidate(options: TeachOptions): Promise<CommandResult> {
  if (!options.path) {
    logger.error('Path required. Usage: at teach validate <path>');
    return { success: false, exitCode: ExitCode.USAGE_ERROR };
  }

  // Read and parse YAML file
  logger.info(`Validating teaching script: ${options.path}`);
  const content = await Deno.readTextFile(options.path);
  const script = parseYaml(content);

  // Validate
  const result = validateTeachingScript(script);

  if (!result.valid) {
    logger.error('Validation failed:');
    for (const error of result.errors) {
      logger.log(`  ❌ ${error}`);
    }
    return { success: false, exitCode: ExitCode.GENERAL_ERROR };
  }

  logger.success('✅ Teaching script is valid');

  return { success: true, exitCode: ExitCode.SUCCESS };
}

function handleInfo(
  config: ReturnType<typeof configManager.getConfig>,
): CommandResult {
  logger.log('\n📚 Teaching System Information\n');
  logger.log(`AI Enabled: ${config.aiEnabled ? '✅ Yes' : '❌ No'}`);
  logger.log(`Workspace: ${config.workspace || '(not set)'}`);

  if (!config.aiEnabled) {
    logger.log('\n💡 Enable AI features with: at config set aiEnabled true');
  }

  logger.log('');
  return { success: true, exitCode: ExitCode.SUCCESS };
}
