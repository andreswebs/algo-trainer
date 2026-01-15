/**
 * Complete command handler
 *
 * Marks a problem as completed.
 *
 * @module cli/commands/complete
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode } from '../exit-codes.ts';
import { logSuccess } from '../../utils/output.ts';

export interface CompleteOptions {
  problemSlug: string | undefined;
  notes: string | undefined;
}

export function extractCompleteOptions(args: Args): CompleteOptions {
  const positionalArgs = args._.slice(1);
  return {
    problemSlug: positionalArgs[0] as string | undefined,
    notes: args.notes as string | undefined,
  };
}

export function completeCommand(args: Args): Promise<CommandResult> {
  const options = extractCompleteOptions(args);
  logSuccess(`Complete command called with options: ${JSON.stringify(options)}`);

  return Promise.resolve({
    success: true,
    exitCode: ExitCode.SUCCESS,
  });
}
