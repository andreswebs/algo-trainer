/**
 * Tests for hint command
 *
 * @module test/cli-commands-hint
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import type { Args } from '@std/cli/parse-args';
import { extractHintOptions, hintCommand } from '../src/cli/commands/hint.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { configManager } from '../src/config/manager.ts';
import { ensureDir } from '@std/fs';
import { join } from '@std/path';

describe('extractHintOptions', () => {
  it('should extract problem slug from positional arguments', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const options = extractHintOptions(args);

    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.level, undefined);
    assertEquals(options.all, false);
  });

  it('should extract level from flags', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      level: 2,
    };

    const options = extractHintOptions(args);

    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.level, 2);
    assertEquals(options.all, false);
  });

  it('should extract all flag', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      all: true,
    };

    const options = extractHintOptions(args);

    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.level, undefined);
    assertEquals(options.all, true);
  });

  it('should extract all flag using short form', () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      a: true,
    };

    const options = extractHintOptions(args);

    assertEquals(options.problemSlug, 'two-sum');
    assertEquals(options.all, true);
  });

  it('should handle missing problem slug', () => {
    const args: Args = {
      _: ['hint'],
    };

    const options = extractHintOptions(args);

    assertEquals(options.problemSlug, undefined);
    assertEquals(options.level, undefined);
    assertEquals(options.all, false);
  });
});

describe('hintCommand', () => {
  let tempDir: string;
  let originalWorkspace: string;

  beforeEach(async () => {
    // Load config first
    await configManager.load();
    
    // Create a temporary workspace
    tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-hint-test-' });
    
    // Save original config
    const config = configManager.getConfig();
    originalWorkspace = config.workspace;

    // Update config to use temp workspace
    await configManager.updateConfig({
      workspace: tempDir,
    });

    // Create workspace structure
    await ensureDir(join(tempDir, 'problems'));
    await ensureDir(join(tempDir, 'completed'));
    await ensureDir(join(tempDir, 'templates'));
    await ensureDir(join(tempDir, 'config'));
  });

  afterEach(async () => {
    // Restore original config
    await configManager.updateConfig({
      workspace: originalWorkspace,
    });

    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return error when no problem slug provided', async () => {
    const args: Args = {
      _: ['hint'],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
    assertEquals(typeof result.error, 'string');
  });

  it('should return error for non-existent problem', async () => {
    const args: Args = {
      _: ['hint', 'non-existent-problem'],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.PROBLEM_ERROR);
  });

  it('should display hints for valid problem', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle specific hint level', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      level: 1,
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle all hints flag', async () => {
    const args: Args = {
      _: ['hint', 'two-sum'],
      all: true,
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle problem by ID', async () => {
    const args: Args = {
      _: ['hint', '1'],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });
});

describe('hintCommand with workspace tracking', () => {
  let tempDir: string;
  let originalWorkspace: string;

  beforeEach(async () => {
    // Load config first
    await configManager.load();
    
    // Create a temporary workspace
    tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-hint-workspace-test-' });
    
    // Save original config
    const config = configManager.getConfig();
    originalWorkspace = config.workspace;

    // Update config to use temp workspace
    await configManager.updateConfig({
      workspace: tempDir,
    });

    // Create workspace structure
    await ensureDir(join(tempDir, 'problems'));
    await ensureDir(join(tempDir, 'completed'));
    await ensureDir(join(tempDir, 'templates'));
    await ensureDir(join(tempDir, 'config'));
  });

  afterEach(async () => {
    // Restore original config
    await configManager.updateConfig({
      workspace: originalWorkspace,
    });

    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should track hint usage in metadata when problem exists', async () => {
    const config = configManager.getConfig();
    const problemSlug = 'two-sum';
    
    // Create problem directory and metadata file
    const problemDir = join(tempDir, 'problems', problemSlug);
    await ensureDir(problemDir);
    
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
    await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create a minimal solution file so problemExists returns true
    const solutionPath = join(problemDir, 'solution.ts');
    await Deno.writeTextFile(solutionPath, '// Solution placeholder');

    // Run hint command
    const args: Args = {
      _: ['hint', problemSlug],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Check that metadata was updated
    const updatedMetadata = JSON.parse(await Deno.readTextFile(metadataPath));
    assertEquals(Array.isArray(updatedMetadata.hintsUsed), true);
    assertEquals(updatedMetadata.hintsUsed.length > 0, true);
  });

  it('should work when problem not in workspace', async () => {
    // Problem exists in database but not in workspace
    const args: Args = {
      _: ['hint', 'two-sum'],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should handle progressive hint display', async () => {
    const config = configManager.getConfig();
    const problemSlug = 'two-sum';
    
    // Create problem directory and metadata file with some hints already used
    const problemDir = join(tempDir, 'problems', problemSlug);
    await ensureDir(problemDir);
    
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
    await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create a minimal solution file
    const solutionPath = join(problemDir, 'solution.ts');
    await Deno.writeTextFile(solutionPath, '// Solution placeholder');

    // Run hint command - should show second hint
    const args: Args = {
      _: ['hint', problemSlug],
    };

    const result = await hintCommand(args);

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    // Check that metadata was updated with second hint
    const updatedMetadata = JSON.parse(await Deno.readTextFile(metadataPath));
    assertEquals(updatedMetadata.hintsUsed.includes(0), true);
    assertEquals(updatedMetadata.hintsUsed.includes(1), true);
  });
});
