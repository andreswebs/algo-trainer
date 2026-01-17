/**
 * Tests for teach command
 */

import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { extractTeachOptions, teachCommand } from '../src/cli/commands/teach.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import { initializeConfig } from '../src/config/manager.ts';
import type { Args } from '@std/cli/parse-args';
import { ensureDir } from '@std/fs';
import { join } from '@std/path';

describe('extractTeachOptions', () => {
  it('should extract generate subcommand with slug', () => {
    const args: Args = { _: ['teach', 'generate', 'two-sum'] };
    const options = extractTeachOptions(args);
    assertEquals(options.subcommand, 'generate');
    assertEquals(options.problemSlug, 'two-sum');
  });

  it('should extract validate subcommand with path', () => {
    const args: Args = { _: ['teach', 'validate', './trainer.yaml'] };
    const options = extractTeachOptions(args);
    assertEquals(options.subcommand, 'validate');
    assertEquals(options.path, './trainer.yaml');
  });

  it('should extract info subcommand', () => {
    const args: Args = { _: ['teach', 'info'] };
    const options = extractTeachOptions(args);
    assertEquals(options.subcommand, 'info');
  });

  it('should extract output option', () => {
    const args: Args = { _: ['teach', 'generate', 'two-sum'], output: './custom.yaml' };
    const options = extractTeachOptions(args);
    assertEquals(options.output, './custom.yaml');
  });
});

describe('teachCommand', () => {
  const tempDir = '/tmp/teach-command-test';

  beforeEach(async () => {
    // Ensure config is loaded before each test
    await initializeConfig();
    // Create temp directory
    await ensureDir(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  it('should show help with --help flag', async () => {
    const args: Args = { _: ['teach'], help: true };
    const result = await teachCommand(args);
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should show help with -h flag', async () => {
    const args: Args = { _: ['teach'], h: true };
    const result = await teachCommand(args);
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should return error when no subcommand provided', async () => {
    const args: Args = { _: ['teach'] };
    const result = await teachCommand(args);
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should return error for unknown subcommand', async () => {
    const args: Args = { _: ['teach', 'unknown'] };
    const result = await teachCommand(args);
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should handle info subcommand', async () => {
    const args: Args = { _: ['teach', 'info'] };
    const result = await teachCommand(args);
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should return error for generate without slug', async () => {
    const args: Args = { _: ['teach', 'generate'] };
    const result = await teachCommand(args);
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should return error for validate without path', async () => {
    const args: Args = { _: ['teach', 'validate'] };
    const result = await teachCommand(args);
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should validate a valid teaching script', async () => {
    // Create a valid teaching script
    const scriptPath = join(tempDir, 'valid-trainer.yaml');
    const validScript = `
id: "two-sum"
title: "Two Sum"
difficulty: "easy"
tags: ["array", "hash-table"]
language: "typescript"
steps:
  - type: intro
    content: "Welcome to Two Sum!"
  - type: pre_prompt
    content: "Think about hash tables."
`;
    await Deno.writeTextFile(scriptPath, validScript);

    const args: Args = { _: ['teach', 'validate', scriptPath] };
    const result = await teachCommand(args);
    assertEquals(result.success, true);
    assertEquals(result.exitCode, ExitCode.SUCCESS);
  });

  it('should reject an invalid teaching script', async () => {
    // Create an invalid teaching script (missing required fields)
    const scriptPath = join(tempDir, 'invalid-trainer.yaml');
    const invalidScript = `
id: "two-sum"
# Missing title, difficulty, and other required fields
steps: []
`;
    await Deno.writeTextFile(scriptPath, invalidScript);

    const args: Args = { _: ['teach', 'validate', scriptPath] };
    const result = await teachCommand(args);
    assertEquals(result.success, false);
    assertEquals(result.exitCode, ExitCode.GENERAL_ERROR);
  });
});
