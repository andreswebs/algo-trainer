/**
 * Command registry and dispatcher
 *
 * Central module for registering and dispatching CLI commands.
 *
 * @module cli/commands/mod
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import type { CommandHandler } from '../types.ts';
import { ExitCode } from '../exit-codes.ts';
import { challengeCommand } from './challenge.ts';
import { completeCommand } from './complete.ts';
import { hintCommand } from './hint.ts';
import { configCommand } from './config.ts';
import { initCommand } from './init.ts';
import { listCommand } from './list.ts';
import { progressCommand } from './progress.ts';
import { teachCommand } from './teach.ts';

export type { CommandHandler } from '../types.ts';
export { ExitCode } from '../exit-codes.ts';

interface CommandEntry {
  handler: CommandHandler;
  description: string;
}

const commands: Record<string, CommandEntry> = {
  challenge: { handler: challengeCommand, description: 'Start a new coding challenge' },
  complete: { handler: completeCommand, description: 'Mark a problem as completed' },
  hint: { handler: hintCommand, description: 'Get a hint for the current problem' },
  config: { handler: configCommand, description: 'Manage configuration settings' },
  init: { handler: initCommand, description: 'Initialize a new workspace' },
  list: { handler: listCommand, description: 'List and filter available problems' },
  progress: { handler: progressCommand, description: 'View progress stats and completion' },
  teach: { handler: teachCommand, description: 'Manage AI teaching scripts' },
};

export function getAvailableCommands(): Array<{ name: string; description: string }> {
  return Object.entries(commands).map(([name, entry]) => ({
    name,
    description: entry.description,
  }));
}

export async function dispatch(command: string, args: Args): Promise<CommandResult> {
  const entry = commands[command];
  if (!entry) {
    const availableNames = getAvailableCommands().map((cmd) => cmd.name).join(', ');
    return {
      success: false,
      error: `Unknown command: ${command}. Available commands: ${availableNames}`,
      exitCode: ExitCode.USAGE_ERROR,
    };
  }
  return await entry.handler(args);
}

export { challengeCommand } from './challenge.ts';
export { completeCommand } from './complete.ts';
export { hintCommand } from './hint.ts';
export { configCommand } from './config.ts';
export { initCommand } from './init.ts';
export { listCommand } from './list.ts';
export { progressCommand } from './progress.ts';
export { teachCommand } from './teach.ts';
