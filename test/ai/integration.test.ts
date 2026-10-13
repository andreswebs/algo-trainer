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
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeConfig } from '../../src/config/manager.ts';
import { getConfigPaths } from '../../src/config/paths.ts';
import { TeachingEngine, validateTeachingScript } from '../../src/core/ai/mod.ts';
import { findTeachingScript, loadAndValidateScript } from '../../src/core/ai/parser.ts';

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
steps:
  - type: intro
    content: "This problem requires dynamic programming."
  - type: pre_prompt
    content: "Think about overlapping subproblems and memoization."
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      // Simulate challenge command flow
      const engine = new TeachingEngine('challenge-test');
      const loaded = await engine.loadScript(problemDir);

      deepStrictEqual(loaded, true, 'Challenge should load teaching script');

      // Challenge command would display intro
      const intro = engine.getIntroduction();
      ok(intro != null, 'Challenge should show introduction');

      // Challenge command would display pre-prompt
      const prePrompt = engine.getPrePrompt();
      ok(prePrompt != null, 'Challenge should show pre-prompt guidance');
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
steps:
  - type: intro
    content: "Test intro"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const engine = new TeachingEngine('config-test');
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
        deepStrictEqual(
          validateTeachingScript(Bun.YAML.parse(await readFile(scriptPath, 'utf8'))).warnings,
          [],
          `Built-in script ${slug} should use only current step types`,
        );
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
        'id: two-sum\ntitle: Two Sum (Custom)\ndifficulty: easy\ntags: [array]\nsteps:\n  - type: intro\n    content: Custom intro\n',
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
      const engine = new TeachingEngine(nonExistentSlug);

      // Try to load from a directory without a script
      const emptyDir = join(problemsDir, 'empty-problem');
      await mkdir(emptyDir, { recursive: true });

      const loaded = await engine.loadScript(emptyDir);
      deepStrictEqual(loaded, false, 'Should return false for missing script');

      // All methods should return null when no script is loaded
      deepStrictEqual(engine.getIntroduction(), null);
      deepStrictEqual(engine.getPrePrompt(), null);
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
steps:
  - type: intro
    content: "Welcome to this custom problem!"
`;

      await writeFile(join(problemDir, 'trainer.yaml'), trainerYaml);

      const engine = new TeachingEngine('custom-problem');

      // Load directly from problem directory
      const loaded = await engine.loadScript(problemDir);
      deepStrictEqual(loaded, true, 'Should load script from problem directory');

      const intro = engine.getIntroduction();
      ok(intro != null, 'Should have loaded intro');
      ok(intro.includes('custom problem'));
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid teaching scripts gracefully', async () => {
      const problemDir = join(problemsDir, 'invalid-script');
      await mkdir(problemDir, { recursive: true });

      // Invalid YAML (missing required fields)
      const invalidYaml = `
id: "invalid-script"
# missing title, difficulty, steps
`;

      await writeFile(join(problemDir, 'trainer.yaml'), invalidYaml);

      const engine = new TeachingEngine('invalid-script');

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

      const engine = new TeachingEngine('malformed-yaml');

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
