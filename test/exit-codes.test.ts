/**
 * Tests for exit codes module
 *
 * @module tests/exit-codes
 */

import { test } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { ExitCode, getExitCodeDescription, getExitCodeForError } from '../src/cli/exit-codes.ts';
import {
  CommandError,
  ConfigError,
  FileSystemError,
  NetworkError,
  ProblemError,
  ValidationError,
  WorkspaceError,
} from '../src/utils/errors.ts';

test('ExitCode - should have all required exit codes', () => {
  deepStrictEqual(ExitCode.SUCCESS, 0);
  deepStrictEqual(ExitCode.GENERAL_ERROR, 1);
  deepStrictEqual(ExitCode.USAGE_ERROR, 2);
  deepStrictEqual(ExitCode.CONFIG_ERROR, 3);
  deepStrictEqual(ExitCode.WORKSPACE_ERROR, 4);
  deepStrictEqual(ExitCode.PROBLEM_ERROR, 5);
  deepStrictEqual(ExitCode.NETWORK_ERROR, 6);
  deepStrictEqual(ExitCode.PERMISSION_ERROR, 7);
});

test('getExitCodeDescription - should return correct descriptions', () => {
  deepStrictEqual(getExitCodeDescription(ExitCode.SUCCESS), 'Command completed successfully');
  deepStrictEqual(
    getExitCodeDescription(ExitCode.GENERAL_ERROR),
    'General or unexpected error occurred',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.USAGE_ERROR),
    'Invalid arguments or incorrect command usage',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.CONFIG_ERROR),
    'Configuration file issues or invalid settings',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.WORKSPACE_ERROR),
    'Workspace not initialized or invalid structure',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.PROBLEM_ERROR),
    'Problem not found or invalid identifier',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.NETWORK_ERROR),
    'Network connectivity issues or API errors',
  );
  deepStrictEqual(
    getExitCodeDescription(ExitCode.PERMISSION_ERROR),
    'File permission errors or access denied',
  );
});

test('getExitCodeForError - should map ConfigError to CONFIG_ERROR', () => {
  const error = new ConfigError('Configuration file not found');
  deepStrictEqual(getExitCodeForError(error), ExitCode.CONFIG_ERROR);
});

test('getExitCodeForError - should map WorkspaceError to WORKSPACE_ERROR', () => {
  const error = new WorkspaceError('Workspace not initialized');
  deepStrictEqual(getExitCodeForError(error), ExitCode.WORKSPACE_ERROR);
});

test('getExitCodeForError - should map ProblemError to PROBLEM_ERROR', () => {
  const error = new ProblemError('Problem not found');
  deepStrictEqual(getExitCodeForError(error), ExitCode.PROBLEM_ERROR);
});

test('getExitCodeForError - should map NetworkError to NETWORK_ERROR', () => {
  const error = new NetworkError('Connection failed');
  deepStrictEqual(getExitCodeForError(error), ExitCode.NETWORK_ERROR);
});

test('getExitCodeForError - should map ValidationError to USAGE_ERROR', () => {
  const error = new ValidationError('Invalid input');
  deepStrictEqual(getExitCodeForError(error), ExitCode.USAGE_ERROR);
});

test('getExitCodeForError - should map CommandError to USAGE_ERROR', () => {
  const error = new CommandError('Invalid command');
  deepStrictEqual(getExitCodeForError(error), ExitCode.USAGE_ERROR);
});

test('getExitCodeForError - should map FileSystemError to GENERAL_ERROR by default', () => {
  const error = new FileSystemError('File not found');
  deepStrictEqual(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

test('getExitCodeForError - should map FileSystemError with permission to PERMISSION_ERROR', () => {
  const error = new FileSystemError('Permission denied: /root/file.txt');
  deepStrictEqual(getExitCodeForError(error), ExitCode.PERMISSION_ERROR);
});

test('getExitCodeForError - should map unknown errors to GENERAL_ERROR', () => {
  const error = new Error('Unknown error');
  deepStrictEqual(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

test('getExitCodeForError - should map string errors to GENERAL_ERROR', () => {
  const error = 'Some error string';
  deepStrictEqual(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

test('getExitCodeForError - should map null/undefined to GENERAL_ERROR', () => {
  deepStrictEqual(getExitCodeForError(null), ExitCode.GENERAL_ERROR);
  deepStrictEqual(getExitCodeForError(undefined), ExitCode.GENERAL_ERROR);
});
