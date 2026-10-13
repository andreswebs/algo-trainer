/**
 * Tests for AI Teaching System Engine Core
 *
 * @module tests/ai/engine
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok, rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TeachingEngine } from '../../src/core/ai/engine.ts';
import { TeachingSession } from '../../src/core/ai/session.ts';
import type { ExecutionResult } from '../../src/core/ai/types.ts';
import { TeachingError } from '../../src/utils/errors.ts';
import { assertRejectsWith } from '../helpers/assert.ts';

describe('TeachingEngine', () => {
  let session: TeachingSession;
  let engine: TeachingEngine;
  let testDir: string;
  let testProblemDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'algo-trainer-engine-'));
    session = new TeachingSession('test-problem');
    engine = new TeachingEngine(session);
    testProblemDir = join(testDir, 'test-problem');
    await mkdir(testProblemDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create an engine with session', () => {
      const newSession = new TeachingSession('another-problem');
      const newEngine = new TeachingEngine(newSession);
      ok(newEngine != null);
    });

    it('should start with no script loaded', () => {
      const info = engine.getScriptInfo();
      deepStrictEqual(info, null);
    });
  });

  describe('loadScript', () => {
    it('should load and validate a valid script', async () => {
      // Create trainer.yaml
      const scriptYaml = `
id: test-problem
title: Test Problem
difficulty: easy
tags: [array, hash-table]
language: typescript
steps:
  - type: intro
    content: Welcome!
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);

      const loaded = await engine.loadScript(testProblemDir);
      deepStrictEqual(loaded, true);

      const info = engine.getScriptInfo();
      ok(info != null);
      deepStrictEqual(info.id, 'test-problem');
      deepStrictEqual(info.title, 'Test Problem');
    });

    it('should return false when no script exists', async () => {
      const loaded = await engine.loadScript(testProblemDir);
      deepStrictEqual(loaded, false);

      const info = engine.getScriptInfo();
      deepStrictEqual(info, null);
    });

    it('should throw TeachingError for invalid script', async () => {
      // Create invalid YAML
      const invalidYaml = '{ invalid yaml content: [ }';
      await writeFile(join(testProblemDir, 'trainer.yaml'), invalidYaml);

      await assertRejectsWith(
        async () => await engine.loadScript(testProblemDir),
        TeachingError,
        'Failed to load teaching script',
      );
    });

    it('should throw TeachingError for script validation failure', async () => {
      // Create script missing required fields
      const invalidScript = `
id: test
steps: []
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), invalidScript);

      await rejects(async () => await engine.loadScript(testProblemDir), TeachingError);
    });
  });

  describe('reset', () => {
    it('should clear the loaded script', async () => {
      // Create and load a script
      const scriptYaml = `
id: test-problem
title: Test Problem
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Welcome!
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      // Verify script is loaded
      let info = engine.getScriptInfo();
      ok(info != null);

      // Reset
      engine.reset();

      // Verify script is cleared
      info = engine.getScriptInfo();
      deepStrictEqual(info, null);
    });
  });

  describe('getScriptInfo', () => {
    it('should return null when no script loaded', () => {
      const info = engine.getScriptInfo();
      deepStrictEqual(info, null);
    });

    it('should return script metadata when script loaded', async () => {
      const scriptYaml = `
id: test-problem
title: Test Problem
difficulty: medium
tags:
  - array
  - hash-table
language: typescript
steps:
  - type: intro
    content: Welcome!
  - type: hint
    content: Hint 1
    trigger: "attempts > 0"
  - type: hint
    content: Hint 2
    trigger: "attempts > 1"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const info = engine.getScriptInfo();
      ok(info != null);
      deepStrictEqual(info.id, 'test-problem');
      deepStrictEqual(info.title, 'Test Problem');
      deepStrictEqual(info.difficulty, 'medium');
      deepStrictEqual(info.tags, ['array', 'hash-table']);
      deepStrictEqual(info.language, 'typescript');
      deepStrictEqual(info.stepCount, 3);
    });

    it('should return a copy of tags array', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: [array]
language: typescript
steps:
  - type: intro
    content: Welcome!
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const info1 = engine.getScriptInfo();
      ok(info1 != null);
      info1.tags.push('modified');

      const info2 = engine.getScriptInfo();
      ok(info2 != null);
      deepStrictEqual(info2.tags, ['array']);
    });
  });

  describe('getIntroduction', () => {
    it('should return null when no script loaded', () => {
      const intro = engine.getIntroduction();
      deepStrictEqual(intro, null);
    });

    it('should return null when no intro step exists', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags:
  - test
language: typescript
steps:
  - type: hint
    content: Just a hint
    trigger: "attempts > 0"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, null);
    });

    it('should return intro step content with formatted variables', async () => {
      const scriptYaml = `
id: test-problem
title: Two Sum
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: "Welcome to {{title}}! This is a {{difficulty}} problem."
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, 'Welcome to Two Sum! This is a easy problem.');
    });

    it('should return first intro step when multiple exist', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: "First intro"
  - type: intro
    content: "Second intro"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, 'First intro');
    });
  });

  describe('getPrePrompt', () => {
    it('should return null when no script loaded', () => {
      const prePrompt = engine.getPrePrompt();
      deepStrictEqual(prePrompt, null);
    });

    it('should return null when no pre_prompt step exists', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro only
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const prePrompt = engine.getPrePrompt();
      deepStrictEqual(prePrompt, null);
    });

    it('should return pre_prompt step content', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: pre_prompt
    content: "Think about using a hash map."
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const prePrompt = engine.getPrePrompt();
      deepStrictEqual(prePrompt, 'Think about using a hash map.');
    });
  });

  describe('getHint', () => {
    it('should return null when no script loaded', () => {
      const hint = engine.getHint('some code');
      deepStrictEqual(hint, null);
    });

    it('should return null when no hint steps exist', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro only
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const hint = engine.getHint('function solve() {}');
      deepStrictEqual(hint, null);
    });

    it('should return hint when trigger matches', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: hint
    content: "Use a Map!"
    trigger: "!code.includes('Map')"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const code = 'function solve() { for (let i = 0; i < n; i++) {} }';
      const hint = engine.getHint(code);
      deepStrictEqual(hint, 'Use a Map!');
    });

    it('should return first matching hint', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: hint
    content: "First hint"
    trigger: "code.includes('for')"
  - type: hint
    content: "Second hint"
    trigger: "code.includes('for')"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const code = 'for (let i = 0; i < n; i++) {}';
      const hint = engine.getHint(code);
      deepStrictEqual(hint, 'First hint');
    });

    it('should return null when no triggers match', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: hint
    content: "Use Map"
    trigger: "code.includes('Map')"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const code = 'function solve() {}';
      const hint = engine.getHint(code);
      deepStrictEqual(hint, null);
    });

    it('should increment hints viewed counter', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: hint
    content: "Hint"
    trigger: "attempts > 0"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      session.recordAttempt('code');
      deepStrictEqual(session.getState().hintsViewed, 0);

      engine.getHint('code');
      deepStrictEqual(session.getState().hintsViewed, 1);

      engine.getHint('code');
      deepStrictEqual(session.getState().hintsViewed, 2);
    });

    it('should not increment hints viewed when no hint returned', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: hint
    content: "Hint"
    trigger: "code.includes('never-matches')"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      engine.getHint('some code');
      deepStrictEqual(session.getState().hintsViewed, 0);
    });

    it('should return hint without trigger', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags:
  - test
language: typescript
steps:
  - type: hint
    content: "Always available hint"
    trigger: "attempts >= 0"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const hint = engine.getHint('any code');
      deepStrictEqual(hint, 'Always available hint');
    });
  });

  describe('getSuccessMessage', () => {
    it('should return null when no script loaded', () => {
      const msg = engine.getSuccessMessage();
      deepStrictEqual(msg, null);
    });

    it('should return null when no after_success step exists', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const msg = engine.getSuccessMessage();
      deepStrictEqual(msg, null);
    });

    it('should return success message with formatted variables', async () => {
      const scriptYaml = `
id: test-problem
title: Two Sum
difficulty: easy
tags: []
language: typescript
steps:
  - type: after_success
    content: "Great! You completed {{title}} in {{attempts}} attempts."
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      session.recordAttempt('code1');
      session.recordAttempt('code2');
      session.recordAttempt('code3');

      const msg = engine.getSuccessMessage();
      deepStrictEqual(msg, 'Great! You completed Two Sum in 3 attempts.');
    });
  });

  describe('handleRequest', () => {
    it('should return null when no script loaded', () => {
      const help = engine.handleRequest('help me');
      deepStrictEqual(help, null);
    });

    it('should return null when no on_request steps exist', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const help = engine.handleRequest('optimize');
      deepStrictEqual(help, null);
    });

    it('should match keywords case-insensitively', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_request
    content: "Use a hash map for optimization."
    keywords: [optimize, faster]
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const help1 = engine.handleRequest('how to OPTIMIZE?');
      deepStrictEqual(help1, 'Use a hash map for optimization.');

      const help2 = engine.handleRequest('make it FASTER');
      deepStrictEqual(help2, 'Use a hash map for optimization.');
    });

    it('should return null when no keywords match', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_request
    content: "Help text"
    keywords: [optimize]
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const help = engine.handleRequest('something else');
      deepStrictEqual(help, null);
    });

    it('should return first matching step', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_request
    content: "First help"
    keywords: [help]
  - type: on_request
    content: "Second help"
    keywords: [help]
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const help = engine.handleRequest('I need help');
      deepStrictEqual(help, 'First help');
    });
  });

  describe('processExecution', () => {
    it('should update session state', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: 'Test output',
        stderr: 'Test error',
        passed: false,
        exitCode: 0,
      };

      engine.processExecution('some code', result);

      const state = session.getState();
      deepStrictEqual(state.attempts, 1);
      deepStrictEqual(state.codeHistory.length, 1);
      deepStrictEqual(state.codeHistory[0], 'some code');
      deepStrictEqual(state.lastOutput, 'Test output');
      deepStrictEqual(state.lastError, 'Test error');
      deepStrictEqual(state.passed, false);
    });

    it('should mark session as passed when tests pass', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: 'Success',
        stderr: '',
        passed: true,
        exitCode: 0,
      };

      engine.processExecution('code', result);
      deepStrictEqual(session.getState().passed, true);
    });

    it('should increment attempts on each execution', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: 'output',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      // First execution
      engine.processExecution('code1', result);
      deepStrictEqual(session.getState().attempts, 1);

      // Second execution
      engine.processExecution('code2', result);
      deepStrictEqual(session.getState().attempts, 2);

      // Third execution
      engine.processExecution('code3', result);
      deepStrictEqual(session.getState().attempts, 3);
    });

    it('should accumulate code history on each execution', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: 'output',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      // Execute multiple times
      engine.processExecution('const x = 1;', result);
      engine.processExecution('const y = 2;', result);
      engine.processExecution('const z = 3;', result);

      const state = session.getState();
      deepStrictEqual(state.codeHistory.length, 3);
      deepStrictEqual(state.codeHistory[0], 'const x = 1;');
      deepStrictEqual(state.codeHistory[1], 'const y = 2;');
      deepStrictEqual(state.codeHistory[2], 'const z = 3;');
    });

    it('should return null when no on_run steps exist', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: Intro
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: '',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      const feedback = engine.processExecution('code', result);
      deepStrictEqual(feedback, null);
    });

    it('should return feedback when trigger matches', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_run
    content: "Keep trying!"
    trigger: "passed === false"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: '',
        stderr: '',
        passed: false,
        exitCode: 1,
      };

      const feedback = engine.processExecution('code', result);
      deepStrictEqual(feedback, 'Keep trying!');
    });

    it('should match based on execution context', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_run
    content: "TypeError detected!"
    trigger: "stderr.includes('TypeError')"
  - type: on_run
    content: "Multiple attempts!"
    trigger: "attempts > 2"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      // Simulate previous attempts (processExecution will add the third)
      session.recordAttempt('code1');
      session.recordAttempt('code2');

      const result: ExecutionResult = {
        stdout: '',
        stderr: 'TypeError: undefined',
        passed: false,
        exitCode: 1,
      };

      // This will be the third attempt (attempts will be 3 after this call)
      // TypeError trigger should match first (before multiple attempts trigger)
      const feedback = engine.processExecution('code3', result);
      deepStrictEqual(feedback, 'TypeError detected!');
    });

    it('should return null when no triggers match', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: on_run
    content: "Feedback"
    trigger: "attempts > 10"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const result: ExecutionResult = {
        stdout: '',
        stderr: '',
        passed: false,
        exitCode: 0,
      };

      const feedback = engine.processExecution('code', result);
      deepStrictEqual(feedback, null);
    });
  });

  describe('variable substitution', () => {
    it('should substitute all supported variables', async () => {
      const scriptYaml = `
id: test-problem
title: Binary Search
difficulty: medium
tags: []
language: typescript
steps:
  - type: intro
    content: "Problem: {{title}}, Difficulty: {{difficulty}}, Attempts: {{attempts}}"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      session.recordAttempt('attempt1');
      session.recordAttempt('attempt2');

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, 'Problem: Binary Search, Difficulty: medium, Attempts: 2');
    });

    it('should handle multiple occurrences of same variable', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
language: typescript
steps:
  - type: intro
    content: "{{title}} is great! I love {{title}}!"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, 'Test is great! I love Test!');
    });
  });
});
