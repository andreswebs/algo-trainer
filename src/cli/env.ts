/**
 * Environment variable configuration support
 *
 * Handles loading configuration from environment variables with the AT_* prefix.
 * Environment variables take precedence over config file settings.
 *
 * @module cli/env
 */

import type { Config, SupportedLanguage, UserPreferences } from '../types/global.ts';
import { logger } from '../utils/output.ts';

/**
 * Environment configuration with partial preferences
 */
export interface EnvConfig extends Omit<Partial<Config>, 'preferences'> {
  preferences?: Partial<UserPreferences>;
}

/**
 * Environment variable names for Algo Trainer configuration
 */
export const ENV_VARS = {
  /** Workspace directory path */
  WORKSPACE: 'AT_WORKSPACE',
  /** Default language (typescript, python, etc.) */
  LANGUAGE: 'AT_LANGUAGE',
  /** Enable verbose output (1/0, true/false) */
  VERBOSE: 'AT_VERBOSE',
  /** Enable quiet mode (1/0, true/false) */
  QUIET: 'AT_QUIET',
  /** Disable colors (1/0, true/false) */
  NO_COLOR: 'AT_NO_COLOR',
  /** Disable emoji (1/0, true/false) */
  NO_EMOJI: 'AT_NO_EMOJI',
  /** Custom config file path */
  CONFIG_PATH: 'AT_CONFIG_PATH',
  /** Template style (minimal, documented, comprehensive) */
  TEMPLATE_STYLE: 'AT_TEMPLATE_STYLE',
} as const;

/**
 * Supported language values
 */
const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'cpp',
  'rust',
  'go',
] as const;

/**
 * Supported template styles
 */
const SUPPORTED_TEMPLATE_STYLES: readonly UserPreferences['templateStyle'][] = [
  'minimal',
  'documented',
  'comprehensive',
] as const;

/**
 * Parse a boolean environment variable value
 *
 * Accepts: '1', 'true', 'yes', 'on' (case-insensitive) as true
 * Accepts: '0', 'false', 'no', 'off' (case-insensitive) as false
 *
 * @param value - Environment variable value
 * @returns Parsed boolean, or undefined if invalid/missing
 */
function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

/**
 * Validate and normalize a language value
 *
 * @param value - Language string
 * @returns Validated SupportedLanguage, or undefined if invalid
 */
function validateLanguage(value: string | undefined): SupportedLanguage | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage)
    ? (normalized as SupportedLanguage)
    : undefined;
}

/**
 * Validate and normalize a template style value
 *
 * @param value - Template style string
 * @returns Validated template style, or undefined if invalid
 */
function validateTemplateStyle(
  value: string | undefined,
): UserPreferences['templateStyle'] | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  return SUPPORTED_TEMPLATE_STYLES.includes(normalized as UserPreferences['templateStyle'])
    ? (normalized as UserPreferences['templateStyle'])
    : undefined;
}

/**
 * Load configuration from environment variables
 *
 * Reads AT_* environment variables and returns a partial config object
 * containing only the values that are set and valid. Invalid values are
 * ignored with a warning.
 *
 * @returns Partial configuration from environment variables
 */
export function loadEnvConfig(): EnvConfig {
  const envConfig: EnvConfig = {};
  const preferences: Partial<UserPreferences> = {};

  // Workspace directory
  const workspace = Deno.env.get(ENV_VARS.WORKSPACE);
  if (workspace?.trim()) {
    envConfig.workspace = workspace.trim();
  }

  // Default language
  const language = validateLanguage(Deno.env.get(ENV_VARS.LANGUAGE));
  if (language) {
    envConfig.language = language;
  } else if (Deno.env.get(ENV_VARS.LANGUAGE)) {
    logger.warn(
      `Warning: Invalid ${ENV_VARS.LANGUAGE} value. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    );
  }

  // Template style
  const templateStyle = validateTemplateStyle(Deno.env.get(ENV_VARS.TEMPLATE_STYLE));
  if (templateStyle) {
    preferences.templateStyle = templateStyle;
  } else if (Deno.env.get(ENV_VARS.TEMPLATE_STYLE)) {
    logger.warn(
      `Warning: Invalid ${ENV_VARS.TEMPLATE_STYLE} value. Supported: ${
        SUPPORTED_TEMPLATE_STYLES.join(', ')
      }`,
    );
  }

  // Verbosity (mutually exclusive with quiet)
  const verbose = parseBooleanEnv(Deno.env.get(ENV_VARS.VERBOSE));
  const quiet = parseBooleanEnv(Deno.env.get(ENV_VARS.QUIET));

  if (verbose !== undefined && quiet !== undefined && verbose && quiet) {
    logger.warn(
      `Warning: Both ${ENV_VARS.VERBOSE} and ${ENV_VARS.QUIET} are set. Using ${ENV_VARS.VERBOSE}.`,
    );
  }

  if (verbose !== undefined) {
    preferences.verbosity = verbose ? 'verbose' : 'normal';
  } else if (quiet !== undefined) {
    preferences.verbosity = quiet ? 'quiet' : 'normal';
  }

  // Color output
  const noColor = parseBooleanEnv(Deno.env.get(ENV_VARS.NO_COLOR));
  if (noColor !== undefined) {
    preferences.useColors = !noColor;
  }

  // Emoji output
  const noEmoji = parseBooleanEnv(Deno.env.get(ENV_VARS.NO_EMOJI));
  if (noEmoji !== undefined) {
    preferences.useEmoji = !noEmoji;
  }

  // Add preferences if any were set
  if (Object.keys(preferences).length > 0) {
    envConfig.preferences = preferences;
  }

  return envConfig;
}

/**
 * Get custom config path from environment
 *
 * @returns Custom config file path if set, undefined otherwise
 */
export function getEnvConfigPath(): string | undefined {
  const configPath = Deno.env.get(ENV_VARS.CONFIG_PATH);
  return configPath?.trim() || undefined;
}

/**
 * Get all environment variable documentation
 *
 * Returns a formatted string describing all supported environment variables
 * for use in help text and documentation.
 *
 * @returns Documentation string
 */
export function getEnvVarDocumentation(): string {
  return `
ENVIRONMENT VARIABLES:
    ${ENV_VARS.WORKSPACE}         Workspace directory path
    ${ENV_VARS.LANGUAGE}          Default language (${SUPPORTED_LANGUAGES.join(', ')})
    ${ENV_VARS.VERBOSE}           Enable verbose output (1/0, true/false)
    ${ENV_VARS.QUIET}             Enable quiet mode (1/0, true/false)
    ${ENV_VARS.NO_COLOR}          Disable colored output (1/0, true/false)
    ${ENV_VARS.NO_EMOJI}          Disable emoji in output (1/0, true/false)
    ${ENV_VARS.CONFIG_PATH}       Custom config file path
    ${ENV_VARS.TEMPLATE_STYLE}    Template style (${SUPPORTED_TEMPLATE_STYLES.join(', ')})

Note: Environment variables take precedence over configuration file settings.
`.trim();
}
