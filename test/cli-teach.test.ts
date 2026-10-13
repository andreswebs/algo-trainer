/**
 * Tests for teach command
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractTeachOptions, teachCommand } from '../src/cli/commands/teach.ts';
import { ExitCode } from '../src/cli/exit-codes.ts';
import type { Args } from '../src/cli/types.ts';
import { initializeConfig } from '../src/config/manager.ts';

describe('extractTeachOptions', () => {
  it('should extract generate subcommand with slug', () => {
    const args: Args = { _: ['teach', 'generate', 'two-sum'] };
    const options = extractTeachOptions(args);
    deepStrictEqual(options.subcommand, 'generate');
    deepStrictEqual(options.problemSlug, 'two-sum');
  });

  it('should extract validate subcommand with path', () => {
    const args: Args = { _: ['teach', 'validate', './trainer.yaml'] };
    const options = extractTeachOptions(args);
    deepStrictEqual(options.subcommand, 'validate');
    deepStrictEqual(options.path, './trainer.yaml');
  });

  it('should extract info subcommand', () => {
    const args: Args = { _: ['teach', 'info'] };
    const options = extractTeachOptions(args);
    deepStrictEqual(options.subcommand, 'info');
  });

  it('should extract output option', () => {
    const args: Args = { _: ['teach', 'generate', 'two-sum'], output: './custom.yaml' };
    const options = extractTeachOptions(args);
    deepStrictEqual(options.output, './custom.yaml');
  });
});

describe('teachCommand', () => {
  const tempDir = '/tmp/teach-command-test';

  beforeEach(async () => {
    // Ensure config is loaded before each test
    await initializeConfig();
    // Create temp directory
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  it('should show help with --help flag', async () => {
    const args: Args = { _: ['teach'], help: true };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should show help with -h flag', async () => {
    const args: Args = { _: ['teach'], h: true };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should return error when no subcommand provided', async () => {
    const args: Args = { _: ['teach'] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should return error for unknown subcommand', async () => {
    const args: Args = { _: ['teach', 'unknown'] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should handle info subcommand', async () => {
    const args: Args = { _: ['teach', 'info'] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should return error for generate without slug', async () => {
    const args: Args = { _: ['teach', 'generate'] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
  });

  it('should return error for validate without path', async () => {
    const args: Args = { _: ['teach', 'validate'] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.USAGE_ERROR);
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
    await writeFile(scriptPath, validScript);

    const args: Args = { _: ['teach', 'validate', scriptPath] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, true);
    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
  });

  it('should accept a script with retired steps and warn about them', async () => {
    const scriptPath = join(tempDir, 'retired-trainer.yaml');
    await writeFile(
      scriptPath,
      'id: two-sum\ntitle: Two Sum\ndifficulty: easy\ntags: [array]\nlanguage: typescript\nsteps:\n  - type: intro\n    content: Welcome\n  - type: hint\n    trigger: attempts > 1\n    content: Old hint\n',
    );
    const output: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]): void => {
      output.push(args.map(String).join(' '));
    };

    let result: Awaited<ReturnType<typeof teachCommand>>;
    try {
      result = await teachCommand({ _: ['teach', 'validate', scriptPath] });
    } finally {
      console.error = originalError;
    }

    deepStrictEqual(result.exitCode, ExitCode.SUCCESS);
    ok(
      output.join('\n').includes("steps[1]: 'hint' steps are no longer supported and are ignored"),
      output.join('\n'),
    );
    const validLine = output.find((line) => line.includes('Teaching script is valid'));
    deepStrictEqual(validLine?.match(/✅/g)?.length, 1, String(validLine));
  });

  it('should reject an invalid teaching script', async () => {
    // Create an invalid teaching script (missing required fields)
    const scriptPath = join(tempDir, 'invalid-trainer.yaml');
    const invalidScript = `
id: "two-sum"
# Missing title, difficulty, and other required fields
steps: []
`;
    await writeFile(scriptPath, invalidScript);

    const args: Args = { _: ['teach', 'validate', scriptPath] };
    const result = await teachCommand(args);
    deepStrictEqual(result.success, false);
    deepStrictEqual(result.exitCode, ExitCode.GENERAL_ERROR);
  });
});
