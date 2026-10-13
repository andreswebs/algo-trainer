/**
 * Tests for hint command
 *
 * @module test/cli-commands-hint
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  extractHintOptions,
  hintCommand,
  loadProblemState,
  updateHintTracking,
  validateHintLevel,
} from '../src/cli/commands/hint.ts';
import { ENV_VARS } from '../src/cli/env.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import type { Args } from '../src/cli/types.ts';
import { configManager } from '../src/config/manager.ts';
import { getSolutionFileName } from '../src/core/workspace/files.ts';

describe('extractHintOptions', () => {
  it('should extract problem slug from positional arguments', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const options = extractHintOptions(args);

    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.level, undefined);
    deepStrictEqual(options.all, false);
  });

  it('should extract level from flags', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      level: 2,
    };

    const options = extractHintOptions(args);

    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.level, 2);
    deepStrictEqual(options.all, false);
  });

  it('should extract all flag', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      all: true,
    };

    const options = extractHintOptions(args);

    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.level, undefined);
    deepStrictEqual(options.all, true);
  });

  it('should extract all flag using short form', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      a: true,
    };

    const options = extractHintOptions(args);

    deepStrictEqual(options.problemSlug, 'two-sum');
    deepStrictEqual(options.all, true);
  });

  it('should handle missing problem slug', () => {
    const args: Args = {
      _: ['hint'],
    };

    const options = extractHintOptions(args);

    deepStrictEqual(options.problemSlug, undefined);
    deepStrictEqual(options.level, undefined);
    deepStrictEqual(options.all, false);
  });
});

describe('hintCommand', () => {
  let tempDir: string;
  let originalWorkspace: string;
  let originalAtEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    // Clear AT_* env vars so the user's shell doesn't override the test workspace.
    originalAtEnv = {};
    for (const key of Object.values(ENV_VARS)) {
      originalAtEnv[key] = process.env[key];
      delete process.env[key];
    }

    // Load config first
    await configManager.load();

    // Create a temporary workspace
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-hint-test-'));

    // Save original config
    const config = configManager.getConfig();
    originalWorkspace = config.workspace;

    // Update config to use temp workspace
    await configManager.updateConfig({
      workspace: tempDir,
    });

    // Create workspace structure
    await mkdir(join(tempDir, 'problems'), { recursive: true });
    await mkdir(join(tempDir, 'completed'), { recursive: true });
    await mkdir(join(tempDir, 'templates'), { recursive: true });
    await mkdir(join(tempDir, 'config'), { recursive: true });
  });

  afterEach(async () => {
    // Restore original config
    await configManager.updateConfig({
      workspace: originalWorkspace,
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

  it('should return error when no problem slug provided', async () => {
    const args: Args = {
      _: ['hint'],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
    deepStrictEqual(typeof result.error, 'string');
  });

  it('should return error for non-existent problem', async () => {
    const args: Args = {
      _: ['hint', 'non-existent-problem'],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should display hints for valid problem', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle specific hint level', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      level: 1,
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle all hints flag', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      all: true,
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle problem by ID', async () => {
    const args: Args = {
      _: ['hint', '1'],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });
});

describe('hintCommand with workspace tracking', () => {
  let tempDir: string;
  let originalWorkspace: string;
  let originalAtEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    originalAtEnv = {};
    for (const key of Object.values(ENV_VARS)) {
      originalAtEnv[key] = process.env[key];
      delete process.env[key];
    }

    // Load config first
    await configManager.load();

    // Create a temporary workspace
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-hint-workspace-test-'));

    // Save original config
    const config = configManager.getConfig();
    originalWorkspace = config.workspace;

    // Update config to use temp workspace
    await configManager.updateConfig({
      workspace: tempDir,
    });

    // Create workspace structure
    await mkdir(join(tempDir, 'problems'), { recursive: true });
    await mkdir(join(tempDir, 'completed'), { recursive: true });
    await mkdir(join(tempDir, 'templates'), { recursive: true });
    await mkdir(join(tempDir, 'config'), { recursive: true });
  });

  afterEach(async () => {
    // Restore original config
    await configManager.updateConfig({
      workspace: originalWorkspace,
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

  it('should track hint usage in metadata when problem exists', async () => {
    const config = configManager.getConfig();
    const problemSlug = 'two-sum';

    // Create problem directory and metadata file
    const problemDir = join(tempDir, 'problems', problemSlug);
    await mkdir(problemDir, { recursive: true });

    const metadataPath = join(problemDir, '.problem.json');
    const metadata = {
      problemId: '1',
      slug: problemSlug,
      language: config.language,
      generatedAt: new Date().toISOString(),
      templateStyle: 'documented',
      lastModified: new Date().toISOString(),
      hintsUsed: [],
    };
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create solution file with the correct name for the configured language
    const solutionPath = join(problemDir, getSolutionFileName(config.language));
    await writeFile(solutionPath, '// Solution placeholder');

    // Run hint command
    const args: Args = {
      _: ['hint', problemSlug],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Check that metadata was updated
    const updatedMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    deepStrictEqual(Array.isArray(updatedMetadata.hintsUsed), true);
    deepStrictEqual(updatedMetadata.hintsUsed.length > 0, true);
  });

  it('should work when problem not in workspace', async () => {
    // Problem exists in database but not in workspace
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle progressive hint display', async () => {
    const config = configManager.getConfig();
    const problemSlug = 'two-sum';

    // Create problem directory and metadata file with some hints already used
    const problemDir = join(tempDir, 'problems', problemSlug);
    await mkdir(problemDir, { recursive: true });

    const metadataPath = join(problemDir, '.problem.json');
    const metadata = {
      problemId: '1',
      slug: problemSlug,
      language: config.language,
      generatedAt: new Date().toISOString(),
      templateStyle: 'documented',
      lastModified: new Date().toISOString(),
      hintsUsed: [0], // First hint already used
    };
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create solution file with the correct name for the configured language
    const solutionPath = join(problemDir, getSolutionFileName(config.language));
    await writeFile(solutionPath, '// Solution placeholder');

    // Run hint command - should show second hint
    const args: Args = {
      _: ['hint', problemSlug],
    };

    const result = await hintCommand(args);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);

    // Check that metadata was updated with second hint
    const updatedMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    deepStrictEqual(updatedMetadata.hintsUsed.includes(0), true);
    deepStrictEqual(updatedMetadata.hintsUsed.includes(1), true);
  });
});

describe('loadProblemState', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-hint-state-test-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('returns exists=false and empty hintsUsed when problem not in workspace', async () => {
    const state = await loadProblemState(tempDir, 'two-sum', 'typescript');
    deepStrictEqual(state.exists, false);
    deepStrictEqual(state.hintsUsed, []);
  });

  it('returns exists=true when solution file is present', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await mkdir(problemDir, { recursive: true });
    await writeFile(join(problemDir, 'solution.ts'), '// stub');

    const state = await loadProblemState(tempDir, 'two-sum', 'typescript');
    deepStrictEqual(state.exists, true);
  });

  it('returns hintsUsed from metadata when problem exists', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await mkdir(problemDir, { recursive: true });
    await writeFile(join(problemDir, 'solution.ts'), '// stub');
    await writeFile(
      join(problemDir, '.problem.json'),
      JSON.stringify({
        problemId: '1',
        slug: 'two-sum',
        language: 'typescript',
        generatedAt: new Date().toISOString(),
        templateStyle: 'documented',
        lastModified: new Date().toISOString(),
        hintsUsed: [0, 1],
      }),
    );

    const state = await loadProblemState(tempDir, 'two-sum', 'typescript');
    deepStrictEqual(state.exists, true);
    deepStrictEqual(state.hintsUsed, [0, 1]);
  });
});

describe('validateHintLevel', () => {
  const hints = ['hint1', 'hint2', 'hint3'];

  it('returns null for undefined level (no validation needed)', () => {
    deepStrictEqual(validateHintLevel(undefined, hints), null);
  });

  it('returns null for valid level within range', () => {
    deepStrictEqual(validateHintLevel(1, hints), null);
    deepStrictEqual(validateHintLevel(2, hints), null);
    deepStrictEqual(validateHintLevel(3, hints), null);
  });

  it('returns error message for level 0', () => {
    const result = validateHintLevel(0, hints);
    deepStrictEqual(typeof result, 'string');
  });

  it('returns error message for level exceeding hint count', () => {
    const result = validateHintLevel(4, hints);
    deepStrictEqual(typeof result, 'string');
  });

  it('returns error message for negative level', () => {
    const result = validateHintLevel(-1, hints);
    deepStrictEqual(typeof result, 'string');
  });
});

describe('updateHintTracking', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-hint-tracking-test-'));
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('does nothing when problem does not exist in workspace', async () => {
    // Should not throw even if problem doesn't exist
    await updateHintTracking(tempDir, 'two-sum', 'typescript', false, [0], []);
  });

  it('does nothing when no new hints were added', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await mkdir(problemDir, { recursive: true });
    const metadataPath = join(problemDir, '.problem.json');
    await writeFile(
      metadataPath,
      JSON.stringify({
        problemId: '1',
        slug: 'two-sum',
        language: 'typescript',
        generatedAt: new Date().toISOString(),
        templateStyle: 'documented',
        lastModified: new Date().toISOString(),
        hintsUsed: [0],
      }),
    );

    await updateHintTracking(tempDir, 'two-sum', 'typescript', true, [0], [0]);

    // Metadata should be unchanged (no new hints)
    const meta = JSON.parse(await readFile(metadataPath, 'utf8'));
    deepStrictEqual(meta.hintsUsed, [0]);
  });

  it('updates metadata when new hints were added', async () => {
    const problemDir = join(tempDir, 'problems', 'two-sum');
    await mkdir(problemDir, { recursive: true });
    const metadataPath = join(problemDir, '.problem.json');
    await writeFile(
      metadataPath,
      JSON.stringify({
        problemId: '1',
        slug: 'two-sum',
        language: 'typescript',
        generatedAt: new Date().toISOString(),
        templateStyle: 'documented',
        lastModified: new Date().toISOString(),
        hintsUsed: [],
      }),
    );

    await updateHintTracking(tempDir, 'two-sum', 'typescript', true, [0], []);

    const meta = JSON.parse(await readFile(metadataPath, 'utf8'));
    deepStrictEqual(meta.hintsUsed, [0]);
  });
});
