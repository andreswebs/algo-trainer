/**
 * Tests for workspace path resolution utilities
 *
 * @module tests/workspace
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { join, resolve } from 'node:path';
import {
  clearWorkspacePathCache,
  getArchivedProblemPaths,
  getFileExtension,
  getProblemPaths,
  getSolutionFileName,
  getTestFileName,
  getWorkspacePaths,
  isPathInWorkspace,
  WORKSPACE_RULES,
  type WorkspacePathConfig,
} from '../src/core/workspace/mod.ts';
import type { SupportedLanguage } from '../src/types/global.ts';
import { ValidationError } from '../src/utils/errors.ts';
import { assertThrowsWith } from './helpers/assert.ts';

// =============================================================================
// Test Setup and Cleanup
// =============================================================================

// Clear cache before each test to ensure isolation
function setupTest(): void {
  clearWorkspacePathCache();
}

// =============================================================================
// getWorkspacePaths tests
// =============================================================================

test('getWorkspacePaths - returns correct structure for absolute path', () => {
  setupTest();
  const rootDir = '/home/user/workspace';
  const paths = getWorkspacePaths(rootDir);

  ok(paths != null);
  deepStrictEqual(paths.root, rootDir);
  deepStrictEqual(paths.problems, join(rootDir, 'problems'));
  deepStrictEqual(paths.completed, join(rootDir, 'completed'));
  deepStrictEqual(paths.templates, join(rootDir, 'templates'));
  deepStrictEqual(paths.config, join(rootDir, 'config'));
});

test('getWorkspacePaths - converts relative to absolute path', () => {
  setupTest();
  const relativePath = './test-workspace';
  const paths = getWorkspacePaths(relativePath);

  ok(paths != null);
  deepStrictEqual(paths.root, resolve(relativePath));
  deepStrictEqual(paths.problems.startsWith(paths.root), true);
});

test('getWorkspacePaths - caches results for same root', () => {
  setupTest();
  const rootDir = '/home/user/workspace';
  const paths1 = getWorkspacePaths(rootDir);
  const paths2 = getWorkspacePaths(rootDir);

  // Should return same object reference from cache
  deepStrictEqual(paths1, paths2);
});

test('getWorkspacePaths - throws ValidationError for empty string', () => {
  setupTest();
  assertThrowsWith(() => getWorkspacePaths(''), ValidationError, 'Root directory cannot be empty');
});

test('getWorkspacePaths - throws ValidationError for whitespace-only string', () => {
  setupTest();
  assertThrowsWith(
    () => getWorkspacePaths('   '),
    ValidationError,
    'Root directory cannot be empty',
  );
});

test('getWorkspacePaths - throws ValidationError for non-string input', () => {
  setupTest();
  assertThrowsWith(
    () => getWorkspacePaths(123 as unknown as string),
    ValidationError,
    'Root directory must be a string',
  );
});

test('getWorkspacePaths - throws ValidationError for null bytes', () => {
  setupTest();
  assertThrowsWith(
    () => getWorkspacePaths('/home/user\0/workspace'),
    ValidationError,
    'null bytes',
  );
});

test('getWorkspacePaths - throws ValidationError for path traversal', () => {
  setupTest();
  assertThrowsWith(
    () => getWorkspacePaths('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// getFileExtension tests
// =============================================================================

test('getFileExtension - returns correct extensions', () => {
  const testCases: Array<[string, string]> = [
    ['typescript', '.ts'],
    ['javascript', '.js'],
    ['python', '.py'],
    ['java', '.java'],
    ['cpp', '.cpp'],
    ['rust', '.rs'],
    ['go', '.go'],
  ];

  for (const [language, expectedExt] of testCases) {
    // Type assertion is intentional to test runtime behavior with valid strings
    const ext = getFileExtension(language as SupportedLanguage);
    deepStrictEqual(ext, expectedExt, `Language ${language} should have extension ${expectedExt}`);
  }
});

test('getFileExtension - throws ValidationError for unsupported language', () => {
  assertThrowsWith(
    () => getFileExtension('ruby' as SupportedLanguage),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getTestFileName tests
// =============================================================================

test('getTestFileName - returns correct names for each language', () => {
  const testCases: Array<[string, string]> = [
    ['typescript', 'solution_test.ts'],
    ['javascript', 'solution_test.js'],
    ['python', 'test_solution.py'],
    ['java', 'SolutionTest.java'],
    ['cpp', 'solution_test.cpp'],
    ['rust', 'tests.rs'],
    ['go', 'solution_test.go'],
  ];

  for (const [language, expectedName] of testCases) {
    // Type assertion is intentional to test runtime behavior with valid strings
    const fileName = getTestFileName(language as SupportedLanguage);
    deepStrictEqual(
      fileName,
      expectedName,
      `Language ${language} should have test file ${expectedName}`,
    );
  }
});

test('getTestFileName - throws ValidationError for unsupported language', () => {
  assertThrowsWith(
    () => getTestFileName('ruby' as SupportedLanguage),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getSolutionFileName tests
// =============================================================================

test('getSolutionFileName - returns correct names for each language', () => {
  const testCases: Array<[string, string]> = [
    ['typescript', 'solution.ts'],
    ['javascript', 'solution.js'],
    ['python', 'solution.py'],
    ['java', 'Solution.java'],
    ['cpp', 'solution.cpp'],
    ['rust', 'solution.rs'],
    ['go', 'solution.go'],
  ];

  for (const [language, expectedName] of testCases) {
    // Type assertion is intentional to test runtime behavior with valid strings
    const fileName = getSolutionFileName(language as SupportedLanguage);
    deepStrictEqual(
      fileName,
      expectedName,
      `Language ${language} should have solution file ${expectedName}`,
    );
  }
});

test('getSolutionFileName - throws ValidationError for unsupported language', () => {
  assertThrowsWith(
    () => getSolutionFileName('ruby' as SupportedLanguage),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getProblemPaths tests
// =============================================================================

test('getProblemPaths - returns correct structure', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/home/user/workspace',
    language: 'typescript',
  };
  const slug = 'two-sum';

  const paths = getProblemPaths(config, slug);

  ok(paths != null);
  deepStrictEqual(paths.dir, '/home/user/workspace/problems/two-sum');
  deepStrictEqual(paths.solutionFile, '/home/user/workspace/problems/two-sum/solution.ts');
  deepStrictEqual(paths.testFile, '/home/user/workspace/problems/two-sum/solution_test.ts');
  deepStrictEqual(paths.readmeFile, '/home/user/workspace/problems/two-sum/README.md');
  deepStrictEqual(paths.metadataFile, '/home/user/workspace/problems/two-sum/.problem.json');
});

test('getProblemPaths - works with different languages', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'python',
  };
  const slug = 'add-two-numbers';

  const paths = getProblemPaths(config, slug);

  deepStrictEqual(paths.solutionFile, '/workspace/problems/add-two-numbers/solution.py');
  deepStrictEqual(paths.testFile, '/workspace/problems/add-two-numbers/test_solution.py');
});

test('getProblemPaths - throws ValidationError for invalid config', () => {
  setupTest();
  assertThrowsWith(
    () => getProblemPaths(null as unknown as WorkspacePathConfig, 'two-sum'),
    ValidationError,
    'Config must be a valid WorkspacePathConfig object',
  );
});

test('getProblemPaths - throws ValidationError for empty slug', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrowsWith(
    () => getProblemPaths(config, ''),
    ValidationError,
    'Problem slug cannot be empty',
  );
});

test('getProblemPaths - throws ValidationError for slug with path separators', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrowsWith(
    () => getProblemPaths(config, 'two/sum'),
    ValidationError,
    'invalid path characters',
  );

  assertThrowsWith(
    () => getProblemPaths(config, 'two\\sum'),
    ValidationError,
    'invalid path characters',
  );
});

test('getProblemPaths - throws ValidationError for slug with path traversal', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrowsWith(
    () => getProblemPaths(config, '../etc'),
    ValidationError,
    'invalid path characters',
  );
});

test('getProblemPaths - throws ValidationError for invalid slug format', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  // Upper case not allowed
  assertThrowsWith(() => getProblemPaths(config, 'Two-Sum'), ValidationError, 'kebab-case');

  // Underscore not allowed
  assertThrowsWith(() => getProblemPaths(config, 'two_sum'), ValidationError, 'kebab-case');
});

test('getProblemPaths - throws ValidationError for slug with null bytes', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrowsWith(() => getProblemPaths(config, 'two\0sum'), ValidationError, 'null bytes');
});

test('getProblemPaths - throws ValidationError for slug over 100 characters', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };
  const longSlug = 'a'.repeat(101);

  assertThrowsWith(
    () => getProblemPaths(config, longSlug),
    ValidationError,
    'must not exceed 100 characters',
  );
});

// =============================================================================
// getArchivedProblemPaths tests
// =============================================================================

test('getArchivedProblemPaths - returns correct structure', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/home/user/workspace',
    language: 'typescript',
  };
  const slug = 'two-sum';

  const paths = getArchivedProblemPaths(config, slug);

  ok(paths != null);
  deepStrictEqual(paths.dir, '/home/user/workspace/completed/two-sum');
  deepStrictEqual(paths.solutionFile, '/home/user/workspace/completed/two-sum/solution.ts');
  deepStrictEqual(paths.testFile, '/home/user/workspace/completed/two-sum/solution_test.ts');
  deepStrictEqual(paths.readmeFile, '/home/user/workspace/completed/two-sum/README.md');
  deepStrictEqual(paths.metadataFile, '/home/user/workspace/completed/two-sum/.problem.json');
});

test('getArchivedProblemPaths - validates slug like getProblemPaths', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrowsWith(
    () => getArchivedProblemPaths(config, '../etc'),
    ValidationError,
    'invalid path characters',
  );
});

// =============================================================================
// isPathInWorkspace tests
// =============================================================================

test('isPathInWorkspace - returns true for paths inside workspace', () => {
  const workspace = '/home/user/workspace';
  const testCases = [
    '/home/user/workspace/problems',
    '/home/user/workspace/problems/two-sum',
    '/home/user/workspace/problems/two-sum/solution.ts',
    '/home/user/workspace/completed',
    '/home/user/workspace/templates/python.py',
  ];

  for (const testPath of testCases) {
    const result = isPathInWorkspace(workspace, testPath);
    deepStrictEqual(result, true, `Path ${testPath} should be inside workspace`);
  }
});

test('isPathInWorkspace - returns true for workspace root itself', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, workspace);
  deepStrictEqual(result, true);
});

test('isPathInWorkspace - returns false for paths outside workspace', () => {
  const workspace = '/home/user/workspace';
  const testCases = [
    '/home/user/other',
    '/home/other/workspace',
    '/tmp/test',
    '/etc/passwd',
    '/home/user/workspace-other',
  ];

  for (const testPath of testCases) {
    const result = isPathInWorkspace(workspace, testPath);
    deepStrictEqual(result, false, `Path ${testPath} should be outside workspace`);
  }
});

test('isPathInWorkspace - returns false for path traversal attempts', () => {
  const workspace = '/home/user/workspace';
  const testCases = ['/home/user/workspace/../etc', '/home/user/workspace/problems/../../other'];

  for (const testPath of testCases) {
    const result = isPathInWorkspace(workspace, testPath);
    deepStrictEqual(result, false, `Path ${testPath} should resolve outside workspace`);
  }
});

test('isPathInWorkspace - handles relative paths correctly', () => {
  const workspace = resolve('./workspace');
  const insidePath = resolve('./workspace/problems');
  const outsidePath = resolve('./other');

  deepStrictEqual(isPathInWorkspace(workspace, insidePath), true);
  deepStrictEqual(isPathInWorkspace(workspace, outsidePath), false);
});

test('isPathInWorkspace - returns false for empty path', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, '');
  deepStrictEqual(result, false);
});

test('isPathInWorkspace - returns false for path with null bytes', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, '/home/user/workspace/problems\0');
  deepStrictEqual(result, false);
});

test('isPathInWorkspace - throws ValidationError for invalid workspace root', () => {
  assertThrowsWith(
    () => isPathInWorkspace('', '/some/path'),
    ValidationError,
    'Root directory cannot be empty',
  );
});

// =============================================================================
// WORKSPACE_RULES constants tests
// =============================================================================

test('WORKSPACE_RULES - has correct directory names', () => {
  deepStrictEqual(WORKSPACE_RULES.dirs.problems, 'problems');
  deepStrictEqual(WORKSPACE_RULES.dirs.completed, 'completed');
  deepStrictEqual(WORKSPACE_RULES.dirs.templates, 'templates');
  deepStrictEqual(WORKSPACE_RULES.dirs.config, 'config');
});

test('WORKSPACE_RULES - has correct file names', () => {
  deepStrictEqual(WORKSPACE_RULES.files.readme, 'README.md');
  deepStrictEqual(WORKSPACE_RULES.files.metadata, '.problem.json');
  deepStrictEqual(WORKSPACE_RULES.files.solutionBase, 'solution');
  deepStrictEqual(WORKSPACE_RULES.files.testBase, 'solution_test');
});

// =============================================================================
// Cache behavior tests
// =============================================================================

test('clearWorkspacePathCache - clears the cache', () => {
  setupTest();
  const rootDir = '/home/user/workspace';

  // First call should populate cache
  const paths1 = getWorkspacePaths(rootDir);

  // Clear cache
  clearWorkspacePathCache();

  // Second call should create new object
  const paths2 = getWorkspacePaths(rootDir);

  // Objects should be equal in content but not necessarily the same reference
  deepStrictEqual(paths1.root, paths2.root);
  deepStrictEqual(paths1.problems, paths2.problems);
});

test('getWorkspacePaths - cache handles multiple different roots', () => {
  setupTest();
  const root1 = '/workspace1';
  const root2 = '/workspace2';

  const paths1 = getWorkspacePaths(root1);
  const paths2 = getWorkspacePaths(root2);

  deepStrictEqual(paths1.root, root1);
  deepStrictEqual(paths2.root, root2);
  deepStrictEqual(paths1.problems !== paths2.problems, true);
});
