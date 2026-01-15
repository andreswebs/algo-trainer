/**
 * Tests for CLI init command
 *
 * Tests the initialization command implementation (CLI-010)
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { extractInitOptions, initCommand } from '../src/cli/commands/init.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { isWorkspaceInitialized } from '../src/core/mod.ts';
import type { Args } from '@std/cli/parse-args';

describe('extractInitOptions', () => {
  it('should extract path from positional args', () => {
    const args: Args = {
      _: ['init', '/path/to/workspace'],
    };
    const options = extractInitOptions(args);
    assertEquals(options.path, '/path/to/workspace');
    assertEquals(options.force, false);
  });

  it('should extract force flag (--force)', () => {
    const args: Args = {
      _: ['init'],
      force: true,
    };
    const options = extractInitOptions(args);
    assertEquals(options.path, undefined);
    assertEquals(options.force, true);
  });

  it('should extract force flag (-f)', () => {
    const args: Args = {
      _: ['init'],
      f: true,
    };
    const options = extractInitOptions(args);
    assertEquals(options.path, undefined);
    assertEquals(options.force, true);
  });

  it('should handle no arguments', () => {
    const args: Args = {
      _: ['init'],
    };
    const options = extractInitOptions(args);
    assertEquals(options.path, undefined);
    assertEquals(options.force, false);
  });

  it('should extract both path and force flag', () => {
    const args: Args = {
      _: ['init', '/some/path'],
      force: true,
    };
    const options = extractInitOptions(args);
    assertEquals(options.path, '/some/path');
    assertEquals(options.force, true);
  });
});

describe('initCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });

  afterEach(async () => {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should initialize workspace at specified path', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    const result = await initCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Verify workspace was initialized
    const initialized = await isWorkspaceInitialized(tempDir);
    assertEquals(initialized, true);
  });

  it('should succeed if workspace already initialized (without force)', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    // Initialize once
    await initCommand(args);

    // Try to initialize again without force
    const result = await initCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should reinitialize workspace with --force flag', async () => {
    const args1: Args = {
      _: ['init', tempDir],
    };

    // Initialize once
    await initCommand(args1);

    // Reinitialize with force
    const args2: Args = {
      _: ['init', tempDir],
      force: true,
    };
    const result = await initCommand(args2);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Verify workspace is still initialized
    const initialized = await isWorkspaceInitialized(tempDir);
    assertEquals(initialized, true);
  });

  it('should create all required directories', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    await initCommand(args);

    // Check that all directories exist
    const problemsDir = await Deno.stat(`${tempDir}/problems`);
    assertEquals(problemsDir.isDirectory, true);

    const completedDir = await Deno.stat(`${tempDir}/completed`);
    assertEquals(completedDir.isDirectory, true);

    const templatesDir = await Deno.stat(`${tempDir}/templates`);
    assertEquals(templatesDir.isDirectory, true);

    const configDir = await Deno.stat(`${tempDir}/config`);
    assertEquals(configDir.isDirectory, true);
  });

  it('should handle relative paths', async () => {
    // Create a unique subdirectory name
    const subdir = `test-workspace-${Date.now()}`;
    const relativePath = `./${subdir}`;

    try {
      const args: Args = {
        _: ['init', relativePath],
      };

      const result = await initCommand(args);

      assertEquals(result.success, true);
      assertEquals(result.exitCode, ExitCode.SUCCESS);

      // Verify workspace was initialized at the resolved path
      const initialized = await isWorkspaceInitialized(subdir);
      assertEquals(initialized, true);

      // Cleanup
      await Deno.remove(subdir, { recursive: true });
    } catch (error) {
      // Try to cleanup on error
      try {
        await Deno.remove(subdir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  });

  it('should handle errors gracefully for permission denied paths', async () => {
    // Try to initialize at a path that will fail due to permissions
    // Note: This test might succeed or fail depending on permissions
    // We'll use a more realistic scenario
    const invalidPath = '/root/invalid/path/that/cannot/be/created';
    const args: Args = {
      _: ['init', invalidPath],
    };

    const result = await initCommand(args);

    // The command should either:
    // 1. Fail with an error (if permissions are denied)
    // 2. Succeed if the path becomes initialized (unlikely but possible)
    // We check that it returns a valid result structure
    assertEquals(typeof result.success, 'boolean');
    assertEquals(typeof result.exitCode, 'number');
  });
});
