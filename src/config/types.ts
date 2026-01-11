/**
 * Configuration type definitions
 *
 * Specific types for configuration management.
 *
 * @module config/types
 */

import type { Config } from '../types/global.ts';
import { VERSION } from '../version.ts';

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
  version: VERSION,
};

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
