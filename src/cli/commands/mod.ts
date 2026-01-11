/**
 * Command registry and dispatcher
 *
 * Central module for registering and dispatching CLI commands.
 *
 * @module cli/commands/mod
 */

import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { challengeCommand } from './challenge.ts';
import { completeCommand } from './complete.ts';
import { hintCommand } from './hint.ts';
import { configCommand } from './config.ts';
import { initCommand } from './init.ts';

export type CommandHandler = (args: Args) => Promise<CommandResult>;

const commands: Record<string, CommandHandler> = {
  challenge: challengeCommand,
  complete: completeCommand,
  hint: hintCommand,
  config: configCommand,
  init: initCommand,
};

export function getAvailableCommands(): string[] {
  return Object.keys(commands);
}

export async function dispatch(command: string, args: Args): Promise<CommandResult> {
  const handler = commands[command];
  if (!handler) {
    return {
      success: false,
      error: `Unknown command: ${command}. Available commands: ${
        getAvailableCommands().join(', ')
      }`,
      exitCode: 1,
    };
  }
  return await handler(args);
}

export { challengeCommand } from './challenge.ts';
export { completeCommand } from './complete.ts';
export { hintCommand } from './hint.ts';
export { configCommand } from './config.ts';
export { initCommand } from './init.ts';
