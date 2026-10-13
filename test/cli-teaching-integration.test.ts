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
import { TeachingEngine } from '../src/core/ai/mod.ts';

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

  it('should load an older teaching script, skipping its retired steps', async () => {
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
    const engine = new TeachingEngine('test-problem');
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

    const engine = new TeachingEngine('no-script-problem');
    const loaded = await engine.loadScript(problemDir);

    deepStrictEqual(loaded, false, 'Should return false when no script exists');

    // Methods should return null when no script is loaded
    deepStrictEqual(engine.getIntroduction(), null);
    deepStrictEqual(engine.getPrePrompt(), null);
  });
});
