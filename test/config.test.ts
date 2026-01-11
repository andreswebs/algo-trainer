/**
 * Tests for configuration manager
 *
 * @module tests/config
 */

import { assertEquals } from '@std/assert';
import { ConfigManager } from '../src/config/manager.ts';

interface TestEnv {
  tempDir: string;
  cleanup: () => Promise<void>;
}

async function setupTestEnv(): Promise<TestEnv> {
  const tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-test-' });

  const original = {
    XDG_CONFIG_HOME: Deno.env.get('XDG_CONFIG_HOME'),
    XDG_DATA_HOME: Deno.env.get('XDG_DATA_HOME'),
    XDG_CACHE_HOME: Deno.env.get('XDG_CACHE_HOME'),
    XDG_STATE_HOME: Deno.env.get('XDG_STATE_HOME'),
  };

  Deno.env.set('XDG_CONFIG_HOME', `${tempDir}/config`);
  Deno.env.set('XDG_DATA_HOME', `${tempDir}/data`);
  Deno.env.set('XDG_CACHE_HOME', `${tempDir}/cache`);
  Deno.env.set('XDG_STATE_HOME', `${tempDir}/state`);

  return {
    tempDir,
    cleanup: async () => {
      for (const [key, value] of Object.entries(original)) {
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

Deno.test(
  'ConfigManager - should create default config when none exists',
  async () => {
    const { cleanup } = await setupTestEnv();
    try {
      const manager = new ConfigManager();
      const config = await manager.load();

      assertEquals(config.language, 'typescript');
      assertEquals(config.aiEnabled, true);
      assertEquals(config.version, '2.0.0');
    } finally {
      await cleanup();
    }
  },
);

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
  } = await import(
    '../src/utils/output.ts'
  );

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
