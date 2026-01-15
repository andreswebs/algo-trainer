/**
 * Integration tests for environment variable configuration precedence
 *
 * @module test/env-integration.test
 */

import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { join } from '@std/path';
import { ensureDir } from '@std/fs';
import { ConfigManager } from '../src/config/manager.ts';
import { ENV_VARS } from '../src/cli/env.ts';
import { writeJsonFile } from '../src/utils/fs.ts';

describe('Environment Variable Integration', () => {
  const withTempConfig = async (
    fn: (configPath: string) => void | Promise<void>,
  ) => {
    const tempDir = await Deno.makeTempDir();
    const configPath = join(tempDir, 'config.json');

    try {
      await fn(configPath);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  };

  const withEnv = async (
    vars: Record<string, string>,
    fn: () => void | Promise<void>,
  ) => {
    const original: Record<string, string | undefined> = {};

    // Save original values and set new ones
    for (const [key, value] of Object.entries(vars)) {
      original[key] = Deno.env.get(key);
      Deno.env.set(key, value);
    }

    try {
      await fn();
    } finally {
      // Restore original values
      for (const key of Object.keys(vars)) {
        const originalValue = original[key];
        if (originalValue === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, originalValue);
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

          assertEquals(config.language, 'typescript'); // Default
          assertEquals(config.workspace, ''); // Default
          assertEquals(config.preferences.verbosity, 'normal'); // Default
        });
      });
    });

    it('should prefer config file over defaults', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await ensureDir(tempDir);

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

          assertEquals(config.language, 'python'); // From config file
          assertEquals(config.workspace, '/custom/workspace'); // From config file
          assertEquals(config.preferences.verbosity, 'verbose'); // From config file
        });
      });
    });

    it('should prefer environment variables over config file', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await ensureDir(tempDir);

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
            assertEquals(config.language, 'typescript'); // From env
            assertEquals(config.workspace, '/env/workspace'); // From env
            assertEquals(config.preferences.verbosity, 'quiet'); // From env
            assertEquals(config.preferences.templateStyle, 'documented'); // From env

            // Values not in env use config file
            assertEquals(config.preferences.theme, 'dark'); // From config file
            assertEquals(config.preferences.autoSave, true); // From config file
          },
        );
      });
    });

    it('should handle partial environment variable overrides', async () => {
      await withTempConfig(async (configPath) => {
        const tempDir = join(configPath, '..');
        await ensureDir(tempDir);

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
            assertEquals(config.language, 'rust'); // From env
            assertEquals(config.workspace, '/custom/workspace'); // From config file
            assertEquals(config.preferences.verbosity, 'verbose'); // From config file
            assertEquals(config.preferences.templateStyle, 'minimal'); // From config file
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

            assertEquals(config.preferences.verbosity, 'verbose');
            assertEquals(config.preferences.useColors, false);
            assertEquals(config.preferences.useEmoji, false);
            assertEquals(config.preferences.templateStyle, 'comprehensive');
          },
        );
      });
    });
  });

  describe('Custom Config Path', () => {
    it('should load config from AT_CONFIG_PATH environment variable', async () => {
      const tempDir = await Deno.makeTempDir();
      const customConfigPath = join(tempDir, 'custom-config.json');

      try {
        await ensureDir(tempDir);

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

        await withEnv(
          { [ENV_VARS.CONFIG_PATH]: customConfigPath },
          async () => {
            const manager = new ConfigManager();
            const config = await manager.load();

            assertEquals(config.language, 'java');
            assertEquals(config.workspace, '/java/workspace');
            assertEquals(config.aiEnabled, false);
            assertEquals(config.companies, ['Google']);
          },
        );
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    });
  });
});
