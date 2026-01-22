/**
 * Command help utilities
 *
 * Provides utilities for displaying command-specific help messages.
 *
 * @module cli/commands/help
 */

import { logger } from '../../utils/output.ts';

export interface CommandHelp {
  name: string;
  description: string;
  usage: string[];
  options: Array<{ flags: string; description: string }>;
  examples: Array<{ command: string; description: string }>;
}

/**
 * Format and display command help
 */
export function showCommandHelp(help: CommandHelp): void {
  // Header
  logger.log(`algo-trainer ${help.name} - ${help.description}`);
  logger.newline();

  // Usage
  logger.log('USAGE:');
  help.usage.forEach((usage) => {
    logger.log(`    ${usage}`);
  });
  logger.newline();

  // Options
  if (help.options.length > 0) {
    logger.log('OPTIONS:');

    // Calculate the maximum width needed for flags column
    const maxFlagWidth = Math.max(
      ...help.options.map((opt) => opt.flags.length),
    );
    const flagWidth = Math.min(maxFlagWidth + 2, 35); // Cap at 35 for very long flags

    help.options.forEach((opt) => {
      logger.log(`    ${opt.flags.padEnd(flagWidth)} ${opt.description}`);
    });
    logger.newline();
  }

  // Examples
  if (help.examples.length > 0) {
    logger.log('EXAMPLES:');

    // Calculate the maximum width needed for command column
    const maxCommandWidth = Math.max(
      ...help.examples.map((ex) => ex.command.length),
    );
    const commandWidth = Math.min(maxCommandWidth + 2, 50); // Cap at 50 for very long commands

    help.examples.forEach((example) => {
      logger.log(
        `    ${example.command.padEnd(commandWidth)} ${example.description}`,
      );
    });
    logger.newline();
  }
}
