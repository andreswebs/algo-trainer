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
  const lines: string[] = [];

  // Header
  lines.push(`at ${help.name} - ${help.description}`);
  lines.push('');

  // Usage
  lines.push('USAGE:');
  help.usage.forEach((usage) => {
    lines.push(`    ${usage}`);
  });
  lines.push('');

  // Options
  if (help.options.length > 0) {
    lines.push('OPTIONS:');
    help.options.forEach((opt) => {
      lines.push(`    ${opt.flags.padEnd(30)} ${opt.description}`);
    });
    lines.push('');
  }

  // Examples
  if (help.examples.length > 0) {
    lines.push('EXAMPLES:');
    help.examples.forEach((example) => {
      lines.push(`    ${example.command.padEnd(40)} ${example.description}`);
    });
    lines.push('');
  }

  logger.log(lines.join('\n').trim());
}
