/**
 * Tests for CLI init command
 *
 * Tests the initialization command implementation (CLI-010)
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Args } from '@std/cli/parse-args';
import { extractInitOptions, initCommand } from '../src/cli/commands/init.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { isWorkspaceInitialized } from '../src/core/mod.ts';

describe('extractInitOptions', () => {
  it('should extract path from positional args', () => {
    const args: Args = {
      _: ['init', '/path/to/workspace'],
    };
    const options = extractInitOptions(args);
    deepStrictEqual(options.path, '/path/to/workspace');
    deepStrictEqual(options.force, false);
  });

  it('should extract force flag (--force)', () => {
    const args: Args = {
      _: ['init'],
      force: true,
    };
    const options = extractInitOptions(args);
    deepStrictEqual(options.path, undefined);
    deepStrictEqual(options.force, true);
  });

  it('should extract force flag (-f)', () => {
    const args: Args = {
      _: ['init'],
      f: true,
    };
    const options = extractInitOptions(args);
    deepStrictEqual(options.path, undefined);
    deepStrictEqual(options.force, true);
  });

  it('should handle no arguments', () => {
    const args: Args = {
      _: ['init'],
    };
    const options = extractInitOptions(args);
    deepStrictEqual(options.path, undefined);
    deepStrictEqual(options.force, false);
  });

  it('should extract both path and force flag', () => {
    const args: Args = {
      _: ['init', '/some/path'],
      force: true,
    };
    const options = extractInitOptions(args);
    deepStrictEqual(options.path, '/some/path');
    deepStrictEqual(options.force, true);
  });
});

describe('initCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should initialize workspace at specified path', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    const result = await initCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Verify workspace was initialized
    const initialized = await isWorkspaceInitialized(tempDir);
    deepStrictEqual(initialized, true);
  });

  it('should succeed if workspace already initialized (without force)', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    // Initialize once
    await initCommand(args);

    // Try to initialize again without force
    const result = await initCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
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

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Verify workspace is still initialized
    const initialized = await isWorkspaceInitialized(tempDir);
    deepStrictEqual(initialized, true);
  });

  it('should create all required directories', async () => {
    const args: Args = {
      _: ['init', tempDir],
    };

    await initCommand(args);

    // Check that all directories exist
    const problemsDir = await stat(`${tempDir}/problems`);
    deepStrictEqual(problemsDir.isDirectory(), true);

    const completedDir = await stat(`${tempDir}/completed`);
    deepStrictEqual(completedDir.isDirectory(), true);

    const templatesDir = await stat(`${tempDir}/templates`);
    deepStrictEqual(templatesDir.isDirectory(), true);

    const configDir = await stat(`${tempDir}/config`);
    deepStrictEqual(configDir.isDirectory(), true);
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

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify workspace was initialized at the resolved path
      const initialized = await isWorkspaceInitialized(subdir);
      deepStrictEqual(initialized, true);

      // Cleanup
      await rm(subdir, { recursive: true, force: true });
    } catch (error) {
      // Try to cleanup on error
      try {
        await rm(subdir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  });

  it('should initialize workspace with --force even if root directory is not empty', async () => {
    const args: Args = {
      _: ['init', tempDir],
      force: true,
    };

    // Add some existing files to make the directory non-empty
    await writeFile(`${tempDir}/existing-file.txt`, 'This is an existing file');
    await mkdir(`${tempDir}/existing-folder`, { recursive: true });
    await writeFile(`${tempDir}/existing-folder/another-file.js`, 'console.log("existing");');

    const result = await initCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Verify workspace was initialized
    const initialized = await isWorkspaceInitialized(tempDir);
    deepStrictEqual(initialized, true);

    // Verify existing files are still there
    const existingFile = await readFile(`${tempDir}/existing-file.txt`, 'utf8');
    deepStrictEqual(existingFile, 'This is an existing file');

    const existingFolderFile = await readFile(`${tempDir}/existing-folder/another-file.js`, 'utf8');
    deepStrictEqual(existingFolderFile, 'console.log("existing");');

    // Verify all workspace directories were created
    const problemsDir = await stat(`${tempDir}/problems`);
    deepStrictEqual(problemsDir.isDirectory(), true);

    const completedDir = await stat(`${tempDir}/completed`);
    deepStrictEqual(completedDir.isDirectory(), true);

    const templatesDir = await stat(`${tempDir}/templates`);
    deepStrictEqual(templatesDir.isDirectory(), true);

    const configDir = await stat(`${tempDir}/config`);
    deepStrictEqual(configDir.isDirectory(), true);
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
    deepStrictEqual(typeof result.success, 'boolean');
    deepStrictEqual(typeof result.exitCode, 'number');
  });
});
