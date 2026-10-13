/**
 * Integration tests for environment variable configuration precedence
 *
 * @module test/env-integration.test
 */

import { describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENV_VARS } from '../src/cli/env.ts';
import { ConfigManager } from '../src/config/manager.ts';
import { writeJsonFile } from '../src/utils/fs.ts';

describe('Environment Variable Integration', () => {
  const withTempConfig = async (
    fn: (configPath: string) => void | Promise<void>,
  ): Promise<void> => {
    const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    const configPath = join(tempDir, 'config.json');

    try {
      await fn(configPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  };

  // Clears ALL known AT_* vars on entry so pre-existing shell exports don't
  // leak into tests that expect a clean environment.
  const withEnv = async (
    vars: Record<string, string>,
    fn: () => void | Promise<void>,
  ): Promise<void> => {
    const managedKeys = new Set<string>([...Object.values(ENV_VARS), ...Object.keys(vars)]);
    const original: Record<string, string | undefined> = {};

    for (const key of managedKeys) {
      original[key] = process.env[key];
      delete process.env[key];
    }
    for (const [key, value] of Object.entries(vars)) {
      process.env[key] = value;
    }

    try {
      await fn();
    } finally {
      for (const key of managedKeys) {
        const originalValue = original[key];
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
    }
  };

  describe('Configuration Precedence', () => {
    it('should use defaults when no config file or env vars exist', async () => {
      await withTempConfig(async (configPath) => {
        await withEnv({ [ENV_VARS.CONFIG_PATH]: configPath }, async () => {
          const manager = new ConfigManager();
          const config = await manager.load();

          deepStrictEqual(config.language, 'cpp'); // Default
          deepStrictEqual(config.workspace, ''); // Default
          deepStrictEqual(config.preferences.verbosity, 'normal'); // Default
        });
      });
    });

    it('should prefer config file over defaults', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await mkdir(tempDir, { recursive: true });

        // Write config file
        await writeJsonFile(configPath, {
          language: 'python',
          workspace: '/custom/workspace',
          aiEnabled: true,
          companies: [],
          preferences: {
            theme: 'dark',
            verbosity: 'verbose',
            autoSave: true,
            templateStyle: 'minimal',
            useEmoji: true,
            useColors: true,
          },
          version: '0.0.1',
        });

        await withEnv({ [ENV_VARS.CONFIG_PATH]: configPath }, async () => {
          const manager = new ConfigManager();
          const config = await manager.load();

          deepStrictEqual(config.language, 'python'); // From config file
          deepStrictEqual(config.workspace, '/custom/workspace'); // From config file
          deepStrictEqual(config.preferences.verbosity, 'verbose'); // From config file
        });
      });
    });

    it('should prefer environment variables over config file', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await mkdir(tempDir, { recursive: true });

        // Write config file
        await writeJsonFile(configPath, {
          language: 'python',
          workspace: '/custom/workspace',
          aiEnabled: true,
          companies: [],
          preferences: {
            theme: 'dark',
            verbosity: 'verbose',
            autoSave: true,
            templateStyle: 'minimal',
            useEmoji: true,
            useColors: true,
          },
          version: '0.0.1',
        });

        await withEnv(
          {
            [ENV_VARS.CONFIG_PATH]: configPath,
            [ENV_VARS.LANGUAGE]: 'typescript',
            [ENV_VARS.WORKSPACE]: '/env/workspace',
            [ENV_VARS.QUIET]: '1',
            [ENV_VARS.TEMPLATE_STYLE]: 'documented',
          },
          async () => {
            const manager = new ConfigManager();
            const config = await manager.load();

            // Environment variables override config file
            deepStrictEqual(config.language, 'typescript'); // From env
            deepStrictEqual(config.workspace, '/env/workspace'); // From env
            deepStrictEqual(config.preferences.verbosity, 'quiet'); // From env
            deepStrictEqual(config.preferences.templateStyle, 'documented'); // From env

            // Values not in env use config file
            deepStrictEqual(config.preferences.theme, 'dark'); // From config file
            deepStrictEqual(config.preferences.autoSave, true); // From config file
          },
        );
      });
    });

    it('should handle partial environment variable overrides', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await mkdir(tempDir, { recursive: true });

        // Write config file
        await writeJsonFile(configPath, {
          language: 'python',
          workspace: '/custom/workspace',
          aiEnabled: true,
          companies: [],
          preferences: {
            theme: 'dark',
            verbosity: 'verbose',
            autoSave: true,
            templateStyle: 'minimal',
            useEmoji: true,
            useColors: true,
          },
          version: '0.0.1',
        });

        await withEnv(
          {
            [ENV_VARS.CONFIG_PATH]: configPath,
            [ENV_VARS.LANGUAGE]: 'rust',
          },
          async () => {
            const manager = new ConfigManager();
            const config = await manager.load();

            // Only language is overridden
            deepStrictEqual(config.language, 'rust'); // From env
            deepStrictEqual(config.workspace, '/custom/workspace'); // From config file
            deepStrictEqual(config.preferences.verbosity, 'verbose'); // From config file
            deepStrictEqual(config.preferences.templateStyle, 'minimal'); // From config file
          },
        );
      });
    });

    it('should handle all preference overrides from environment', async () => {
      await withTempConfig(async (configPath) => {
        await withEnv(
          {
            [ENV_VARS.CONFIG_PATH]: configPath,
            [ENV_VARS.VERBOSE]: '1',
            [ENV_VARS.NO_COLOR]: '1',
            [ENV_VARS.NO_EMOJI]: '1',
            [ENV_VARS.TEMPLATE_STYLE]: 'comprehensive',
          },
          async () => {
            const manager = new ConfigManager();
            const config = await manager.load();

            deepStrictEqual(config.preferences.verbosity, 'verbose');
            deepStrictEqual(config.preferences.useColors, false);
            deepStrictEqual(config.preferences.useEmoji, false);
            deepStrictEqual(config.preferences.templateStyle, 'comprehensive');
          },
        );
      });
    });
  });

  describe('Custom Config Path', () => {
    it('should load config from AT_CONFIG_PATH environment variable', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
      const customConfigPath = join(tempDir, 'custom-config.json');

      try {
        await mkdir(tempDir, { recursive: true });

        // Write config to custom path
        await writeJsonFile(customConfigPath, {
          language: 'java',
          workspace: '/java/workspace',
          aiEnabled: false,
          companies: ['Google'],
          preferences: {
            theme: 'light',
            verbosity: 'quiet',
            autoSave: false,
            templateStyle: 'documented',
            useEmoji: false,
            useColors: false,
          },
          version: '0.0.1',
        });

        await withEnv({ [ENV_VARS.CONFIG_PATH]: customConfigPath }, async () => {
          const manager = new ConfigManager();
          const config = await manager.load();

          deepStrictEqual(config.language, 'java');
          deepStrictEqual(config.workspace, '/java/workspace');
          deepStrictEqual(config.aiEnabled, false);
          deepStrictEqual(config.companies, ['Google']);
        });
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
