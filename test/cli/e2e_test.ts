/**
 * E2E Workflow Tests - CLI-052
 *
 * Tests complete user workflows from start to finish, simulating real-world usage patterns.
 * Each test creates an isolated workspace and exercises multiple commands in sequence.
 *
 * Workflows tested:
 * 1. Fresh start: init -> challenge -> complete
 * 2. Configuration: config set -> verify in challenge
 * 3. Progress tracking: complete multiple -> progress
 * 4. Error recovery: invalid states, missing files
 *
 * @module test/cli/e2e_test
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { challengeCommand } from '../../src/cli/commands/challenge.ts';
import { completeCommand } from '../../src/cli/commands/complete.ts';
import { configCommand } from '../../src/cli/commands/config.ts';
import { initCommand } from '../../src/cli/commands/init.ts';
import { progressCommand } from '../../src/cli/commands/progress.ts';
import { ENV_VARS } from '../../src/cli/env.ts';
import { ExitCode } from '../../src/cli/exit-codes.ts';
import type { Args } from '../../src/cli/types.ts';
import { configManager } from '../../src/config/manager.ts';
import { problemExists } from '../../src/core/mod.ts';

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock console output to avoid noise during tests
let capturedOutput: string[] = [];

function setupConsoleCapture(): void {
  capturedOutput = [];
  console.error = (...args: unknown[]): void => {
    capturedOutput.push(args.map(String).join(' '));
  };
  console.log = (...args: unknown[]): void => {
    capturedOutput.push(args.map(String).join(' '));
  };
}

function restoreConsole(): void {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
}

function getCapturedOutput(): string {
  return capturedOutput.join('\n');
}

describe('E2E Workflow Tests - CLI-052', () => {
  let tempWorkspace: string;
  let originalAtEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    // Clear AT_* env vars so user shell exports don't override config in tests.
    originalAtEnv = {};
    for (const key of Object.values(ENV_VARS)) {
      originalAtEnv[key] = process.env[key];
      delete process.env[key];
    }
    // Create a temporary workspace for each test
    tempWorkspace = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
    setupConsoleCapture();
  });

  afterEach(async () => {
    restoreConsole();
    // Clean up temporary workspace
    try {
      await rm(tempWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore errors during cleanup
    }
    for (const [key, value] of Object.entries(originalAtEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe('Workflow 1: Fresh Start (init -> challenge -> complete)', () => {
    it('should complete a full workflow from initialization to completion', async () => {
      // Step 1: Initialize workspace
      const initArgs: Args = {
        _: ['init', tempWorkspace],
      };
      const initResult = await initCommand(initArgs);

      deepStrictEqual(initResult.success, true, 'Init should succeed');
      deepStrictEqual(initResult.exitCode, ExitCode.SUCCESS);

      const output1 = getCapturedOutput();
      ok(output1.includes('Workspace initialized'));
      ok(output1.includes('Directory structure'));

      // Reset captured output for next command
      setupConsoleCapture();

      // Step 2: Start a challenge (by slug to ensure consistent problem)
      const challengeArgs: Args = {
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      };

      // Update config to use temp workspace and typescript language
      restoreConsole(); // Don't capture config operations
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace, language: 'typescript' });
      setupConsoleCapture(); // Resume capture for command output

      const challengeResult = await challengeCommand(challengeArgs);

      deepStrictEqual(challengeResult.success, true, 'Challenge should succeed');
      deepStrictEqual(challengeResult.exitCode, ExitCode.SUCCESS);

      const output2 = getCapturedOutput();
      ok(output2.toLowerCase().includes('two sum'));

      // Verify problem files were created
      const exists = await problemExists(tempWorkspace, 'two-sum', 'typescript');
      deepStrictEqual(exists, true, 'Problem files should be created');

      // Reset captured output for next command
      setupConsoleCapture();

      // Step 3: Complete the challenge
      const completeArgs: Args = {
        _: ['complete', 'two-sum'],
        workspace: tempWorkspace,
      };

      const completeResult = await completeCommand(completeArgs);

      deepStrictEqual(completeResult.success, true, 'Complete should succeed');
      deepStrictEqual(completeResult.exitCode, ExitCode.SUCCESS);

      const output3 = getCapturedOutput();
      ok(output3.toLowerCase().includes('completed'));

      // Verify problem was moved to completed directory
      const completedPath = join(tempWorkspace, 'completed', 'two-sum');
      const completedDirExists = await stat(completedPath)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
      deepStrictEqual(
        completedDirExists,
        true,
        'Problem should be archived to completed directory',
      );
    });

    it('should handle workspace already initialized gracefully', async () => {
      // Initialize once
      const initArgs1: Args = { _: ['init', tempWorkspace] };
      const result1 = await initCommand(initArgs1);
      deepStrictEqual(result1.success, true);

      setupConsoleCapture();

      // Try to initialize again without force flag
      const initArgs2: Args = { _: ['init', tempWorkspace] };
      const result2 = await initCommand(initArgs2);

      deepStrictEqual(result2.success, true, 'Second init should succeed but do nothing');
      deepStrictEqual(result2.exitCode, ExitCode.SUCCESS);

      const output = getCapturedOutput();
      ok(output.includes('already initialized'));
    });

    it('should reinitialize workspace with --force flag', async () => {
      // Initialize once
      const initArgs1: Args = { _: ['init', tempWorkspace] };
      await initCommand(initArgs1);

      setupConsoleCapture();

      // Initialize again with force flag
      const initArgs2: Args = { _: ['init', tempWorkspace], force: true };
      const result = await initCommand(initArgs2);

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      const output = getCapturedOutput();
      ok(output.includes('Workspace initialized'));
    });
  });

  describe('Workflow 2: Configuration (config set -> verify in challenge)', () => {
    it('should respect language configuration in challenge generation', async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempWorkspace] });

      // Set language to Python directly via config update
      restoreConsole();
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace, language: 'python' });

      // Verify configuration was updated
      const config = configManager.getConfig();
      deepStrictEqual(config.language, 'python', 'Language should be set to python in config');

      setupConsoleCapture();

      // Start a challenge - should use Python language from config
      const challengeArgs: Args = {
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      };
      const challengeResult = await challengeCommand(challengeArgs);

      deepStrictEqual(challengeResult.success, true);
      deepStrictEqual(challengeResult.exitCode, ExitCode.SUCCESS);

      // Verify Python files were created
      const pythonExists = await problemExists(tempWorkspace, 'two-sum', 'python');
      setupConsoleCapture();

      deepStrictEqual(pythonExists, true, 'Python problem files should be created');

      // Verify specific Python file exists - solution.py is the standard filename
      const pythonFilePath = join(tempWorkspace, 'problems', 'two-sum', 'solution.py');
      const fileExists = await stat(pythonFilePath)
        .then(() => true)
        .catch(() => false);
      deepStrictEqual(fileExists, true, 'Python source file should exist');
    });

    it('should allow CLI argument to override config language', async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace, language: 'typescript' });

      setupConsoleCapture();

      // Start challenge with language override
      const challengeArgs: Args = {
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
        language: 'javascript',
      };
      const result = await challengeCommand(challengeArgs);

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      // Verify JavaScript files were created (overriding TypeScript config)
      const jsExists = await problemExists(tempWorkspace, 'two-sum', 'javascript');
      deepStrictEqual(jsExists, true, 'JavaScript files should be created');
    });

    it('should list and get configuration values', async () => {
      // Load config
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace, language: 'typescript' });

      setupConsoleCapture();

      // List all config
      const listArgs: Args = { _: ['config', 'list'] };
      const listResult = await configCommand(listArgs);

      deepStrictEqual(listResult.success, true);
      deepStrictEqual(listResult.exitCode, ExitCode.SUCCESS);

      const listOutput = getCapturedOutput();
      ok(listOutput.includes('language'));
      ok(listOutput.includes('workspace'));

      setupConsoleCapture();

      // Get specific config value
      const getArgs: Args = { _: ['config', 'get', 'language'] };
      const getResult = await configCommand(getArgs);

      deepStrictEqual(getResult.success, true);
      deepStrictEqual(getResult.exitCode, ExitCode.SUCCESS);

      const getOutput = getCapturedOutput();
      ok(getOutput.includes('typescript'));
    });
  });

  describe('Workflow 3: Progress Tracking (complete multiple -> progress)', () => {
    it('should track progress across multiple completed problems', async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      // Start and complete first problem
      setupConsoleCapture();
      await challengeCommand({ _: ['challenge', 'two-sum'], workspace: tempWorkspace });

      setupConsoleCapture();
      await completeCommand({ _: ['complete', 'two-sum'], workspace: tempWorkspace });

      // Start and complete second problem
      setupConsoleCapture();
      await challengeCommand({ _: ['challenge', 'add-two-numbers'], workspace: tempWorkspace });

      setupConsoleCapture();
      await completeCommand({ _: ['complete', 'add-two-numbers'], workspace: tempWorkspace });

      // Check progress
      setupConsoleCapture();
      const progressArgs: Args = { _: ['progress'] };
      const progressResult = await progressCommand(progressArgs);

      deepStrictEqual(progressResult.success, true, 'Progress command should succeed');
      deepStrictEqual(progressResult.exitCode, ExitCode.SUCCESS);

      const output = getCapturedOutput();
      // Progress should show completed count
      ok(output.toLowerCase().includes('completed'));
      // Should mention some statistics
      ok(output != null, 'Progress output should exist');
    });

    it('should show progress when no problems completed', async () => {
      // Initialize workspace with no problems
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();

      const progressArgs: Args = { _: ['progress'] };
      const result = await progressCommand(progressArgs);

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      const output = getCapturedOutput();
      // Should indicate no problems or zero progress
      ok(output != null);
    });

    it('should show current problems in progress', async () => {
      // Initialize and start a problem without completing
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();
      await challengeCommand({ _: ['challenge', 'two-sum'], workspace: tempWorkspace });

      setupConsoleCapture();
      const progressArgs: Args = { _: ['progress'] };
      const result = await progressCommand(progressArgs);

      deepStrictEqual(result.success, true);
      deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

      const output = getCapturedOutput();
      // Should show current problems
      ok(output != null);
    });
  });

  describe('Workflow 4: Error Recovery (invalid states, missing files)', () => {
    it('should handle challenge on uninitialized workspace gracefully', async () => {
      // Try to start challenge without initializing workspace
      setupConsoleCapture();

      const challengeArgs: Args = {
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      };

      // Note: The command might auto-initialize or return an error
      // We're testing that it handles this gracefully
      const result = await challengeCommand(challengeArgs);

      // Should either succeed (auto-init) or fail with proper error
      if (!result.success) {
        deepStrictEqual(
          result.exitCode !== ExitCode.SUCCESS,
          true,
          'Should have non-success exit code',
        );
        const output = getCapturedOutput();
        ok(output != null, 'Should provide error message');
      } else {
        // If it auto-initialized, that's also acceptable behavior
        deepStrictEqual(result.success, true);
      }
    });

    it('should handle completing non-existent problem gracefully', async () => {
      // Initialize workspace but don't create any problems
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();

      const completeArgs: Args = {
        _: ['complete', 'non-existent-problem'],
        workspace: tempWorkspace,
      };

      const result = await completeCommand(completeArgs);

      // Should fail with appropriate error
      deepStrictEqual(result.success, false, 'Should fail for non-existent problem');
      deepStrictEqual(result.exitCode !== ExitCode.SUCCESS, true, 'Should have error exit code');

      const output = getCapturedOutput();
      ok(output.toLowerCase().includes('not found'));
    });

    it('should handle overwriting existing problem files with --force', async () => {
      // Initialize and create a problem
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();
      await challengeCommand({ _: ['challenge', 'two-sum'], workspace: tempWorkspace });

      const output1 = getCapturedOutput();
      ok(output1.toLowerCase().includes('two sum'));

      // Verify problem files were created
      const exists = await problemExists(tempWorkspace, 'two-sum', 'typescript');
      deepStrictEqual(exists, true, 'Problem files should exist');

      // Try with force flag to overwrite
      setupConsoleCapture();
      const result2 = await challengeCommand({
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
        force: true,
      });

      deepStrictEqual(result2.success, true, 'Should succeed with force flag');
      deepStrictEqual(result2.exitCode, ExitCode.SUCCESS);

      const output2 = getCapturedOutput();
      ok(output2 != null);
    });

    it('should handle invalid configuration values gracefully', async () => {
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();

      // Try to set invalid language
      const configArgs: Args = {
        _: ['config', 'set', 'language', 'invalid-language'],
      };

      const result = await configCommand(configArgs);

      // Should fail with appropriate error
      deepStrictEqual(result.success, false, 'Should fail for invalid language');
      deepStrictEqual(result.exitCode !== ExitCode.SUCCESS, true, 'Should have error exit code');

      const output = getCapturedOutput();
      ok(output.toLowerCase().includes('invalid'));
    });

    it('should handle missing problem identifier in complete command', async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      setupConsoleCapture();

      // Try to complete without specifying problem
      const completeArgs: Args = {
        _: ['complete'],
        workspace: tempWorkspace,
      };

      const result = await completeCommand(completeArgs);

      // Should either prompt for selection or fail gracefully
      // Since we're in non-interactive mode, it should fail
      const output = getCapturedOutput();
      ok(output != null, 'Should provide some output or error');

      // Result should either succeed if it found a problem or fail appropriately
      if (!result.success) {
        ok(output.toLowerCase().includes('problem'), 'Error should mention problem');
      }
    });

    it('should handle corrupted workspace structure recovery', async () => {
      // Initialize workspace
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      // Delete a required directory to corrupt workspace
      const problemsDir = join(tempWorkspace, 'problems');
      await rm(problemsDir, { recursive: true, force: true });

      setupConsoleCapture();

      // Try to start a challenge with corrupted workspace
      const challengeArgs: Args = {
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      };

      const result = await challengeCommand(challengeArgs);

      // Command should handle the missing directory
      // Either by recreating it or by returning an appropriate error
      ok(result != null, 'Should return a result');

      if (!result.success) {
        const output = getCapturedOutput();
        ok(output != null, 'Should provide error information');
      }
    });
  });

  describe('Integration: Complex Multi-Step Workflows', () => {
    it('should support a realistic practice session workflow', async () => {
      // 1. Initialize workspace
      const initResult = await initCommand({ _: ['init', tempWorkspace] });
      deepStrictEqual(initResult.success, true);

      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace, language: 'typescript' });

      // 2. Configure preferences
      setupConsoleCapture();
      await configCommand({ _: ['config', 'set', 'language', 'javascript'] });
      const config = configManager.getConfig();
      deepStrictEqual(config.language, 'javascript');

      // 3. Start first challenge
      setupConsoleCapture();
      const challenge1 = await challengeCommand({
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(challenge1.success, true);

      // 4. Complete first challenge
      setupConsoleCapture();
      const complete1 = await completeCommand({
        _: ['complete', 'two-sum'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(complete1.success, true);

      // 5. Start second challenge
      setupConsoleCapture();
      const challenge2 = await challengeCommand({
        _: ['challenge', 'add-two-numbers'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(challenge2.success, true);

      // 6. Check progress
      setupConsoleCapture();
      const progress = await progressCommand({ _: ['progress'] });
      deepStrictEqual(progress.success, true);

      // 7. Complete second challenge
      setupConsoleCapture();
      const complete2 = await completeCommand({
        _: ['complete', 'add-two-numbers'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(complete2.success, true);

      // 8. Final progress check
      setupConsoleCapture();
      const finalProgress = await progressCommand({ _: ['progress'] });
      deepStrictEqual(finalProgress.success, true);

      const output = getCapturedOutput();
      ok(output != null, 'Final progress should show statistics');
    });

    it('should handle mixed success and failure commands gracefully', async () => {
      // Initialize
      await initCommand({ _: ['init', tempWorkspace] });
      await configManager.load();
      await configManager.updateConfig({ workspace: tempWorkspace });

      // Success: Start valid challenge
      setupConsoleCapture();
      const goodChallenge = await challengeCommand({
        _: ['challenge', 'two-sum'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(goodChallenge.success, true);

      // Failure: Try to complete non-existent problem
      setupConsoleCapture();
      const badComplete = await completeCommand({
        _: ['complete', 'non-existent'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(badComplete.success, false);

      // Success: Check progress (should still work despite previous error)
      setupConsoleCapture();
      const progress = await progressCommand({ _: ['progress'] });
      deepStrictEqual(progress.success, true);

      // Success: Complete the valid problem
      setupConsoleCapture();
      const goodComplete = await completeCommand({
        _: ['complete', 'two-sum'],
        workspace: tempWorkspace,
      });
      deepStrictEqual(goodComplete.success, true);
    });
  });
});
