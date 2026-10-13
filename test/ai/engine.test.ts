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
import { TeachingError } from '../../src/utils/errors.ts';
import { assertRejectsWith } from '../helpers/assert.ts';

describe('TeachingEngine', () => {
  let engine: TeachingEngine;
  let testDir: string;
  let testProblemDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'algo-trainer-engine-'));
    engine = new TeachingEngine('test-problem');
    testProblemDir = join(testDir, 'test-problem');
    await mkdir(testProblemDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create an engine for a problem', () => {
      const newEngine = new TeachingEngine('another-problem');
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
steps:
  - type: intro
    content: Welcome!
  - type: pre_prompt
    content: Plan 1
  - type: pre_prompt
    content: Plan 2
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const info = engine.getScriptInfo();
      ok(info != null);
      deepStrictEqual(info.id, 'test-problem');
      deepStrictEqual(info.title, 'Test Problem');
      deepStrictEqual(info.difficulty, 'medium');
      deepStrictEqual(info.tags, ['array', 'hash-table']);
      deepStrictEqual(info.stepCount, 3);
    });

    it('should return a copy of tags array', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: [array]
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
steps:
  - type: pre_prompt
    content: Just a plan
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

  describe('variable substitution', () => {
    it('should substitute all supported variables', async () => {
      const scriptYaml = `
id: test-problem
title: Binary Search
difficulty: medium
tags: []
steps:
  - type: intro
    content: "Problem: {{title}}, Difficulty: {{difficulty}}"
`;
      await writeFile(join(testProblemDir, 'trainer.yaml'), scriptYaml);
      await engine.loadScript(testProblemDir);

      const intro = engine.getIntroduction();
      deepStrictEqual(intro, 'Problem: Binary Search, Difficulty: medium');
    });

    it('should handle multiple occurrences of same variable', async () => {
      const scriptYaml = `
id: test-problem
title: Test
difficulty: easy
tags: []
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
