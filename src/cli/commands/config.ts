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
import { logError, logInfo, logSuccess, outputData } from '../../utils/output.ts';
import { configManager } from '../../config/manager.ts';
import { DEFAULT_CONFIG } from '../../config/types.ts';
import { showCommandHelp } from './help.ts';

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
    throw new Error(`Invalid boolean value: ${value}. Use true/false, 1/0, or yes/no.`);
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
      throw new Error(
        `Invalid language: ${value}. Supported: ${validLanguages.join(', ')}`,
      );
    }
    return value;
  }

  if (key === 'preferences.theme') {
    if (!['light', 'dark', 'auto'].includes(value)) {
      throw new Error(`Invalid theme: ${value}. Supported: light, dark, auto`);
    }
    return value;
  }

  if (key === 'preferences.verbosity') {
    if (!['quiet', 'normal', 'verbose'].includes(value)) {
      throw new Error(`Invalid verbosity: ${value}. Supported: quiet, normal, verbose`);
    }
    return value;
  }

  if (key === 'preferences.templateStyle') {
    if (!['minimal', 'documented', 'comprehensive'].includes(value)) {
      throw new Error(
        `Invalid template style: ${value}. Supported: minimal, documented, comprehensive`,
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
      logInfo('Current configuration:');
      console.error(''); // Empty line

      // Top-level settings
      console.error('  language:            ' + config.language);
      console.error('  workspace:           ' + (config.workspace || '(not set)'));
      console.error('  aiEnabled:           ' + config.aiEnabled);
      console.error(
        '  companies:           ' +
          (config.companies.length > 0 ? config.companies.join(', ') : '(none)'),
      );
      console.error('');

      // Preferences
      console.error('  Preferences:');
      console.error('    theme:             ' + config.preferences.theme);
      console.error('    verbosity:         ' + config.preferences.verbosity);
      console.error('    autoSave:          ' + config.preferences.autoSave);
      console.error('    templateStyle:     ' + config.preferences.templateStyle);
      console.error('    useEmoji:          ' + config.preferences.useEmoji);
      console.error('    useColors:         ' + config.preferences.useColors);
      console.error('');

      // Version info
      console.error('  version:             ' + config.version);
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logError(
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
      logError(`Invalid configuration key: ${key}`);
      logInfo(`Valid keys: ${VALID_KEYS.join(', ')}`);
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
      console.log(`${key} = ${displayValue}`);
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logError(
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
      logError(`Invalid configuration key: ${key}`);
      logInfo(`Valid keys: ${VALID_KEYS.join(', ')}`);
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
    }

    // Parse and validate value
    const parsedValue = parseConfigValue(key, value);

    // Set the value
    await setConfigValue(key, parsedValue);

    logSuccess(`Set ${key} = ${value}`);
    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logError(
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
        logError(`Invalid configuration key: ${key}`);
        logInfo(`Valid keys: ${VALID_KEYS.join(', ')}`);
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }

      const defaultValue = getConfigValue(DEFAULT_CONFIG, key);
      await setConfigValue(key, defaultValue);

      logSuccess(`Reset ${key} to default value`);
    } else {
      // Reset all configuration
      await configManager.reset();
      logSuccess('Configuration reset to defaults');
    }

    return { success: true, exitCode: ExitCode.SUCCESS };
  } catch (error) {
    logError(
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
        logError('Key is required for "get" subcommand');
        logInfo('Usage: at config get <key>');
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }
      return configGet(options.key, options.json);

    case 'set':
      if (!options.key || !options.value) {
        logError('Key and value are required for "set" subcommand');
        logInfo('Usage: at config set <key> <value>');
        return { success: false, exitCode: ExitCode.USAGE_ERROR };
      }
      return await configSet(options.key, options.value);

    case 'reset':
      return await configReset(options.key);

    default:
      logError(`Unknown subcommand: ${subcommand}`);
      logInfo('Valid subcommands: list, get, set, reset');
      return { success: false, exitCode: ExitCode.USAGE_ERROR };
  }
}
