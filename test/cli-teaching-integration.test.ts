/**
 * Integration tests for CLI teaching system integration
 *
 * Tests the full workflow of teaching system integration with CLI commands
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeConfig } from '../src/config/manager.ts';
import { TeachingEngine, TeachingSession } from '../src/core/ai/mod.ts';

describe('CLI Teaching System Integration', () => {
  const tempDir = '/tmp/cli-teaching-integration-test';

  beforeEach(async () => {
    await initializeConfig();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should load teaching script when available', async () => {
    // Create a test problem directory with a trainer.yaml
    const problemDir = join(tempDir, 'test-problem');
    await mkdir(problemDir, { recursive: true });

    const trainerYaml = `
id: "test-problem"
title: "Test Problem"
difficulty: "easy"
tags: ["array"]
language: "typescript"
steps:
  - type: intro
    content: "Welcome to the test problem!"
  - type: pre_prompt
    content: "Think about arrays and loops."
  - type: hint
    trigger: "attempts > 2"
    content: "Try using a hash table for O(1) lookups."
  - type: after_success
    content: "Congratulations! You solved it!"
`;

    await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

    // Simulate challenge command loading teaching script
    const session = new TeachingSession('test-problem');
    const engine = new TeachingEngine(session);
    const loaded = await engine.loadScript(problemDir);

    deepStrictEqual(loaded, true, 'Teaching script should be loaded');

    // Test introduction
    const intro = engine.getIntroduction();
    ok(intro != null, 'Introduction should exist');
    deepStrictEqual(intro?.includes('Welcome to the test problem!'), true);

    // Test pre-prompt
    const prePrompt = engine.getPrePrompt();
    ok(prePrompt != null, 'Pre-prompt should exist');
    deepStrictEqual(prePrompt?.includes('Think about arrays'), true);

    // Test success message
    const successMsg = engine.getSuccessMessage();
    ok(successMsg != null, 'Success message should exist');
    deepStrictEqual(successMsg?.includes('Congratulations'), true);
  });

  it('should respect aiEnabled config setting', async () => {
    // This test verifies that the config setting exists and can be checked
    const config = await initializeConfig();

    // Default should be true
    deepStrictEqual(config.aiEnabled, true, 'aiEnabled should default to true');

    // Teaching features should check this setting
    // The actual command implementations check config.aiEnabled before loading scripts
  });

  it('should fall back gracefully when no teaching script exists', async () => {
    const problemDir = join(tempDir, 'no-script-problem');
    await mkdir(problemDir, { recursive: true });

    const session = new TeachingSession('no-script-problem');
    const engine = new TeachingEngine(session);
    const loaded = await engine.loadScript(problemDir);

    deepStrictEqual(loaded, false, 'Should return false when no script exists');

    // Methods should return null when no script is loaded
    deepStrictEqual(engine.getIntroduction(), null);
    deepStrictEqual(engine.getPrePrompt(), null);
    deepStrictEqual(engine.getSuccessMessage(), null);
  });

  it('should provide contextual hints based on code', async () => {
    const problemDir = join(tempDir, 'hint-problem');
    await mkdir(problemDir, { recursive: true });

    const trainerYaml = `
id: "hint-problem"
title: "Hint Problem"
difficulty: "medium"
tags: ["array"]
language: "typescript"
steps:
  - type: hint
    trigger: "code.includes('for') && code.includes('for')"
    content: "Consider using a hash table instead of nested loops."
  - type: hint
    trigger: "attempts > 2"
    content: "Have you tried a different approach?"
`;

    await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

    const session = new TeachingSession('hint-problem');
    const engine = new TeachingEngine(session);
    await engine.loadScript(problemDir);

    // Test hint with nested loops
    const code =
      'function solve() { for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) {} } }';
    const hint = engine.getHint(code);
    ok(hint != null, 'Should provide hint for nested loops');
    deepStrictEqual(hint?.includes('hash table'), true);

    // Test hint with multiple attempts
    session.recordAttempt('attempt 1');
    session.recordAttempt('attempt 2');
    session.recordAttempt('attempt 3');

    const attemptsHint = engine.getHint('some code');
    ok(attemptsHint != null, 'Should provide hint after multiple attempts');
    deepStrictEqual(attemptsHint?.includes('different approach'), true);
  });

  it('should track teaching session state', () => {
    const session = new TeachingSession('state-test');
    const state = session.getState();

    deepStrictEqual(state.problemId, 'state-test');
    deepStrictEqual(state.attempts, 0);
    deepStrictEqual(state.hintsViewed, 0);

    // Record attempts
    session.recordAttempt('code 1');
    session.recordAttempt('code 2');
    deepStrictEqual(session.getState().attempts, 2);

    // Track hints viewed
    session.incrementHintsViewed();
    session.incrementHintsViewed();
    deepStrictEqual(session.getState().hintsViewed, 2);

    // Record execution
    session.recordExecution({
      stdout: 'output',
      stderr: '',
      passed: true,
      exitCode: 0,
    });
    deepStrictEqual(session.getState().passed, true);
  });
});
