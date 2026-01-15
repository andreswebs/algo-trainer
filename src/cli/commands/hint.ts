/**
 * Hint command handler
 *
 * Gets a hint for the current problem.
 *
 * @module cli/commands/hint
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode } from '../exit-codes.ts';
import { logSuccess } from '../../utils/output.ts';

export interface HintOptions {
  problemSlug: string | undefined;
  level: number | undefined;
}

export function extractHintOptions(args: Args): HintOptions {
  const positionalArgs = args._.slice(1);
  return {
    problemSlug: positionalArgs[0] as string | undefined,
    level: args.level !== undefined ? Number(args.level) : undefined,
  };
}

export function hintCommand(args: Args): Promise<CommandResult> {
  const options = extractHintOptions(args);
  logSuccess(`Hint command called with options: ${JSON.stringify(options)}`);

  return Promise.resolve({
    success: true,
    exitCode: ExitCode.SUCCESS,
  });
}
