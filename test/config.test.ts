/**
 * Tests for configuration manager
 *
 * @module tests/config
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENV_VARS } from '../src/cli/env.ts';
import { ConfigManager } from '../src/config/manager.ts';

interface TestEnv {
  tempDir: string;
  cleanup: () => Promise<void>;
}

async function setupTestEnv(): Promise<TestEnv> {
  const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-test-'));

  const xdgKeys = ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME'];
  // Clear AT_* vars so the user's shell exports don't override the loaded config.
  const managedKeys = [...xdgKeys, ...Object.values(ENV_VARS)];
  const original: Record<string, string | undefined> = {};
  for (const key of managedKeys) {
    original[key] = process.env[key];
    delete process.env[key];
  }

  process.env['XDG_CONFIG_HOME'] = `${tempDir}/config`;
  process.env['XDG_DATA_HOME'] = `${tempDir}/data`;
  process.env['XDG_CACHE_HOME'] = `${tempDir}/cache`;
  process.env['XDG_STATE_HOME'] = `${tempDir}/state`;

  return {
    tempDir,
    cleanup: async (): Promise<void> => {
      for (const key of managedKeys) {
        const value = original[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

test('ConfigManager - should create default config when none exists', async () => {
  const { cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();
    const config = await manager.load();

    deepStrictEqual(config.language, 'cpp');
    deepStrictEqual(config.aiEnabled, true);
    ok(config.version != null);
  } finally {
    await cleanup();
  }
});

test('ConfigManager - should not persist env overrides on update', async () => {
  const { tempDir, cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();
    await manager.load();

    process.env[ENV_VARS.WORKSPACE] = '/env/workspace';
    process.env[ENV_VARS.LANGUAGE] = 'rust';
    process.env[ENV_VARS.TEMPLATE_STYLE] = 'minimal';
    await manager.load();

    await manager.updateConfig({ aiEnabled: false });
    await manager.updatePreferences({ theme: 'dark' });

    const saved = JSON.parse(await readFile(`${tempDir}/config/algo-trainer/config.json`, 'utf8'));
    deepStrictEqual(saved.workspace, '');
    deepStrictEqual(saved.language, 'cpp');
    deepStrictEqual(saved.preferences.templateStyle, 'documented');
    deepStrictEqual(saved.aiEnabled, false);
    deepStrictEqual(saved.preferences.theme, 'dark');

    const effective = manager.getConfig();
    deepStrictEqual(effective.workspace, '/env/workspace');
    deepStrictEqual(effective.language, 'rust');
    deepStrictEqual(effective.preferences.templateStyle, 'minimal');
    deepStrictEqual(effective.aiEnabled, false);
  } finally {
    await cleanup();
  }
});

test('ConfigManager - should keep env override effective after setting same key', async () => {
  const { tempDir, cleanup } = await setupTestEnv();
  try {
    process.env[ENV_VARS.LANGUAGE] = 'cpp';
    const manager = new ConfigManager();
    await manager.load();

    await manager.setLanguage('python');

    const saved = JSON.parse(await readFile(`${tempDir}/config/algo-trainer/config.json`, 'utf8'));
    deepStrictEqual(saved.language, 'python');
    deepStrictEqual(manager.getConfig().language, 'cpp');
  } finally {
    await cleanup();
  }
});

test('ConfigManager - should update configuration', async () => {
  const { cleanup } = await setupTestEnv();
  try {
    const manager = new ConfigManager();

    await manager.load();
    await manager.setLanguage('python');

    const config = manager.getConfig();
    deepStrictEqual(config.language, 'python');
  } finally {
    await cleanup();
  }
});

test('Output utilities - setOutputOptions should update options', async () => {
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
    deepStrictEqual(options.useColors, false);
    deepStrictEqual(options.useEmoji, false);
    deepStrictEqual(options.verbosity, 'quiet');
  } finally {
    resetOutputOptions();
  }
});

test('Output utilities - log functions should not throw', async () => {
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
