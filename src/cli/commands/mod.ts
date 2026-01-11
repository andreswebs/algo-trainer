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
import { challengeCommand } from './challenge.ts';
import { completeCommand } from './complete.ts';
import { hintCommand } from './hint.ts';
import { configCommand } from './config.ts';
import { initCommand } from './init.ts';

export type { CommandHandler } from '../types.ts';

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
      exitCode: 1,
    };
  }
  return await entry.handler(args);
}

export { challengeCommand } from './challenge.ts';
export { completeCommand } from './complete.ts';
export { hintCommand } from './hint.ts';
export { configCommand } from './config.ts';
export { initCommand } from './init.ts';
