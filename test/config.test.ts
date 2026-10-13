/**
 * Tests for configuration manager
 *
 * @module tests/config
 */

import { assertEquals, assertExists } from '@std/assert';
import { ENV_VARS } from '../src/cli/env.ts';
import { ConfigManager } from '../src/config/manager.ts';

interface TestEnv {
  tempDir: string;
  cleanup: () => Promise<void>;
}

async function setupTestEnv(): Promise<TestEnv> {
  const tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-test-' });

  const xdgKeys = ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME'];
  // Clear AT_* vars so the user's shell exports don't override the loaded config.
  const managedKeys = [...xdgKeys, ...Object.values(ENV_VARS)];
  const original: Record<string, string | undefined> = {};
  for (const key of managedKeys) {
    original[key] = Deno.env.get(key);
    Deno.env.delete(key);
  }

  Deno.env.set('XDG_CONFIG_HOME', `${tempDir}/config`);
  Deno.env.set('XDG_DATA_HOME', `${tempDir}/data`);
  Deno.env.set('XDG_CACHE_HOME', `${tempDir}/cache`);
  Deno.env.set('XDG_STATE_HOME', `${tempDir}/state`);

  return {
    tempDir,
    cleanup: async (): Promise<void> => {
      for (const key of managedKeys) {
        const value = original[key];
        if (value === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, value);
        }
      }
      await Deno.remove(tempDir, { recursive: true });
    },
  };
}

Deno.test('ConfigManager - should create default config when none exists', async () => {
  const { cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();
    const config = await manager.load();

    assertEquals(config.language, 'cpp');
    assertEquals(config.aiEnabled, true);
    assertExists(config.version);
  } finally {
    await cleanup();
  }
});

Deno.test('ConfigManager - should not persist env overrides on update', async () => {
  const { tempDir, cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();
    await manager.load();

    Deno.env.set(ENV_VARS.WORKSPACE, '/env/workspace');
    Deno.env.set(ENV_VARS.LANGUAGE, 'rust');
    Deno.env.set(ENV_VARS.TEMPLATE_STYLE, 'minimal');
    await manager.load();

    await manager.updateConfig({ aiEnabled: false });
    await manager.updatePreferences({ theme: 'dark' });

    const saved = JSON.parse(await Deno.readTextFile(`${tempDir}/config/algo-trainer/config.json`));
    assertEquals(saved.workspace, '');
    assertEquals(saved.language, 'cpp');
    assertEquals(saved.preferences.templateStyle, 'documented');
    assertEquals(saved.aiEnabled, false);
    assertEquals(saved.preferences.theme, 'dark');

    const effective = manager.getConfig();
    assertEquals(effective.workspace, '/env/workspace');
    assertEquals(effective.language, 'rust');
    assertEquals(effective.preferences.templateStyle, 'minimal');
    assertEquals(effective.aiEnabled, false);
  } finally {
    await cleanup();
  }
});

Deno.test('ConfigManager - should keep env override effective after setting same key', async () => {
  const { tempDir, cleanup } = await setupTestEnv();
  try {
    Deno.env.set(ENV_VARS.LANGUAGE, 'cpp');
    const manager = new ConfigManager();
    await manager.load();

    await manager.setLanguage('python');

    const saved = JSON.parse(await Deno.readTextFile(`${tempDir}/config/algo-trainer/config.json`));
    assertEquals(saved.language, 'python');
    assertEquals(manager.getConfig().language, 'cpp');
  } finally {
    await cleanup();
  }
});

Deno.test('ConfigManager - should update configuration', async () => {
  const { cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();

    await manager.load();
    await manager.setLanguage('python');

    const config = manager.getConfig();
    assertEquals(config.language, 'python');
  } finally {
    await cleanup();
  }
});

Deno.test('Output utilities - setOutputOptions should update options', async () => {
  const { setOutputOptions, getOutputOptions, resetOutputOptions } = await import(
    '../src/utils/output.ts'
  );

  try {
    setOutputOptions({
      useColors: false,
      useEmoji: false,
      verbosity: 'quiet',
    });

    const options = getOutputOptions();
    assertEquals(options.useColors, false);
    assertEquals(options.useEmoji, false);
    assertEquals(options.verbosity, 'quiet');
  } finally {
    resetOutputOptions();
  }
});

Deno.test('Output utilities - log functions should not throw', async () => {
  const {
    logSuccess,
    logError,
    logWarning,
    logInfo,
    logDebug,
    setOutputOptions,
    resetOutputOptions,
  } = await import('../src/utils/output.ts');

  try {
    setOutputOptions({
      useColors: false,
      useEmoji: false,
      verbosity: 'verbose',
    });

    // These should complete without throwing
    logSuccess('Test success message');
    logError('Test error message', 'with details');
    logWarning('Test warning message');
    logInfo('Test info message');
    logDebug('Test debug message');
  } finally {
    resetOutputOptions();
  }
});
