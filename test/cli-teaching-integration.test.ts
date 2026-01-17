/**
 * Integration tests for CLI teaching system integration
 *
 * Tests the full workflow of teaching system integration with CLI commands
 */

import { assertEquals, assertExists } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { initializeConfig } from '../src/config/manager.ts';
import { TeachingEngine, TeachingSession } from '../src/core/ai/mod.ts';
import { ensureDir } from '@std/fs';
import { join } from '@std/path';

describe('CLI Teaching System Integration', () => {
  const tempDir = '/tmp/cli-teaching-integration-test';

  beforeEach(async () => {
    await initializeConfig();
    await ensureDir(tempDir);
  });

  afterEach(async () => {
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore errors
    }
  });

  it('should load teaching script when available', async () => {
    // Create a test problem directory with a trainer.yaml
    const problemDir = join(tempDir, 'test-problem');
    await ensureDir(problemDir);

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

    await Deno.writeTextFile(join(problemDir, 'trainer.yaml'), trainerYaml);

    // Simulate challenge command loading teaching script
    const session = new TeachingSession('test-problem');
    const engine = new TeachingEngine(session);
    const loaded = await engine.loadScript(problemDir);

    assertEquals(loaded, true, 'Teaching script should be loaded');

    // Test introduction
    const intro = engine.getIntroduction();
    assertExists(intro, 'Introduction should exist');
    assertEquals(intro?.includes('Welcome to the test problem!'), true);

    // Test pre-prompt
    const prePrompt = engine.getPrePrompt();
    assertExists(prePrompt, 'Pre-prompt should exist');
    assertEquals(prePrompt?.includes('Think about arrays'), true);

    // Test success message
    const successMsg = engine.getSuccessMessage();
    assertExists(successMsg, 'Success message should exist');
    assertEquals(successMsg?.includes('Congratulations'), true);
  });

  it('should respect aiEnabled config setting', async () => {
    // This test verifies that the config setting exists and can be checked
    const config = await initializeConfig();
    
    // Default should be true
    assertEquals(config.aiEnabled, true, 'aiEnabled should default to true');

    // Teaching features should check this setting
    // The actual command implementations check config.aiEnabled before loading scripts
  });

  it('should fall back gracefully when no teaching script exists', async () => {
    const problemDir = join(tempDir, 'no-script-problem');
    await ensureDir(problemDir);

    const session = new TeachingSession('no-script-problem');
    const engine = new TeachingEngine(session);
    const loaded = await engine.loadScript(problemDir);

    assertEquals(loaded, false, 'Should return false when no script exists');

    // Methods should return null when no script is loaded
    assertEquals(engine.getIntroduction(), null);
    assertEquals(engine.getPrePrompt(), null);
    assertEquals(engine.getSuccessMessage(), null);
  });

  it('should provide contextual hints based on code', async () => {
    const problemDir = join(tempDir, 'hint-problem');
    await ensureDir(problemDir);

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

    await Deno.writeTextFile(join(problemDir, 'trainer.yaml'), trainerYaml);

    const session = new TeachingSession('hint-problem');
    const engine = new TeachingEngine(session);
    await engine.loadScript(problemDir);

    // Test hint with nested loops
    const code = 'function solve() { for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) {} } }';
    const hint = engine.getHint(code);
    assertExists(hint, 'Should provide hint for nested loops');
    assertEquals(hint?.includes('hash table'), true);

    // Test hint with multiple attempts
    session.recordAttempt('attempt 1');
    session.recordAttempt('attempt 2');
    session.recordAttempt('attempt 3');

    const attemptsHint = engine.getHint('some code');
    assertExists(attemptsHint, 'Should provide hint after multiple attempts');
    assertEquals(attemptsHint?.includes('different approach'), true);
  });

  it('should track teaching session state', () => {
    const session = new TeachingSession('state-test');
    const state = session.getState();

    assertEquals(state.problemId, 'state-test');
    assertEquals(state.attempts, 0);
    assertEquals(state.hintsViewed, 0);

    // Record attempts
    session.recordAttempt('code 1');
    session.recordAttempt('code 2');
    assertEquals(session.getState().attempts, 2);

    // Track hints viewed
    session.incrementHintsViewed();
    session.incrementHintsViewed();
    assertEquals(session.getState().hintsViewed, 2);

    // Record execution
    session.recordExecution({
      stdout: 'output',
      stderr: '',
      passed: true,
      exitCode: 0,
    });
    assertEquals(session.getState().passed, true);
  });
});
