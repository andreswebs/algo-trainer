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
import { logError, logInfo, logSuccess } from '../../utils/output.ts';
import { resolve } from '@std/path';

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
        workspaceRoot = config.workspace;
      } catch {
        // Config not loaded, use current directory
        workspaceRoot = Deno.cwd();
      }
    }

    // Check if already initialized
    const alreadyInitialized = await isWorkspaceInitialized(workspaceRoot);

    if (alreadyInitialized && !options.force) {
      logInfo(`Workspace already initialized at: ${workspaceRoot}`);
      logInfo('Use --force to reinitialize');
      return {
        success: true,
        exitCode: ExitCode.SUCCESS,
      };
    }

    if (alreadyInitialized && options.force) {
      logInfo('Reinitializing existing workspace...');
    }

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Get structure for display
    const structure = getWorkspaceStructure(workspaceRoot);

    // Display success message with directory structure
    logSuccess(`Workspace initialized at: ${workspaceRoot}`);
    console.error('\nDirectory structure:');
    console.error(`  ${structure.problems}/     - Current challenges`);
    console.error(`  ${structure.completed}/   - Completed problems`);
    console.error(`  ${structure.templates}/   - Code templates`);
    console.error(`  ${structure.config}/      - Workspace config`);

    // Update config with new workspace path if it was explicitly provided
    if (options.path) {
      try {
        await configManager.updateConfig({ workspace: workspaceRoot });
        logInfo('Configuration updated with new workspace path');
      } catch (error) {
        // Log but don't fail if config update fails
        logInfo(`Note: Could not update configuration: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    logError(
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
