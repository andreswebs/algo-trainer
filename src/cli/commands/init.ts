/**
 * Init command handler
 *
 * Initializes a new workspace.
 *
 * @module cli/commands/init
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { getWorkspaceStructure, initWorkspace, isWorkspaceInitialized } from '../../core/mod.ts';
import { ExitCode, getExitCodeForError } from '../exit-codes.ts';
import { logger } from '../../utils/output.ts';
import { resolve } from '@std/path';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'init',
    description: 'Initialize a new workspace',
    usage: ['algo-trainer init [path]'],
    options: [
      { flags: '-f, --force', description: 'Reinitialize existing workspace' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      {
        command: 'algo-trainer init',
        description: 'Initialize in current directory',
      },
      {
        command: 'algo-trainer init ~/my-practice',
        description: 'Initialize algo-trainer specific path',
      },
      {
        command: 'algo-trainer init --force',
        description: 'Reinitialize existing workspace',
      },
    ],
  });
}

export interface InitOptions {
  path: string | undefined;
  force: boolean;
}

export function extractInitOptions(args: Args): InitOptions {
  const positionalArgs = args._.slice(1);
  return {
    path: positionalArgs[0] as string | undefined,
    force: Boolean(args.force || args.f),
  };
}

export async function initCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const options = extractInitOptions(args);

    // Resolve workspace path with precedence: CLI arg > config > current directory
    let workspaceRoot: string;
    if (options.path) {
      // Use provided path (resolve to absolute)
      workspaceRoot = resolve(options.path);
    } else {
      try {
        const config = configManager.getConfig();
        // Use config workspace if it's not empty, otherwise use current directory
        workspaceRoot = config.workspace && config.workspace.trim().length > 0
          ? config.workspace
          : Deno.cwd();
      } catch {
        // Config not loaded, use current directory
        workspaceRoot = Deno.cwd();
      }
    }

    // Check if already initialized
    const alreadyInitialized = await isWorkspaceInitialized(workspaceRoot);

    if (alreadyInitialized && !options.force) {
      logger.info(`Workspace already initialized at: ${workspaceRoot}`);
      logger.info('Use --force to reinitialize');
      // Return success for idempotency - workspace is already in desired state
      return {
        success: true,
        exitCode: ExitCode.SUCCESS,
      };
    }

    if (alreadyInitialized && options.force) {
      logger.info('Reinitializing existing workspace...');
    }

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Get structure for display
    const structure = getWorkspaceStructure(workspaceRoot);

    // Display success message with directory structure
    logger.success(`Workspace initialized at: ${workspaceRoot}`);
    logger.newline();
    logger.log('Directory structure:');
    logger.log(`  ${structure.problems}/     - Current challenges`);
    logger.log(`  ${structure.completed}/   - Completed problems`);
    logger.log(`  ${structure.templates}/   - Code templates`);
    logger.log(`  ${structure.config}/      - Workspace config`);

    // Update config with new workspace path if it was explicitly provided
    if (options.path) {
      try {
        await configManager.updateConfig({ workspace: workspaceRoot });
        logger.info('Configuration updated with new workspace path');
      } catch (error) {
        // Log but don't fail if config update fails
        logger.info(
          `Note: Could not update configuration: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    logger.error(
      'Failed to initialize workspace',
      error instanceof Error ? error.message : String(error),
    );
    return {
      success: false,
      exitCode: getExitCodeForError(error),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
