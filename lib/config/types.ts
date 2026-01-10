/**
 * Configuration type definitions
 *
 * Specific types for configuration management.
 *
 * @module config/types
 */

import type { Config, SupportedLanguage, UserPreferences } from '../types/global.ts';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  language: 'typescript',
  workspace: '',
  aiEnabled: true,
  companies: [],
  preferences: {
    theme: 'auto',
    verbosity: 'normal',
    autoSave: true,
    templateStyle: 'documented',
    useEmoji: true,
    useColors: true,
  },
  version: '2.0.0',
};

/**
 * Configuration migration info
 */
export interface ConfigMigration {
  from: string;
  to: string;
  migrated: boolean;
  timestamp: Date;
}

/**
 * Legacy configuration format (for migration)
 */
export interface LegacyConfig {
  language?: string;
  defaultWorkspace?: string;
  useAI?: boolean;
  preferredCompanies?: string[];
  // Other legacy fields
  [key: string]: unknown;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
