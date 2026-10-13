/**
 * Integration tests for AI Teaching System (ATS-019)
 *
 * End-to-end tests covering full user workflows, CLI integration,
 * and script discovery mechanisms.
 *
 * @module test/ai/integration
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeConfig } from '../../src/config/manager.ts';
import { getConfigPaths } from '../../src/config/paths.ts';
import { TeachingEngine, TeachingSession } from '../../src/core/ai/mod.ts';
import { findTeachingScript, loadAndValidateScript } from '../../src/core/ai/parser.ts';
import type { ExecutionResult } from '../../src/core/ai/types.ts';

describe('AI Teaching System Integration Tests', () => {
  const tempDir = '/tmp/ai-integration-test';
  const problemsDir = join(tempDir, 'problems');

  beforeEach(async () => {
    await mkdir(problemsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Full Workflow Tests', () => {
    it('should execute complete teaching workflow: intro → code → hint → run → feedback → success', async () => {
      // Setup: Create a problem with comprehensive teaching script
      const problemDir = join(problemsDir, 'workflow-test');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "workflow-test"
title: "Complete Workflow Test"
difficulty: "easy"
tags: ["array", "hash-table"]
language: "typescript"
steps:
  - type: intro
    content: "Welcome to the Complete Workflow Test! This problem tests the full teaching system."
  - type: pre_prompt
    content: "Before you start coding, consider using a hash table for O(1) lookups."
  - type: hint
    trigger: "code.includes('for') && code.includes('for')"
    content: "You're using nested loops. Consider using a hash table to reduce time complexity."
  - type: hint
    trigger: "attempts > 2"
    content: "Don't give up! You've attempted {{attempts}} times. Review the constraints and examples."
  - type: on_run
    trigger: "!passed && stderr.includes('Error')"
    content: "Your code has an error. Check the error message carefully: {{stderr}}"
  - type: on_run
    trigger: "!passed && attempts >= 2"
    content: "Keep trying! You're on attempt {{attempts}}. Look at the test cases more carefully."
  - type: after_success
    content: "Congratulations! You solved the problem in {{attempts}} attempts! 🎉"
  - type: on_request
    keywords: ["optimize", "complexity"]
    content: "To optimize, use a hash table to achieve O(n) time complexity."
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      // Step 1: Initialize session and engine
      const session = new TeachingSession('workflow-test');
      const engine = new TeachingEngine(session);

      // Step 2: Load script
      const loaded = await engine.loadScript(problemDir);
      deepStrictEqual(loaded, true, 'Script should load successfully');

      // Step 3: Get introduction (problem start)
      const intro = engine.getIntroduction();
      ok(intro != null, 'Introduction should exist');
      ok(intro.includes('Complete Workflow Test'));
      ok(intro.includes('full teaching system'));

      // Step 4: Get pre-prompt (before coding)
      const prePrompt = engine.getPrePrompt();
      ok(prePrompt != null, 'Pre-prompt should exist');
      ok(prePrompt.includes('hash table'));
      ok(prePrompt.includes('O(1)'));

      // Step 5: Write code with nested loops
      const codeWithNestedLoops = `
function solve(nums: number[]): number {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}
`;

      // Step 6: Get contextual hint (detects nested loops)
      const hint1 = engine.getHint(codeWithNestedLoops);
      ok(hint1 != null, 'Should provide hint for nested loops');
      ok(hint1.includes('nested loops'));
      ok(hint1.includes('hash table'));

      // Step 7: Run code (first failed attempt with error)
      const failedResult1: ExecutionResult = {
        stdout: '',
        stderr: 'TypeError: target is not defined',
        passed: false,
        exitCode: 1,
      };

      const feedback1 = engine.processExecution(codeWithNestedLoops, failedResult1);
      ok(feedback1 != null, 'Should provide feedback for error');
      ok(feedback1.includes('error'));

      // Step 8: Second failed attempt
      const failedResult2: ExecutionResult = {
        stdout: 'Test failed: expected [0, 1] but got []',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      const feedback2 = engine.processExecution(codeWithNestedLoops, failedResult2);
      ok(feedback2 != null, 'Should provide encouragement after multiple attempts');
      deepStrictEqual(session.getState().attempts, 2, 'Should have 2 attempts');

      // Step 9: Third failed attempt to trigger attempts > 2 hint
      const failedResult3: ExecutionResult = {
        stdout: 'Still failing',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      engine.processExecution('another attempt', failedResult3);
      deepStrictEqual(session.getState().attempts, 3, 'Should have 3 attempts');

      // Now get hint based on attempts > 2
      const hint2 = engine.getHint('some code');
      ok(hint2 != null, 'Should provide hint after multiple attempts');
      ok(hint2.includes("Don't give up"));
      ok(hint2.includes('3')); // attempts count

      // Step 10: Successful attempt
      const successResult: ExecutionResult = {
        stdout: 'All tests passed',
        stderr: '',
        passed: true,
        exitCode: 0,
      };

      const _feedback3 = engine.processExecution('optimized code', successResult);
      // on_run feedback is optional for success

      // Step 11: Get success message
      const successMsg = engine.getSuccessMessage();
      ok(successMsg != null, 'Success message should exist');
      ok(successMsg.includes('Congratulations'));
      ok(successMsg.includes('🎉'));
      ok(successMsg.includes('4')); // final attempt count (3 failed + 1 success)

      // Step 12: Handle explicit request
      const request = engine.handleRequest('How can I optimize this?');
      ok(request != null, 'Should handle optimization request');
      ok(request.includes('optimize'));
      ok(request.includes('O(n)'));

      // Verify final session state
      const finalState = session.getState();
      deepStrictEqual(finalState.attempts, 4, 'Should have 4 total attempts');
      deepStrictEqual(finalState.passed, true, 'Should be marked as passed');
      deepStrictEqual(finalState.hintsViewed, 2, 'Should have viewed 2 hints');
    });

    it('should handle workflow without optional steps gracefully', async () => {
      // Create minimal teaching script (only intro and success)
      const problemDir = join(problemsDir, 'minimal-workflow');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "minimal-workflow"
title: "Minimal Workflow"
difficulty: "easy"
tags: ["test"]
language: "typescript"
steps:
  - type: intro
    content: "Minimal introduction"
  - type: after_success
    content: "Great job!"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const session = new TeachingSession('minimal-workflow');
      const engine = new TeachingEngine(session);
      await engine.loadScript(problemDir);

      // Should have intro and success
      ok(engine.getIntroduction() != null);
      ok(engine.getSuccessMessage() != null);

      // Should return null for missing optional steps
      deepStrictEqual(engine.getPrePrompt(), null, 'No pre-prompt available');
      deepStrictEqual(engine.getHint('code'), null, 'No hints available');

      const result: ExecutionResult = {
        stdout: '',
        stderr: '',
        passed: false,
        exitCode: 0,
      };
      deepStrictEqual(
        engine.processExecution('code', result),
        null,
        'No on_run feedback available',
      );
      deepStrictEqual(engine.handleRequest('help'), null, 'No on_request handlers available');
    });
  });

  describe('CLI Integration Tests', () => {
    it('should support challenge command with teaching system', async () => {
      // Simulate what challenge command does with teaching
      await initializeConfig();

      const problemDir = join(problemsDir, 'challenge-test');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "challenge-test"
title: "Challenge Command Test"
difficulty: "medium"
tags: ["dynamic-programming"]
language: "typescript"
steps:
  - type: intro
    content: "This problem requires dynamic programming."
  - type: pre_prompt
    content: "Think about overlapping subproblems and memoization."
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      // Simulate challenge command flow
      const session = new TeachingSession('challenge-test');
      const engine = new TeachingEngine(session);
      const loaded = await engine.loadScript(problemDir);

      deepStrictEqual(loaded, true, 'Challenge should load teaching script');

      // Challenge command would display intro
      const intro = engine.getIntroduction();
      ok(intro != null, 'Challenge should show introduction');

      // Challenge command would display pre-prompt
      const prePrompt = engine.getPrePrompt();
      ok(prePrompt != null, 'Challenge should show pre-prompt guidance');
    });

    it('should support hint command with contextual hints', async () => {
      // Simulate what hint command does
      const problemDir = join(problemsDir, 'hint-command-test');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "hint-command-test"
title: "Hint Command Test"
difficulty: "hard"
tags: ["tree"]
language: "typescript"
steps:
  - type: hint
    trigger: "code.includes('null')"
    content: "Remember to handle null/None base cases in recursive tree problems."
  - type: hint
    trigger: "attempts > 1"
    content: "Try drawing out the recursion tree to visualize the problem."
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      // User starts working on problem
      const session = new TeachingSession('hint-command-test');
      const engine = new TeachingEngine(session);
      await engine.loadScript(problemDir);

      // User writes code with null checks
      const userCode = `
function traverse(node) {
  if (node === null) return;
  traverse(node.left);
}
`;

      // Hint command would call getHint with current code
      const hint = engine.getHint(userCode);
      ok(hint != null, 'Hint command should provide contextual hint');
      ok(hint.includes('null'));
      ok(hint.includes('base case'));

      // After user makes attempts
      session.recordAttempt('attempt 1');
      session.recordAttempt('attempt 2');

      const hint2 = engine.getHint('different code');
      ok(hint2 != null, 'Should provide different hint after attempts');
      ok(hint2.includes('recursion tree'));
    });

    it('should respect aiEnabled config setting', async () => {
      // Initialize config
      const config = await initializeConfig();

      // Verify default is enabled
      deepStrictEqual(config.aiEnabled, true, 'AI teaching should be enabled by default');

      // When aiEnabled is false, commands should skip teaching features
      // This would be checked by actual CLI commands before calling engine
      // Example: if (!config.aiEnabled) return;

      // Verify engine still works when explicitly used (doesn't check config itself)
      const problemDir = join(problemsDir, 'config-test');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "config-test"
title: "Config Test"
difficulty: "easy"
tags: ["test"]
language: "typescript"
steps:
  - type: intro
    content: "Test intro"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const session = new TeachingSession('config-test');
      const engine = new TeachingEngine(session);
      const loaded = await engine.loadScript(problemDir);

      deepStrictEqual(loaded, true, 'Engine should work regardless of config');
    });
  });

  describe('Script Discovery Tests', () => {
    it('should find and load every built-in teaching script', async () => {
      const scriptsDir = join(import.meta.dir, '..', '..', 'src', 'data', 'scripts');
      const slugs = await readdir(scriptsDir);
      ok(slugs.length >= 10, `expected at least 10 built-in scripts, found ${slugs.length}`);

      for (const slug of slugs) {
        const scriptPath = await findTeachingScript(slug);
        ok(scriptPath != null, `Should find built-in script for ${slug}`);
        ok(scriptPath.includes('src/data/scripts'), 'Should point to built-in scripts directory');

        const script = await loadAndValidateScript(scriptPath);
        ok(script != null, `Should load built-in script for ${slug}`);
        deepStrictEqual(script.id, slug, 'Script ID should match slug');
        ok(
          (
            await stat(join(import.meta.dir, '..', '..', 'src', 'data', 'problems', `${slug}.json`))
          ).isFile(),
          `Built-in script ${slug} should match a problem`,
        );
      }
    });

    it('should prioritize custom scripts over built-in scripts', async () => {
      const userScriptDir = join(getConfigPaths().data, 'scripts', 'two-sum');
      await mkdir(userScriptDir, { recursive: true });
      const userScriptPath = join(userScriptDir, 'trainer.yaml');
      await writeFile(
        userScriptPath,
        'id: two-sum\ntitle: Two Sum (Custom)\ndifficulty: easy\ntags: [array]\nlanguage: typescript\nsteps:\n  - type: intro\n    content: Custom intro\n',
      );

      try {
        deepStrictEqual(await findTeachingScript('two-sum'), userScriptPath);
      } finally {
        await rm(join(getConfigPaths().data, 'scripts'), { recursive: true, force: true });
      }
      ok((await findTeachingScript('two-sum'))?.includes('src/data/scripts'));
    });

    it('should handle missing scripts gracefully', async () => {
      const nonExistentSlug = 'non-existent-problem-slug-12345';

      const scriptPath = await findTeachingScript(nonExistentSlug);
      deepStrictEqual(scriptPath, null, 'Should return null for non-existent script');

      // Engine should handle missing script gracefully
      const session = new TeachingSession(nonExistentSlug);
      const engine = new TeachingEngine(session);

      // Try to load from a directory without a script
      const emptyDir = join(problemsDir, 'empty-problem');
      await mkdir(emptyDir, { recursive: true });

      const loaded = await engine.loadScript(emptyDir);
      deepStrictEqual(loaded, false, 'Should return false for missing script');

      // All methods should return null when no script is loaded
      deepStrictEqual(engine.getIntroduction(), null);
      deepStrictEqual(engine.getPrePrompt(), null);
      deepStrictEqual(engine.getHint('code'), null);
      deepStrictEqual(engine.getSuccessMessage(), null);
      deepStrictEqual(engine.handleRequest('help'), null);

      const result: ExecutionResult = {
        stdout: '',
        stderr: '',
        passed: false,
        exitCode: 0,
      };
      deepStrictEqual(engine.processExecution('code', result), null);
    });

    it('should load scripts from problem directory', async () => {
      // Create a problem with its own trainer.yaml
      const problemDir = join(problemsDir, 'custom-problem');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "custom-problem"
title: "Custom Problem"
difficulty: "medium"
tags: ["graph"]
language: "typescript"
steps:
  - type: intro
    content: "Welcome to this custom problem!"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const session = new TeachingSession('custom-problem');
      const engine = new TeachingEngine(session);

      // Load directly from problem directory
      const loaded = await engine.loadScript(problemDir);
      deepStrictEqual(loaded, true, 'Should load script from problem directory');

      const intro = engine.getIntroduction();
      ok(intro != null, 'Should have loaded intro');
      ok(intro.includes('custom problem'));
    });
  });

  describe('Session State Management Integration', () => {
    it('should maintain session state across engine operations', async () => {
      const problemDir = join(problemsDir, 'session-test');
      await mkdir(problemDir, { recursive: true });

      const trainerYaml = `
id: "session-test"
title: "Session Test"
difficulty: "easy"
tags: ["test"]
language: "typescript"
steps:
  - type: intro
    content: "Session state test"
  - type: hint
    trigger: "attempts > 0"
    content: "Hint after attempts"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const session = new TeachingSession('session-test');
      const engine = new TeachingEngine(session);
      await engine.loadScript(problemDir);

      // Initial state
      let state = session.getState();
      deepStrictEqual(state.attempts, 0);
      deepStrictEqual(state.hintsViewed, 0);
      deepStrictEqual(state.passed, false);

      // Execute code
      const result1: ExecutionResult = {
        stdout: 'output',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      engine.processExecution('code1', result1);

      state = session.getState();
      deepStrictEqual(state.attempts, 1, 'Attempts should increment');
      deepStrictEqual(state.codeHistory.length, 1, 'Code history should be recorded');

      // Get hint
      engine.getHint('code2');

      state = session.getState();
      deepStrictEqual(state.hintsViewed, 1, 'Hints viewed should increment');

      // Multiple executions
      engine.processExecution('code3', result1);
      engine.processExecution('code4', result1);

      state = session.getState();
      deepStrictEqual(state.attempts, 3, 'Should track all attempts');
      deepStrictEqual(state.codeHistory.length, 3, 'Should record all code');

      // Success
      const successResult: ExecutionResult = {
        stdout: 'success',
        stderr: '',
        passed: true,
        exitCode: 0,
      };

      engine.processExecution('finalCode', successResult);

      state = session.getState();
      deepStrictEqual(state.passed, true, 'Should mark as passed');
      deepStrictEqual(state.lastOutput, 'success', 'Should record last output');
    });

    it('should reset session state for new problem', () => {
      const session = new TeachingSession('problem1');

      // Do some work
      session.recordAttempt('code1');
      session.incrementHintsViewed();

      let state = session.getState();
      deepStrictEqual(state.problemId, 'problem1');
      deepStrictEqual(state.attempts, 1);
      deepStrictEqual(state.hintsViewed, 1);

      // Reset for new problem
      session.reset('problem2');

      state = session.getState();
      deepStrictEqual(state.problemId, 'problem2');
      deepStrictEqual(state.attempts, 0, 'Attempts should reset');
      deepStrictEqual(state.hintsViewed, 0, 'Hints should reset');
      deepStrictEqual(state.passed, false, 'Passed should reset');
      deepStrictEqual(state.codeHistory.length, 0, 'Code history should reset');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid teaching scripts gracefully', async () => {
      const problemDir = join(problemsDir, 'invalid-script');
      await mkdir(problemDir, { recursive: true });

      // Invalid YAML (missing required fields)
      const invalidYaml = `
id: "invalid-script"
# missing title, difficulty, language, steps
`;

      await writeFile(join(problemDir, 'trainer.yaml'), invalidYaml);

      const session = new TeachingSession('invalid-script');
      const engine = new TeachingEngine(session);

      // Should throw error on load (validation fails)
      let errorThrown = false;
      try {
        await engine.loadScript(problemDir);
      } catch (error) {
        errorThrown = true;
        ok(error != null, 'Should throw error for invalid script');
      }

      deepStrictEqual(errorThrown, true, 'Should throw error for invalid script');
    });

    it('should handle malformed YAML gracefully', async () => {
      const problemDir = join(problemsDir, 'malformed-yaml');
      await mkdir(problemDir, { recursive: true });

      // Malformed YAML syntax
      const malformedYaml = `
id: "test"
title: "Test
  this is not valid yaml: [
`;

      await writeFile(join(problemDir, 'trainer.yaml'), malformedYaml);

      const session = new TeachingSession('malformed-yaml');
      const engine = new TeachingEngine(session);

      let errorThrown = false;
      try {
        await engine.loadScript(problemDir);
      } catch (error) {
        errorThrown = true;
        ok(error != null, 'Should throw error for malformed YAML');
      }

      deepStrictEqual(errorThrown, true, 'Should throw error for malformed YAML');
    });
  });
});
