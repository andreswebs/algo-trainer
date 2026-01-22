/**
 * Config command handler
 *
 * Manages configuration settings.
 *
 * @module cli/commands/config
 */

import type { Args } from '@std/cli/parse-args';
import type { Config, SupportedLanguage, UserPreferences } from '../../types/global.ts';
import type { CommandResult } from '../../types/global.ts';
import { ExitCode } from '../exit-codes.ts';
import { logger, outputData } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import { DEFAULT_CONFIG } from '../../config/types.ts';
import { showCommandHelp } from './help.ts';
import { ValidationError } from '../../utils/errors.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'config',
    description: 'Manage configuration settings',
    usage: [
      'at config list',
      'at config get <key>',
      'at config set <key> <value>',
      'at config reset [key]',
    ],
    options: [
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at config list', description: 'List all configuration values' },
      { command: 'at config get language', description: 'Get the language setting' },
      { command: 'at config set language python', description: 'Set default language to Python' },
      { command: 'at config set preferences.theme dark', description: 'Set theme preference' },
      { command: 'at config reset language', description: 'Reset language to default' },
      { command: 'at config reset', description: 'Reset all settings to defaults' },
      { command: 'at config list --json', description: 'Get config as JSON' },
    ],
  });
}

export type ConfigSubcommand = 'get' | 'set' | 'list' | 'reset';

export interface ConfigOptions {
  subcommand: ConfigSubcommand | undefined;
  key: string | undefined;
  value: string | undefined;
  json: boolean;
}

/**
 * Valid configuration keys (supports dot notation for nested preferences)
 */
const VALID_KEYS = [
  'language',
  'workspace',
  'aiEnabled',
  'companies',
  'preferences.theme',
  'preferences.verbosity',
  'preferences.autoSave',
  'preferences.templateStyle',
  'preferences.useEmoji',
  'preferences.useColors',
] as const;

type ValidConfigKey = typeof VALID_KEYS[number];

/**
 * Extract config options from command arguments
 */
export function extractConfigOptions(args: Args): ConfigOptions {
  const positionalArgs = args._.slice(1);
  return {
    subcommand: positionalArgs[0] as ConfigSubcommand | undefined,
    key: positionalArgs[1] as string | undefined,
    value: positionalArgs[2] as string | undefined,
    json: !!args.json,
  };
}

/**
 * Get value from config using dot notation
 */
function getConfigValue(config: Config, key: string): unknown {
  if (key.startsWith('preferences.')) {
    const prefKey = key.substring('preferences.'.length) as keyof UserPreferences;
    return config.preferences[prefKey];
  }
  return config[key as keyof Config];
}

/**
 * Validate and parse value based on key
 */
