/**
 * Tests for exit codes module
 *
 * @module tests/exit-codes
 */

import { assertEquals } from '@std/assert';
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

Deno.test('ExitCode - should have all required exit codes', () => {
  assertEquals(ExitCode.SUCCESS, 0);
  assertEquals(ExitCode.GENERAL_ERROR, 1);
  assertEquals(ExitCode.USAGE_ERROR, 2);
  assertEquals(ExitCode.CONFIG_ERROR, 3);
  assertEquals(ExitCode.WORKSPACE_ERROR, 4);
  assertEquals(ExitCode.PROBLEM_ERROR, 5);
  assertEquals(ExitCode.NETWORK_ERROR, 6);
  assertEquals(ExitCode.PERMISSION_ERROR, 7);
});

Deno.test('getExitCodeDescription - should return correct descriptions', () => {
  assertEquals(
    getExitCodeDescription(ExitCode.SUCCESS),
    'Command completed successfully',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.GENERAL_ERROR),
    'General or unexpected error occurred',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.USAGE_ERROR),
    'Invalid arguments or incorrect command usage',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.CONFIG_ERROR),
    'Configuration file issues or invalid settings',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.WORKSPACE_ERROR),
    'Workspace not initialized or invalid structure',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.PROBLEM_ERROR),
    'Problem not found or invalid identifier',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.NETWORK_ERROR),
    'Network connectivity issues or API errors',
  );
  assertEquals(
    getExitCodeDescription(ExitCode.PERMISSION_ERROR),
    'File permission errors or access denied',
  );
});

Deno.test('getExitCodeForError - should map ConfigError to CONFIG_ERROR', () => {
  const error = new ConfigError('Configuration file not found');
  assertEquals(getExitCodeForError(error), ExitCode.CONFIG_ERROR);
});

Deno.test('getExitCodeForError - should map WorkspaceError to WORKSPACE_ERROR', () => {
  const error = new WorkspaceError('Workspace not initialized');
  assertEquals(getExitCodeForError(error), ExitCode.WORKSPACE_ERROR);
});

Deno.test('getExitCodeForError - should map ProblemError to PROBLEM_ERROR', () => {
  const error = new ProblemError('Problem not found');
  assertEquals(getExitCodeForError(error), ExitCode.PROBLEM_ERROR);
});

Deno.test('getExitCodeForError - should map NetworkError to NETWORK_ERROR', () => {
  const error = new NetworkError('Connection failed');
  assertEquals(getExitCodeForError(error), ExitCode.NETWORK_ERROR);
});

Deno.test('getExitCodeForError - should map ValidationError to USAGE_ERROR', () => {
  const error = new ValidationError('Invalid input');
  assertEquals(getExitCodeForError(error), ExitCode.USAGE_ERROR);
});

Deno.test('getExitCodeForError - should map CommandError to USAGE_ERROR', () => {
  const error = new CommandError('Invalid command');
  assertEquals(getExitCodeForError(error), ExitCode.USAGE_ERROR);
});

Deno.test('getExitCodeForError - should map FileSystemError to GENERAL_ERROR by default', () => {
  const error = new FileSystemError('File not found');
  assertEquals(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

Deno.test('getExitCodeForError - should map FileSystemError with permission to PERMISSION_ERROR', () => {
  const error = new FileSystemError('Permission denied: /root/file.txt');
  assertEquals(getExitCodeForError(error), ExitCode.PERMISSION_ERROR);
});

Deno.test('getExitCodeForError - should map unknown errors to GENERAL_ERROR', () => {
  const error = new Error('Unknown error');
  assertEquals(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

Deno.test('getExitCodeForError - should map string errors to GENERAL_ERROR', () => {
  const error = 'Some error string';
  assertEquals(getExitCodeForError(error), ExitCode.GENERAL_ERROR);
});

Deno.test('getExitCodeForError - should map null/undefined to GENERAL_ERROR', () => {
  assertEquals(getExitCodeForError(null), ExitCode.GENERAL_ERROR);
  assertEquals(getExitCodeForError(undefined), ExitCode.GENERAL_ERROR);
});
