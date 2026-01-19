/**
 * Tests for the progress command
 *
 * Tests the progress command implementation including:
 * - Option extraction
 * - Statistics calculation
 * - Output formatting
 * - Error handling
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { join } from '@std/path';
import type { Args } from '@std/cli/parse-args';
import { extractProgressOptions, progressCommand } from '../src/cli/commands/progress.ts';
import { configManager } from '../src/config/manager.ts';
import { initWorkspace } from '../src/core/mod.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';

// Helper to capture console output
class ConsoleCapture {
  private originalLog = console.log;
  private originalError = console.error;
  private logOutput: string[] = [];
  private errorOutput: string[] = [];

  start() {
    this.logOutput = [];
    this.errorOutput = [];
    console.log = (...args: unknown[]) => {
      this.logOutput.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      this.errorOutput.push(args.map(String).join(' '));
    };
  }

  stop() {
    console.log = this.originalLog;
    console.error = this.originalError;
  }

  getLog(): string {
    return this.logOutput.join('\n');
  }

  getError(): string {
    return this.errorOutput.join('\n');
  }
}

describe('extractProgressOptions', () => {
  it('should extract default options', () => {
    const args: Args = { _: [] };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, false);
    assertEquals(options.byCategory, false);
    assertEquals(options.json, false);
  });

  it('should extract detailed flag', () => {
    const args: Args = { _: [], detailed: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
  });

  it('should extract detailed flag (short form)', () => {
    const args: Args = { _: [], d: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
  });

  it('should extract byCategory flag', () => {
    const args: Args = { _: [], category: true };
    const options = extractProgressOptions(args);
    assertEquals(options.byCategory, true);
  });

  it('should extract byCategory flag (short form)', () => {
    const args: Args = { _: [], c: true };
    const options = extractProgressOptions(args);
    assertEquals(options.byCategory, true);
  });

  it('should extract json flag', () => {
    const args: Args = { _: [], json: true };
    const options = extractProgressOptions(args);
    assertEquals(options.json, true);
  });

  it('should extract multiple flags', () => {
    const args: Args = { _: [], detailed: true, json: true };
    const options = extractProgressOptions(args);
    assertEquals(options.detailed, true);
    assertEquals(options.json, true);
  });
});

describe('progressCommand', () => {
  let tempDir: string;
  let capture: ConsoleCapture;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await Deno.makeTempDir({ prefix: 'progress_test_' });

    // Initialize console capture
    capture = new ConsoleCapture();

    // Load config first, then update workspace
    await configManager.load();
    await configManager.updateConfig({ workspace: tempDir });
  });

  afterEach(async () => {
    // Restore console
    capture.stop();

    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should fail when workspace is not initialized', async () => {
    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.WORKSPACE_ERROR);
    assertStringIncludes(capture.getError(), 'not initialized');
  });

  it('should show empty progress for initialized empty workspace', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);

    const output = capture.getError();
    assertStringIncludes(output, 'Progress Summary');
    assertStringIncludes(output, 'Problems Completed: 0');
    assertStringIncludes(output, 'Problems In Progress: 0');
  });

  it('should display by difficulty breakdown', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Difficulty');
    assertStringIncludes(output, 'easy');
    assertStringIncludes(output, 'medium');
    assertStringIncludes(output, 'hard');
  });

  it('should show categories with --category flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], category: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Category');
  });

  it('should show detailed view with --detailed flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], detailed: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'By Category');
    assertStringIncludes(output, 'By Difficulty');
  });

  it('should output JSON with --json flag', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [], json: true });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getLog();
    // Should be valid JSON
    const parsed = JSON.parse(output);
    assertEquals(typeof parsed.totalProblems, 'number');
    assertEquals(typeof parsed.currentProblems, 'number');
    assertEquals(typeof parsed.completedProblems, 'number');
    assertEquals(Array.isArray(parsed.byDifficulty), true);
    assertEquals(Array.isArray(parsed.byCategory), true);
  });

  it('should count current problems when they exist', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create a fake problem in current directory
    const problemDir = join(tempDir, 'problems', 'test-problem');
    await Deno.mkdir(problemDir, { recursive: true });

    // Create .problem.json metadata
    const metadata = {
      id: 'test-1',
      slug: 'test-problem',
      difficulty: 'easy',
      tags: ['array', 'test'],
    };
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify(metadata, null, 2),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems In Progress: 1');
  });

  it('should count completed problems when they exist', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create a fake problem in completed directory
    const problemDir = join(tempDir, 'completed', 'test-problem');
    await Deno.mkdir(problemDir, { recursive: true });

    // Create .problem.json metadata
    const metadata = {
      id: 'test-1',
      slug: 'test-problem',
      difficulty: 'medium',
      tags: ['string', 'test'],
    };
    await Deno.writeTextFile(
      join(problemDir, '.problem.json'),
      JSON.stringify(metadata, null, 2),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems Completed: 1');
  });

  it('should count both current and completed problems', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Create current problem
    const currentDir = join(tempDir, 'problems', 'current-problem');
    await Deno.mkdir(currentDir, { recursive: true });
    await Deno.writeTextFile(
      join(currentDir, '.problem.json'),
      JSON.stringify(
        {
          id: 'test-1',
          slug: 'current-problem',
          difficulty: 'easy',
          tags: ['array'],
        },
        null,
        2,
      ),
    );

    // Create completed problem
    const completedDir = join(tempDir, 'completed', 'completed-problem');
    await Deno.mkdir(completedDir, { recursive: true });
    await Deno.writeTextFile(
      join(completedDir, '.problem.json'),
      JSON.stringify(
        {
          id: 'test-2',
          slug: 'completed-problem',
          difficulty: 'hard',
          tags: ['dynamic-programming'],
        },
        null,
        2,
      ),
    );

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Problems In Progress: 1');
    assertStringIncludes(output, 'Problems Completed: 1');
  });

  it('should calculate completion percentage correctly', async () => {
    // Initialize workspace
    await initWorkspace(tempDir);

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, true);

    const output = capture.getError();
    assertStringIncludes(output, 'Overall Completion:');
    assertStringIncludes(output, '%');
  });

  it('should handle errors gracefully', async () => {
    // Set invalid workspace path
    await configManager.updateConfig({ workspace: '/nonexistent/path' });

    capture.start();
    const result = await progressCommand({ _: [] });
    capture.stop();

    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.WORKSPACE_ERROR);
  });
});