function parseConfigValue(key: string, value: string): unknown {
  // Boolean values
  if (
    key === 'aiEnabled' ||
    key === 'preferences.autoSave' ||
    key === 'preferences.useEmoji' ||
    key === 'preferences.useColors'
  ) {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    throw new ValidationError(
      `Invalid boolean value: ${value}. Valid options: true, false, 1, 0, yes, no`,
      { key, value, validOptions: ['true', 'false', '1', '0', 'yes', 'no'] },
    );
  }

  // String arrays
  if (key === 'companies') {
    return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // Enums with validation
  if (key === 'language') {
    const validLanguages: SupportedLanguage[] = [
      'typescript',
      'javascript',
      'python',
      'java',
      'cpp',
      'rust',
      'go',
    ];
    if (!validLanguages.includes(value as SupportedLanguage)) {
      throw new ValidationError(
        `Invalid language: ${value}. Valid options: ${validLanguages.join(', ')}`,
        { key, value, validOptions: validLanguages },
      );
    }
    return value;
  }

  if (key === 'preferences.theme') {
    const validOptions = ['light', 'dark', 'auto'];
    if (!validOptions.includes(value)) {
      throw new ValidationError(
        `Invalid theme: ${value}. Valid options: ${validOptions.join(', ')}`,
        { key, value, validOptions },
      );
    }
    return value;
  }

  if (key === 'preferences.verbosity') {
    const validOptions = ['quiet', 'normal', 'verbose'];
    if (!validOptions.includes(value)) {
      throw new ValidationError(
        `Invalid verbosity: ${value}. Valid options: ${validOptions.join(', ')}`,
        { key, value, validOptions },
      );
    }
    return value;
  }

  if (key === 'preferences.templateStyle') {
    const validOptions = ['minimal', 'documented', 'comprehensive'];
    if (!validOptions.includes(value)) {
      throw new ValidationError(
        `Invalid template style: ${value}. Valid options: ${validOptions.join(', ')}`,
        { key, value, validOptions },
      );
    }
    return value;
  }

  // String values
  return value;
}

/**
 * Set config value using dot notation
 */
async function setConfigValue(key: string, value: unknown): Promise<void> {
  if (key.startsWith('preferences.')) {
    const prefKey = key.substring('preferences.'.length) as keyof UserPreferences;
    await configManager.updatePreferences({ [prefKey]: value });
  } else {
    await configManager.updateConfig({ [key]: value } as Partial<Config>);
  }
}

/**
 * List all configuration values
 */
function configList(json: boolean): CommandResult {
  try {
    const config = configManager.getConfig();

    if (json) {
      // Output as JSON for machine consumption
      outputData(config);
    } else {
      // Human-readable table format
      logger.info('Current configuration:');
      logger.newline();

      // Top-level settings
      logger.keyValue('language', config.language, 20);
      logger.keyValue('workspace', config.workspace || '(not set)', 20);
      logger.keyValue('aiEnabled', config.aiEnabled, 20);
      logger.keyValue(
        'companies',
        config.companies.length > 0 ? config.companies.join(', ') : '(none)',
        20,
      );
      logger.newline();

      // Preferences
      logger.section('Preferences', 2);
      logger.group();
      logger.keyValue('theme', config.preferences.theme, 20);
      logger.keyValue('verbosity', config.preferences.verbosity, 20);
      logger.keyValue('autoSave', config.preferences.autoSave, 20);
      logger.keyValue('templateStyle', config.preferences.templateStyle, 20);
      logger.keyValue('useEmoji', config.preferences.useEmoji, 20);
      logger.keyValue('useColors', config.preferences.useColors, 20);
      logger.groupEnd();
      logger.newline();

      // Version info
      logger.keyValue('version', config.version, 20);
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logger.error(
      'Failed to list configuration',
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, exitCode: ExitCode.CONFIG_ERROR };
  }
}

/**
 * Get a specific configuration value
 */
function configGet(key: string, json: boolean): CommandResult {
  try {
    // Validate key
    if (!VALID_KEYS.includes(key as ValidConfigKey)) {
      logger.error(`Invalid configuration key: ${key}`);
      logger.info(`Valid keys: ${VALID_KEYS.join(', ')}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    const config = configManager.getConfig();
    const value = getConfigValue(config, key);

    if (json) {
      // Output as JSON
      outputData({ [key]: value });
    } else {
      // Human-readable format
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      logger.log(`${key} = ${displayValue}`);
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logger.error(
      'Failed to get configuration value',
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, exitCode: ExitCode.CONFIG_ERROR };
  }
}

/**
 * Set a configuration value
 */
async function configSet(key: string, value: string): Promise<CommandResult> {
  try {
    // Validate key
    if (!VALID_KEYS.includes(key as ValidConfigKey)) {
      logger.error(`Invalid configuration key: ${key}`);
      logger.info(`Valid keys: ${VALID_KEYS.join(', ')}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    // Parse and validate value
    const parsedValue = parseConfigValue(key, value);

    // Set the value
    await setConfigValue(key, parsedValue);

    logger.success(`Set ${key} = ${value}`);
    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logger.error(
      'Failed to set configuration value',
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, exitCode: ExitCode.CONFIG_ERROR };
  }
}

/**
 * Reset configuration to defaults
 */
async function configReset(key?: string): Promise<CommandResult> {
  try {
    if (key) {
      // Reset specific key
      if (!VALID_KEYS.includes(key as ValidConfigKey)) {
        logger.error(`Invalid configuration key: ${key}`);
        logger.info(`Valid keys: ${VALID_KEYS.join(', ')}`);
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }

      const defaultValue = getConfigValue(DEFAULT_CONFIG, key);
      await setConfigValue(key, defaultValue);

      logger.success(`Reset ${key} to default value`);
    } else {
      // Reset all configuration
      await configManager.reset();
      logger.success('Configuration reset to defaults');
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logger.error(
      'Failed to reset configuration',
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, exitCode: ExitCode.CONFIG_ERROR };
  }
}

/**
 * Main config command handler
 */
export async function configCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  const options = extractConfigOptions(args);

  // Default to 'list' if no subcommand provided
  const subcommand = options.subcommand || 'list';

  switch (subcommand) {
    case 'list':
      return configList(options.json);

    case 'get':
      if (!options.key) {
        logger.error('Key is required for "get" subcommand');
        logger.info('Usage: at config get <key>');
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }
      return configGet(options.key, options.json);

    case 'set':
      if (!options.key || !options.value) {
        logger.error('Key and value are required for "set" subcommand');
        logger.info('Usage: at config set <key> <value>');
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }
      return await configSet(options.key, options.value);

    case 'reset':
      return await configReset(options.key);

    default:
      logger.error(`Unknown subcommand: ${subcommand}`);
      logger.info('Valid subcommands: list, get, set, reset');
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
  }
}
