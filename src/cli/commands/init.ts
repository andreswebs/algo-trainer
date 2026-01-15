/**
 * Init command handler
 *
 * Initializes a new workspace.
 *
 * @module cli/commands/init
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode } from '../exit-codes.ts';
import { logSuccess } from '../../utils/output.ts';

export interface InitOptions {
  path: string | undefined;
  force: boolean;
}

export function extractInitOptions(args: Args): InitOptions {
  const positionalArgs = args._.slice(1);
  return {
    path: positionalArgs[0] as string | undefined,
    force: Boolean(args.force),
  };
}

export function initCommand(args: Args): Promise<CommandResult> {
  const options = extractInitOptions(args);
  logSuccess(`Init command called with options: ${JSON.stringify(options)}`);

  return Promise.resolve({
    success: true,
    exitCode: ExitCode.SUCCESS,
  });
}
