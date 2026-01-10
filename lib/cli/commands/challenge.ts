/**
 * Challenge command handler
 *
 * Starts a new coding challenge with the specified difficulty or topic.
 *
 * @module cli/commands/challenge
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { logSuccess } from '../../utils/output.ts';

export interface ChallengeOptions {
  difficulty: string | undefined;
  topic: string | undefined;
  random: boolean;
}

export function extractChallengeOptions(args: Args): ChallengeOptions {
  const positionalArgs = args._.slice(1);
  return {
    difficulty: positionalArgs[0] as string | undefined,
    topic: args.topic as string | undefined,
    random: Boolean(args.random),
  };
}

export function challengeCommand(args: Args): Promise<CommandResult> {
  const options = extractChallengeOptions(args);
  logSuccess(`Challenge command called with options: ${JSON.stringify(options)}`);

  return Promise.resolve({
    success: true,
    exitCode: 0,
  });
}
