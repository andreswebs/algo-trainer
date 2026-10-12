/**
 * Configuration manager
 *
 * Handles reading, writing, and validating application configuration
 * following XDG Base Directory Specification.
 *
 * @module config/manager
 */

import { createDirectory, pathExists, readJsonFile, writeJsonFile } from '../utils/fs.ts';
import { validateConfig, validateOrThrow } from '../utils/validation.ts';
import { ConfigError, createErrorContext } from '../utils/errors.ts';
import { logger } from '../utils/output.ts';
import { getConfigFilePaths, getConfigPaths } from './paths.ts';
import { DEFAULT_CONFIG } from './types.ts';
import { type EnvConfig, getEnvConfigPath, loadEnvConfig } from '../cli/env.ts';
import type { Config, SupportedLanguage, UserPreferences } from '../types/global.ts';

/**
 * Configuration manager class
 */
export class ConfigManager {
  private config: Config | null = null;
  // Only the file layer is persisted; env overrides apply in memory on top of it.
  private fileConfig: Config | null = null;
  private envConfig: EnvConfig = {};
  private configPath: string;

  constructor() {
    // Allow environment variable to override config path
    this.configPath = getEnvConfigPath() ?? getConfigFilePaths().main;
  }

  /**
   * Load configuration from file
   *
   * Configuration is loaded with the following precedence (highest to lowest):
   * 1. Environment variables (AT_*)
   * 2. Configuration file
   * 3. Default values
   */
  async load(): Promise<Config> {
    try {
      // Start with defaults
      let mergedConfig: Config = { ...DEFAULT_CONFIG };

      // Check if config file exists and merge
      if (await pathExists(this.configPath)) {
        const configData = await readJsonFile<Config>(this.configPath);

        // Validate loaded config
        const validation = validateConfig(configData);
        if (!validation.valid) {
          throw new ConfigError(
            `Invalid configuration: ${validation.errors.join(', ')}`,
            createErrorContext('loadConfig', { path: this.configPath }),
          );
        }

        // Merge file config with defaults (file config takes precedence)
        mergedConfig = {
          ...mergedConfig,
          ...configData,
          preferences: {
            ...mergedConfig.preferences,
            ...configData.preferences,
          },
        };
        this.fileConfig = mergedConfig;
      } else {
        logger.info('No configuration found, creating default configuration');
        this.fileConfig = mergedConfig;
        await this.save();
      }

      this.envConfig = loadEnvConfig();
      this.applyEnv();
      return this.getConfig();
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        `Failed to load configuration: ${String(error)}`,
        createErrorContext('loadConfig', {
          path: this.configPath,
          error: String(error),
        }),
      );
    }
  }

  /**
   * Recompute the effective configuration: file layer overlaid with env overrides
   */
  private applyEnv(): void {
    if (!this.fileConfig) return;
    this.config = {
      ...this.fileConfig,
      ...this.envConfig,
      preferences: {
        ...this.fileConfig.preferences,
        ...(this.envConfig.preferences || {}),
      },
    };
  }

  /**
   * Save the file layer of the configuration (without env overrides) to file
   */
  async save(): Promise<void> {
    if (!this.fileConfig) {
      throw new ConfigError(
        'No configuration to save',
        createErrorContext('saveConfig', { path: this.configPath }),
      );
    }

    try {
      // Ensure config directory exists
      const configPaths = getConfigPaths();
      await createDirectory(configPaths.config);

      validateOrThrow(this.fileConfig, validateConfig, 'configuration');

      await writeJsonFile(this.configPath, this.fileConfig, {
        ensureParents: true,
        overwrite: true,
        indent: 2,
      });

      logger.info('Configuration saved successfully');
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        `Failed to save configuration: ${String(error)}`,
        createErrorContext('saveConfig', {
          path: this.configPath,
          error: String(error),
        }),
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    if (!this.config) {
      throw new ConfigError(
        'Configuration not loaded',
        createErrorContext('getConfig'),
      );
    }
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<Config>): Promise<void> {
    if (!this.fileConfig) {
      throw new ConfigError(
        'Configuration not loaded',
        createErrorContext('updateConfig'),
      );
    }

    const mergedPreferences = updates.preferences
      ? { ...this.fileConfig.preferences, ...updates.preferences }
      : this.fileConfig.preferences;

    this.fileConfig = {
      ...this.fileConfig,
      ...updates,
      preferences: mergedPreferences,
    };
    this.applyEnv();

    await this.save();
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<void> {
    if (!this.fileConfig) {
      throw new ConfigError(
        'Configuration not loaded',
        createErrorContext('updatePreferences'),
      );
    }

    this.fileConfig = {
      ...this.fileConfig,
      preferences: { ...this.fileConfig.preferences, ...preferences },
    };
    this.applyEnv();
    await this.save();
  }

  /**
   * Set default language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    await this.updateConfig({ language });
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.fileConfig = { ...DEFAULT_CONFIG };
    this.applyEnv();
    await this.save();
    logger.info('Configuration reset to defaults');
  }
}

/**
 * Global configuration manager instance
 */
export const configManager = new ConfigManager();

/**
 * Initialize configuration system
 */
export async function initializeConfig(): Promise<Config> {
  return await configManager.load();
}

/**
 * Get current configuration
 */
export function getCurrentConfig(): Config {
  return configManager.getConfig();
}

/**
 * Update configuration
 */
export async function updateConfiguration(
  updates: Partial<Config>,
): Promise<void> {
  return await configManager.updateConfig(updates);
}
