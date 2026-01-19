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
import { getEnvConfigPath, loadEnvConfig } from '../cli/env.ts';
import type { Config, SupportedLanguage, UserPreferences } from '../types/global.ts';

/**
 * Configuration manager class
 */
export class ConfigManager {
  private config: Config | null = null;
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
      } else {
        // Create default config file
        logger.info('No configuration found, creating default configuration');
        // Set config before saving
        this.config = mergedConfig;
        await this.save();
      }

      // Load environment variables and merge (env takes highest precedence)
      const envConfig = loadEnvConfig();
      if (Object.keys(envConfig).length > 0) {
        mergedConfig = {
          ...mergedConfig,
          ...envConfig,
          preferences: {
            ...mergedConfig.preferences,
            ...(envConfig.preferences || {}),
          },
        };
      }

      this.config = mergedConfig;
      return this.config;
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
   * Save configuration to file
   */
  async save(): Promise<void> {
    if (!this.config) {
      throw new ConfigError(
        'No configuration to save',
        createErrorContext('saveConfig', { path: this.configPath }),
      );
    }

    try {
      // Ensure config directory exists
      const configPaths = getConfigPaths();
      await createDirectory(configPaths.config);

      // Validate before saving
      validateOrThrow(this.config, validateConfig, 'configuration');

      // Save to file
      await writeJsonFile(this.configPath, this.config, {
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
    if (!this.config) {
      throw new ConfigError(
        'Configuration not loaded',
        createErrorContext('updateConfig'),
      );
    }

    // Deep merge for nested objects (preferences)
    const mergedPreferences = updates.preferences
      ? { ...this.config.preferences, ...updates.preferences }
      : this.config.preferences;

    // Merge updates with deep-merged preferences
    this.config = {
      ...this.config,
      ...updates,
      preferences: mergedPreferences,
    };

    // Save updated config
    await this.save();
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<void> {
    if (!this.config) {
      throw new ConfigError(
        'Configuration not loaded',
        createErrorContext('updatePreferences'),
      );
    }

    this.config.preferences = { ...this.config.preferences, ...preferences };
    await this.save();
  }

  /**
   * Set default language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    await this.updateConfig({ language });
  }

  /**
   * Set workspace path
   */
  async setWorkspace(workspace: string): Promise<void> {
    await this.updateConfig({ workspace });
  }

  /**
   * Enable/disable AI features
   */
  async setAiEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ aiEnabled: enabled });
  }

  /**
   * Set preferred companies
   */
  async setCompanies(companies: string[]): Promise<void> {
    await this.updateConfig({ companies });
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
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
