/**
 * Tests for config command
 *
 * @module test/cli-commands-config
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { configCommand, extractConfigOptions } from '../src/cli/commands/config.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { initializeConfig } from '../src/config/manager.ts';

describe('extractConfigOptions', () => {
  it('should extract list subcommand', () => {
    const options = extractConfigOptions({
      _: ['config', 'list'],
      json: false,
    });
    deepStrictEqual(options.subcommand, 'list');
    deepStrictEqual(options.key, undefined);
    deepStrictEqual(options.value, undefined);
    deepStrictEqual(options.json, false);
  });

  it('should extract get subcommand with key', () => {
    const options = extractConfigOptions({
      _: ['config', 'get', 'language'],
      json: false,
    });
    deepStrictEqual(options.subcommand, 'get');
    deepStrictEqual(options.key, 'language');
    deepStrictEqual(options.value, undefined);
  });

  it('should extract set subcommand with key and value', () => {
    const options = extractConfigOptions({
      _: ['config', 'set', 'language', 'python'],
      json: false,
    });
    deepStrictEqual(options.subcommand, 'set');
    deepStrictEqual(options.key, 'language');
    deepStrictEqual(options.value, 'python');
  });

  it('should extract reset subcommand', () => {
    const options = extractConfigOptions({
      _: ['config', 'reset'],
      json: false,
    });
    deepStrictEqual(options.subcommand, 'reset');
    deepStrictEqual(options.key, undefined);
    deepStrictEqual(options.value, undefined);
  });

  it('should extract reset subcommand with key', () => {
    const options = extractConfigOptions({
      _: ['config', 'reset', 'language'],
      json: false,
    });
    deepStrictEqual(options.subcommand, 'reset');
    deepStrictEqual(options.key, 'language');
    deepStrictEqual(options.value, undefined);
  });

  it('should extract json flag', () => {
    const options = extractConfigOptions({
      _: ['config', 'list'],
      json: true,
    });
    deepStrictEqual(options.json, true);
  });
});

describe('configCommand', () => {
  beforeEach(async () => {
    // Ensure config is loaded before each test
    await initializeConfig();
  });

  afterEach(() => {
    // No cleanup needed - config is in its default location
  });

  describe('list subcommand', () => {
    it('should list all configuration values', async () => {
      const result = await configCommand({
        _: ['config', 'list'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should default to list when no subcommand provided', async () => {
      const result = await configCommand({
        _: ['config'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });

  describe('get subcommand', () => {
    it('should get language value', async () => {
      const result = await configCommand({
        _: ['config', 'get', 'language'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should get nested preference value', async () => {
      const result = await configCommand({
        _: ['config', 'get', 'preferences.theme'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should fail with missing key', async () => {
      const result = await configCommand({
        _: ['config', 'get'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should fail with invalid key', async () => {
      const result = await configCommand({
        _: ['config', 'get', 'invalid_key'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });
  });

  describe('set subcommand', () => {
    it('should set language value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'language', 'python'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify value was set
      const getResult = await configCommand({
        _: ['config', 'get', 'language'],
        json: false,
      });
      deepStrictEqual(getResult.success, true);
    });

    it('should set boolean value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'aiEnabled', 'false'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should set nested preference value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'preferences.theme', 'dark'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should set workspace path', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'workspace', '/tmp/test-workspace'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should fail with missing key', async () => {
      const result = await configCommand({
        _: ['config', 'set'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should fail with missing value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'language'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should fail with invalid key', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'invalid_key', 'value'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should fail with invalid language value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'language', 'invalid_language'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.CONFIG_ERROR);
    });

    it('should fail with invalid theme value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'preferences.theme', 'invalid_theme'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.CONFIG_ERROR);
    });

    it('should fail with invalid verbosity value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'preferences.verbosity', 'invalid_verbosity'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.CONFIG_ERROR);
    });

    it('should fail with invalid templateStyle value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'preferences.templateStyle', 'invalid_style'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.CONFIG_ERROR);
    });

    it('should parse boolean values correctly', async () => {
      // Test various boolean formats
      const booleanTests = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: '1', expected: true },
        { value: '0', expected: false },
        { value: 'yes', expected: true },
        { value: 'no', expected: false },
        { value: 'TRUE', expected: true },
        { value: 'FALSE', expected: false },
      ];

      for (const test of booleanTests) {
        const result = await configCommand({
          _: ['config', 'set', 'aiEnabled', test.value],
          json: false,
        });
        deepStrictEqual(result.success, true, `Failed for value: ${test.value}`);
      }
    });

    it('should fail with invalid boolean value', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'aiEnabled', 'invalid_bool'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.CONFIG_ERROR);
    });

    it('should set companies as comma-separated list', async () => {
      const result = await configCommand({
        _: ['config', 'set', 'companies', 'google,facebook,amazon'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });

  describe('reset subcommand', () => {
    it('should reset specific key to default', async () => {
      // First set a non-default value
      await configCommand({
        _: ['config', 'set', 'language', 'python'],
        json: false,
      });

      // Then reset it
      const result = await configCommand({
        _: ['config', 'reset', 'language'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should reset all configuration to defaults', async () => {
      // Set some non-default values
      await configCommand({
        _: ['config', 'set', 'language', 'python'],
        json: false,
      });
      await configCommand({
        _: ['config', 'set', 'preferences.theme', 'dark'],
        json: false,
      });

      // Reset all
      const result = await configCommand({
        _: ['config', 'reset'],
        json: false,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should fail with invalid key', async () => {
      const result = await configCommand({
        _: ['config', 'reset', 'invalid_key'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });
  });

  describe('invalid subcommand', () => {
    it('should fail with unknown subcommand', async () => {
      const result = await configCommand({
        _: ['config', 'unknown'],
        json: false,
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });
  });

  describe('JSON output mode', () => {
    it('should output list as JSON', async () => {
      const result = await configCommand({
        _: ['config', 'list'],
        json: true,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should output get as JSON', async () => {
      const result = await configCommand({
        _: ['config', 'get', 'language'],
        json: true,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });
});
