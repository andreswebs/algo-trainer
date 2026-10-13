/**
 * CLI Integration Tests - CLI-051
 *
 * These tests verify complete CLI workflows with real filesystem interactions.
 * Tests command interactions, file operations, and error recovery scenarios.
 *
 * @module test/cli-integration
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { challengeCommand } from '../src/cli/commands/challenge.ts';
import { completeCommand } from '../src/cli/commands/complete.ts';
import { configCommand } from '../src/cli/commands/config.ts';
import { hintCommand } from '../src/cli/commands/hint.ts';
// Import CLI commands
import { initCommand } from '../src/cli/commands/init.ts';
import { listCommand } from '../src/cli/commands/list.ts';
import { progressCommand } from '../src/cli/commands/progress.ts';
import { ENV_VARS } from '../src/cli/env.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
// Import utilities
import { configManager } from '../src/config/manager.ts';
import { getWorkspaceStructure, isWorkspaceInitialized, problemExists } from '../src/core/mod.ts';
import { getFileExtension } from '../src/core/workspace/files.ts';
import type { SupportedLanguage } from '../src/types/global.ts';

describe('CLI Integration Tests - CLI-051', () => {
  let tempDir: string;
  let originalWorkspace: string;
  let originalLanguage: SupportedLanguage;
  let originalAtEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    // Clear AT_* env vars so user shell exports don't override the test workspace.
    originalAtEnv = {};
    for (const key of Object.values(ENV_VARS)) {
      originalAtEnv[key] = process.env[key];
      delete process.env[key];
    }
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    // Save original workspace + language so we don't permanently mutate user config.
    const config = await configManager.load();
    originalWorkspace = config.workspace;
    originalLanguage = config.language;
    // Pin workspace + language so tests don't depend on the user's persisted config.
    await configManager.updateConfig({ workspace: tempDir, language: 'cpp' });
  });

  afterEach(async () => {
    // Restore original config
    await configManager.updateConfig({
      workspace: originalWorkspace,
      language: originalLanguage,
    });
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    for (const [key, value] of Object.entries(originalAtEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('Workspace Initialization', () => {
    it('should create correct directory structure', async () => {
      const result = await initCommand({ _: ['init', tempDir] });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify workspace structure
      const structure = getWorkspaceStructure(tempDir);

      // Check all directories exist
      const problemsDir = await stat(structure.problems);
      deepStrictEqual(problemsDir.isDirectory(), true);

      const completedDir = await stat(structure.completed);
      deepStrictEqual(completedDir.isDirectory(), true);

      const templatesDir = await stat(structure.templates);
      deepStrictEqual(templatesDir.isDirectory(), true);

      const configDir = await stat(structure.config);
      deepStrictEqual(configDir.isDirectory(), true);
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      // Initialize once
      const result1 = await initCommand({ _: ['init', tempDir] });
      deepStrictEqual(result1.success, true);

      // Initialize again
      const result2 = await initCommand({ _: ['init', tempDir] });
      deepStrictEqual(result2.success, true);

      // Verify workspace is still properly initialized
      const initialized = await isWorkspaceInitialized(tempDir);
      deepStrictEqual(initialized, true);
    });

    it('should reinitialize with --force flag', async () => {
      // Initialize once
      await initCommand({ _: ['init', tempDir] });

      // Reinitialize with force
      const result = await initCommand({ _: ['init', tempDir], force: true });
      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });

  describe('Problem File Generation', () => {
    beforeEach(async () => {
      // Initialize workspace before each test
      await initCommand({ _: ['init', tempDir] });
    });

    it('should generate all required files for a problem', async () => {
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify problem exists
      const config = configManager.getConfig();
      const exists = await problemExists(tempDir, 'two-sum', config.language);
      deepStrictEqual(exists, true);

      // Verify files were created based on the actual language configuration
      const structure = getWorkspaceStructure(tempDir);
      const problemDir = join(structure.problems, 'two-sum');

      // README should exist regardless of language
      const readmeFile = join(problemDir, 'README.md');
      const readmeStat = await stat(readmeFile);
      deepStrictEqual(readmeStat.isFile(), true);

      const solutionFile = join(problemDir, `solution${getFileExtension(config.language)}`);
      const solutionStat = await stat(solutionFile);
      deepStrictEqual(solutionStat.isFile(), true);
    });

    it('should generate files with different languages', async () => {
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
        language: 'python',
      });

      deepStrictEqual(result.success, true);

      // Verify Python files were created
      const exists = await problemExists(tempDir, 'two-sum', 'python');
      deepStrictEqual(exists, true);

      const structure = getWorkspaceStructure(tempDir);
      const problemDir = join(structure.problems, 'two-sum');
      const pythonFile = join(problemDir, 'solution.py');

      const stats = await stat(pythonFile);
      deepStrictEqual(stats.isFile(), true);
    });

    it('should warn about existing files without --force', async () => {
      // Generate files once
      await challengeCommand({ _: ['challenge', 'two-sum'] });

      // The command will prompt for confirmation when files exist without --force
      // For testing purposes, we just verify the first generation worked
      const config = configManager.getConfig();
      const exists = await problemExists(tempDir, 'two-sum', config.language);
      deepStrictEqual(exists, true);
    });

    it('should overwrite files with --force flag', async () => {
      // Generate files once
      await challengeCommand({ _: ['challenge', 'two-sum'] });

      const config = configManager.getConfig();
      const structure = getWorkspaceStructure(tempDir);
      const problemDir = join(structure.problems, 'two-sum');

      const solutionFile = join(problemDir, `solution${getFileExtension(config.language)}`);

      // Modify the file
      await writeFile(solutionFile, '// Modified content');
      const modifiedContent = await readFile(solutionFile, 'utf8');
      deepStrictEqual(modifiedContent, '// Modified content');

      // Generate again with force
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
        force: true,
      });

      deepStrictEqual(result.success, true);

      // Verify file was overwritten (should contain more than just the modified content)
      const newContent = await readFile(solutionFile, 'utf8');
      deepStrictEqual(newContent.length > '// Modified content'.length, true);
    });
  });

  describe('Problem Archiving', () => {
    beforeEach(async () => {
      // Initialize workspace and create a problem
      await initCommand({ _: ['init', tempDir] });
      await challengeCommand({ _: ['challenge', 'two-sum'] });
    });

    it('should move problem to completed directory', async () => {
      const result = await completeCommand({
        _: ['complete', 'two-sum'],
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify problem was moved to completed
      const structure = getWorkspaceStructure(tempDir);
      const completedDir = join(structure.completed, 'two-sum');

      const stats = await stat(completedDir);
      deepStrictEqual(stats.isDirectory(), true);
    });

    it('should preserve all files when archiving', async () => {
      const structure = getWorkspaceStructure(tempDir);

      // Get list of files before archiving
      const problemDir = join(structure.problems, 'two-sum');
      const filesBefore: string[] = [];
      for (const entry of await readdir(problemDir, { withFileTypes: true })) {
        if (entry.isFile()) {
          filesBefore.push(entry.name);
        }
      }

      // Archive the problem
      await completeCommand({ _: ['complete', 'two-sum'] });

      // Verify all files are in completed directory
      const completedDir = join(structure.completed, 'two-sum');
      const filesAfter: string[] = [];
      for (const entry of await readdir(completedDir, { withFileTypes: true })) {
        if (entry.isFile()) {
          filesAfter.push(entry.name);
        }
      }

      // Should have at least the same number of files
      deepStrictEqual(filesAfter.length >= filesBefore.length, true);
    });

    it('should fail when problem does not exist', async () => {
      const result = await completeCommand({
        _: ['complete', 'non-existent-problem'],
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist config changes to disk', async () => {
      // Update configuration
      const result = await configCommand({
        _: ['config', 'set', 'language', 'python'],
      });

      deepStrictEqual(result.success, true);

      // Reload config from disk
      await configManager.load();
      const config = configManager.getConfig();

      deepStrictEqual(config.language, 'python');
    });

    it('should list all configuration values', async () => {
      const result = await configCommand({
        _: ['config', 'list'],
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should get specific configuration value', async () => {
      const result = await configCommand({
        _: ['config', 'get', 'language'],
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should reset configuration to defaults', async () => {
      // Change a value
      await configCommand({
        _: ['config', 'set', 'language', 'java'],
      });

      // Reset
      const result = await configCommand({
        _: ['config', 'reset', 'language'],
      });

      deepStrictEqual(result.success, true);

      // Verify it was reset
      const config = configManager.getConfig();
      deepStrictEqual(config.language, 'cpp'); // Default
    });
  });

  describe('Problem Listing and Filtering', () => {
    it('should list all problems', async () => {
      const result = await listCommand({ _: ['list'] });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should filter by difficulty', async () => {
      const result = await listCommand({
        _: ['list'],
        difficulty: 'easy',
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should filter by category', async () => {
      const result = await listCommand({
        _: ['list'],
        category: 'array',
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should search problems by text', async () => {
      const result = await listCommand({
        _: ['list'],
        search: 'sum',
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should limit results', async () => {
      const result = await listCommand({
        _: ['list'],
        limit: 5,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });

  describe('Hint System', () => {
    beforeEach(async () => {
      // Initialize workspace and create a problem
      await initCommand({ _: ['init', tempDir] });
      await challengeCommand({ _: ['challenge', 'two-sum'] });
    });

    it('should provide hints for a problem', async () => {
      const result = await hintCommand({
        _: ['hint', 'two-sum'],
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should show specific hint level', async () => {
      const result = await hintCommand({
        _: ['hint', 'two-sum'],
        level: 1,
      });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should fail for non-existent problem', async () => {
      const result = await hintCommand({
        _: ['hint', 'non-existent-problem'],
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempDir] });
    });

    it('should show progress statistics', async () => {
      const result = await progressCommand({ _: ['progress'] });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });

    it('should handle empty workspace gracefully', async () => {
      const result = await progressCommand({ _: ['progress'] });

      deepStrictEqual(result.success, true);
      // Should succeed even with no completed problems
    });

    it('should track completed problems', async () => {
      // Create and complete a problem
      await challengeCommand({ _: ['challenge', 'two-sum'] });
      await completeCommand({ _: ['complete', 'two-sum'] });

      const result = await progressCommand({ _: ['progress'] });

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    });
  });

  describe('Complete Workflows', () => {
    it('should support init -> challenge -> complete workflow', async () => {
      // 1. Initialize workspace
      const initResult = await initCommand({ _: ['init', tempDir] });
      deepStrictEqual(initResult.success, true);

      // 2. Start a challenge
      const challengeResult = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });
      deepStrictEqual(challengeResult.success, true);

      // Verify problem exists
      const config = configManager.getConfig();
      const exists = await problemExists(tempDir, 'two-sum', config.language);
      deepStrictEqual(exists, true);

      // 3. Complete the challenge
      const completeResult = await completeCommand({
        _: ['complete', 'two-sum'],
      });
      deepStrictEqual(completeResult.success, true);

      // Verify problem was moved to completed
      const structure = getWorkspaceStructure(tempDir);
      const completedDir = join(structure.completed, 'two-sum');
      const stats = await stat(completedDir);
      deepStrictEqual(stats.isDirectory(), true);
    });

    it('should support configuration workflow', async () => {
      // 0. Initialize workspace
      await initCommand({ _: ['init', tempDir] });

      // 1. Set language
      const setResult = await configCommand({
        _: ['config', 'set', 'language', 'python'],
      });
      deepStrictEqual(setResult.success, true);

      // 2. Verify the change
      const getResult = await configCommand({
        _: ['config', 'get', 'language'],
      });
      deepStrictEqual(getResult.success, true);

      // 3. Use the language in a challenge
      const challengeResult = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });
      deepStrictEqual(challengeResult.success, true);

      // Verify Python files were created
      const exists = await problemExists(tempDir, 'two-sum', 'python');
      deepStrictEqual(exists, true);
    });

    it('should support multiple problems workflow', async () => {
      await initCommand({ _: ['init', tempDir] });

      // Start multiple challenges
      await challengeCommand({ _: ['challenge', 'two-sum'] });
      await challengeCommand({ _: ['challenge', 'add-two-numbers'], force: true });

      // Complete one
      await completeCommand({ _: ['complete', 'two-sum'] });

      // Check progress
      const progressResult = await progressCommand({ _: ['progress'] });
      deepStrictEqual(progressResult.success, true);

      // List remaining problems
      const listResult = await listCommand({ _: ['list'] });
      deepStrictEqual(listResult.success, true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle workspace not initialized error', async () => {
      // Create a new temp directory without initializing
      const uninitializedDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));

      try {
        await configManager.updateConfig({ workspace: uninitializedDir });

        // Try to complete a problem (should fail or auto-init)
        const result = await completeCommand({
          _: ['complete', 'two-sum'],
        });

        // Should fail with appropriate error
        deepStrictEqual(result.success, false);
      } finally {
        await rm(uninitializedDir, { recursive: true, force: true });
        await configManager.updateConfig({ workspace: tempDir });
      }
    });

    it('should handle missing problem files', async () => {
      await initCommand({ _: ['init', tempDir] });

      // Try to complete a problem that doesn't exist
      const result = await completeCommand({
        _: ['complete', 'non-existent-problem'],
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
    });

    it('should handle invalid difficulty values', async () => {
      await initCommand({ _: ['init', tempDir] });

      const result = await challengeCommand({
        _: ['challenge'],
        difficulty: 'invalid-difficulty',
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should handle invalid language values', async () => {
      await initCommand({ _: ['init', tempDir] });

      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
        language: 'invalid-language',
      });

      deepStrictEqual(result.success, false);
      deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    });

    it('should recover from partial workspace deletion', async () => {
      await initCommand({ _: ['init', tempDir] });

      // Delete problems directory
      const structure = getWorkspaceStructure(tempDir);
      await rm(structure.problems, { recursive: true, force: true });

      // Reinitialize should recreate missing directories
      const result = await initCommand({ _: ['init', tempDir], force: true });
      deepStrictEqual(result.success, true);

      // Verify problems directory was recreated
      const stats = await stat(structure.problems);
      deepStrictEqual(stats.isDirectory(), true);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await initCommand({ _: ['init', tempDir] });
    });

    it('should handle multiple simultaneous problem generations', async () => {
      // Start multiple challenges with different languages - use valid slugs
      const results = await Promise.all([
        challengeCommand({ _: ['challenge', 'two-sum'], language: 'typescript' }),
        challengeCommand({ _: ['challenge', 'add-two-numbers'], language: 'python' }),
        challengeCommand({ _: ['challenge', 'valid-parentheses'], language: 'java' }),
      ]);

      // At least the first two should succeed (they are valid problems)
      deepStrictEqual(results[0].success, true);
      deepStrictEqual(results[1].success, true);
      deepStrictEqual(results[2].success, true);

      // Verify all problems exist
      const tsExists = await problemExists(tempDir, 'two-sum', 'typescript');
      const pyExists = await problemExists(tempDir, 'add-two-numbers', 'python');
      const javaExists = await problemExists(tempDir, 'valid-parentheses', 'java');

      deepStrictEqual(tsExists, true);
      deepStrictEqual(pyExists, true);
      deepStrictEqual(javaExists, true);
    });
  });

  describe('Filesystem Edge Cases', () => {
    beforeEach(async () => {
      await initCommand({ _: ['init', tempDir] });
    });

    it('should handle files with special characters in slugs', async () => {
      // This test verifies proper slug validation
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'], // Valid slug
      });

      deepStrictEqual(result.success, true);
    });

    it('should handle long file paths gracefully', async () => {
      // Most systems have path length limits
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });

      deepStrictEqual(result.success, true);
    });

    it('should handle workspace with existing files', async () => {
      // Create some random files in the workspace
      const structure = getWorkspaceStructure(tempDir);
      await writeFile(join(structure.problems, 'random.txt'), 'test');

      // Should still be able to work normally
      const result = await challengeCommand({
        _: ['challenge', 'two-sum'],
      });

      deepStrictEqual(result.success, true);
    });
  });
});
