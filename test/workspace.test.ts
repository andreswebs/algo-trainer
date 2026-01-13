/**
 * Tests for workspace path resolution utilities
 *
 * @module tests/workspace
 */

import { assertEquals, assertExists, assertThrows } from '@std/assert';
import { join, resolve } from '@std/path';
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
  type ProblemWorkspacePaths,
  type WorkspacePathConfig,
  type WorkspacePaths,
} from '../src/core/workspace/mod.ts';
import { ValidationError, WorkspaceError } from '../src/utils/errors.ts';

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

Deno.test('getWorkspacePaths - returns correct structure for absolute path', () => {
  setupTest();
  const rootDir = '/home/user/workspace';
  const paths = getWorkspacePaths(rootDir);

  assertExists(paths);
  assertEquals(paths.root, rootDir);
  assertEquals(paths.problems, join(rootDir, 'problems'));
  assertEquals(paths.completed, join(rootDir, 'completed'));
  assertEquals(paths.templates, join(rootDir, 'templates'));
  assertEquals(paths.config, join(rootDir, 'config'));
});

Deno.test('getWorkspacePaths - converts relative to absolute path', () => {
  setupTest();
  const relativePath = './test-workspace';
  const paths = getWorkspacePaths(relativePath);

  assertExists(paths);
  assertEquals(paths.root, resolve(relativePath));
  assertEquals(paths.problems.startsWith(paths.root), true);
});

Deno.test('getWorkspacePaths - caches results for same root', () => {
  setupTest();
  const rootDir = '/home/user/workspace';
  const paths1 = getWorkspacePaths(rootDir);
  const paths2 = getWorkspacePaths(rootDir);

  // Should return same object reference from cache
  assertEquals(paths1, paths2);
});

Deno.test('getWorkspacePaths - throws ValidationError for empty string', () => {
  setupTest();
  assertThrows(
    () => getWorkspacePaths(''),
    ValidationError,
    'Root directory cannot be empty',
  );
});

Deno.test('getWorkspacePaths - throws ValidationError for whitespace-only string', () => {
  setupTest();
  assertThrows(
    () => getWorkspacePaths('   '),
    ValidationError,
    'Root directory cannot be empty',
  );
});

Deno.test('getWorkspacePaths - throws ValidationError for non-string input', () => {
  setupTest();
  assertThrows(
    () => getWorkspacePaths(123 as any),
    ValidationError,
    'Root directory must be a string',
  );
});

Deno.test('getWorkspacePaths - throws ValidationError for null bytes', () => {
  setupTest();
  assertThrows(
    () => getWorkspacePaths('/home/user\0/workspace'),
    ValidationError,
    'null bytes',
  );
});

Deno.test('getWorkspacePaths - throws ValidationError for path traversal', () => {
  setupTest();
  assertThrows(
    () => getWorkspacePaths('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// getFileExtension tests
// =============================================================================

Deno.test('getFileExtension - returns correct extensions', () => {
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
    const ext = getFileExtension(language as any);
    assertEquals(ext, expectedExt, `Language ${language} should have extension ${expectedExt}`);
  }
});

Deno.test('getFileExtension - throws ValidationError for unsupported language', () => {
  assertThrows(
    () => getFileExtension('ruby' as any),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getTestFileName tests
// =============================================================================

Deno.test('getTestFileName - returns correct names for each language', () => {
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
    const fileName = getTestFileName(language as any);
    assertEquals(
      fileName,
      expectedName,
      `Language ${language} should have test file ${expectedName}`,
    );
  }
});

Deno.test('getTestFileName - throws ValidationError for unsupported language', () => {
  assertThrows(
    () => getTestFileName('ruby' as any),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getSolutionFileName tests
// =============================================================================

Deno.test('getSolutionFileName - returns correct names for each language', () => {
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
    const fileName = getSolutionFileName(language as any);
    assertEquals(
      fileName,
      expectedName,
      `Language ${language} should have solution file ${expectedName}`,
    );
  }
});

Deno.test('getSolutionFileName - throws ValidationError for unsupported language', () => {
  assertThrows(
    () => getSolutionFileName('ruby' as any),
    ValidationError,
    'Unsupported language',
  );
});

// =============================================================================
// getProblemPaths tests
// =============================================================================

Deno.test('getProblemPaths - returns correct structure', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/home/user/workspace',
    language: 'typescript',
  };
  const slug = 'two-sum';

  const paths = getProblemPaths(config, slug);

  assertExists(paths);
  assertEquals(paths.dir, '/home/user/workspace/problems/two-sum');
  assertEquals(paths.solutionFile, '/home/user/workspace/problems/two-sum/solution.ts');
  assertEquals(paths.testFile, '/home/user/workspace/problems/two-sum/solution_test.ts');
  assertEquals(paths.readmeFile, '/home/user/workspace/problems/two-sum/README.md');
  assertEquals(paths.metadataFile, '/home/user/workspace/problems/two-sum/.problem.json');
});

Deno.test('getProblemPaths - works with different languages', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'python',
  };
  const slug = 'add-two-numbers';

  const paths = getProblemPaths(config, slug);

  assertEquals(paths.solutionFile, '/workspace/problems/add-two-numbers/solution.py');
  assertEquals(paths.testFile, '/workspace/problems/add-two-numbers/test_solution.py');
});

Deno.test('getProblemPaths - throws ValidationError for invalid config', () => {
  setupTest();
  assertThrows(
    () => getProblemPaths(null as any, 'two-sum'),
    ValidationError,
    'Config must be a valid WorkspacePathConfig object',
  );
});

Deno.test('getProblemPaths - throws ValidationError for empty slug', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrows(
    () => getProblemPaths(config, ''),
    ValidationError,
    'Problem slug cannot be empty',
  );
});

Deno.test('getProblemPaths - throws ValidationError for slug with path separators', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrows(
    () => getProblemPaths(config, 'two/sum'),
    ValidationError,
    'invalid path characters',
  );

  assertThrows(
    () => getProblemPaths(config, 'two\\sum'),
    ValidationError,
    'invalid path characters',
  );
});

Deno.test('getProblemPaths - throws ValidationError for slug with path traversal', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrows(
    () => getProblemPaths(config, '../etc'),
    ValidationError,
    'invalid path characters',
  );
});

Deno.test('getProblemPaths - throws ValidationError for invalid slug format', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  // Upper case not allowed
  assertThrows(
    () => getProblemPaths(config, 'Two-Sum'),
    ValidationError,
    'kebab-case',
  );

  // Underscore not allowed
  assertThrows(
    () => getProblemPaths(config, 'two_sum'),
    ValidationError,
    'kebab-case',
  );
});

Deno.test('getProblemPaths - throws ValidationError for slug with null bytes', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrows(
    () => getProblemPaths(config, 'two\0sum'),
    ValidationError,
    'null bytes',
  );
});

Deno.test('getProblemPaths - throws ValidationError for slug over 100 characters', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };
  const longSlug = 'a'.repeat(101);

  assertThrows(
    () => getProblemPaths(config, longSlug),
    ValidationError,
    'must not exceed 100 characters',
  );
});

// =============================================================================
// getArchivedProblemPaths tests
// =============================================================================

Deno.test('getArchivedProblemPaths - returns correct structure', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/home/user/workspace',
    language: 'typescript',
  };
  const slug = 'two-sum';

  const paths = getArchivedProblemPaths(config, slug);

  assertExists(paths);
  assertEquals(paths.dir, '/home/user/workspace/completed/two-sum');
  assertEquals(paths.solutionFile, '/home/user/workspace/completed/two-sum/solution.ts');
  assertEquals(paths.testFile, '/home/user/workspace/completed/two-sum/solution_test.ts');
  assertEquals(paths.readmeFile, '/home/user/workspace/completed/two-sum/README.md');
  assertEquals(paths.metadataFile, '/home/user/workspace/completed/two-sum/.problem.json');
});

Deno.test('getArchivedProblemPaths - validates slug like getProblemPaths', () => {
  setupTest();
  const config: WorkspacePathConfig = {
    rootDir: '/workspace',
    language: 'typescript',
  };

  assertThrows(
    () => getArchivedProblemPaths(config, '../etc'),
    ValidationError,
    'invalid path characters',
  );
});

// =============================================================================
// isPathInWorkspace tests
// =============================================================================

Deno.test('isPathInWorkspace - returns true for paths inside workspace', () => {
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
    assertEquals(result, true, `Path ${testPath} should be inside workspace`);
  }
});

Deno.test('isPathInWorkspace - returns true for workspace root itself', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, workspace);
  assertEquals(result, true);
});

Deno.test('isPathInWorkspace - returns false for paths outside workspace', () => {
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
    assertEquals(result, false, `Path ${testPath} should be outside workspace`);
  }
});

Deno.test('isPathInWorkspace - returns false for path traversal attempts', () => {
  const workspace = '/home/user/workspace';
  const testCases = [
    '/home/user/workspace/../etc',
    '/home/user/workspace/problems/../../other',
  ];

  for (const testPath of testCases) {
    const result = isPathInWorkspace(workspace, testPath);
    assertEquals(result, false, `Path ${testPath} should resolve outside workspace`);
  }
});

Deno.test('isPathInWorkspace - handles relative paths correctly', () => {
  const workspace = resolve('./workspace');
  const insidePath = resolve('./workspace/problems');
  const outsidePath = resolve('./other');

  assertEquals(isPathInWorkspace(workspace, insidePath), true);
  assertEquals(isPathInWorkspace(workspace, outsidePath), false);
});

Deno.test('isPathInWorkspace - returns false for empty path', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, '');
  assertEquals(result, false);
});

Deno.test('isPathInWorkspace - returns false for path with null bytes', () => {
  const workspace = '/home/user/workspace';
  const result = isPathInWorkspace(workspace, '/home/user/workspace/problems\0');
  assertEquals(result, false);
});

Deno.test('isPathInWorkspace - throws ValidationError for invalid workspace root', () => {
  assertThrows(
    () => isPathInWorkspace('', '/some/path'),
    ValidationError,
    'Root directory cannot be empty',
  );
});

// =============================================================================
// WORKSPACE_RULES constants tests
// =============================================================================

Deno.test('WORKSPACE_RULES - has correct directory names', () => {
  assertEquals(WORKSPACE_RULES.dirs.problems, 'problems');
  assertEquals(WORKSPACE_RULES.dirs.completed, 'completed');
  assertEquals(WORKSPACE_RULES.dirs.templates, 'templates');
  assertEquals(WORKSPACE_RULES.dirs.config, 'config');
});

Deno.test('WORKSPACE_RULES - has correct file names', () => {
  assertEquals(WORKSPACE_RULES.files.readme, 'README.md');
  assertEquals(WORKSPACE_RULES.files.metadata, '.problem.json');
  assertEquals(WORKSPACE_RULES.files.solutionBase, 'solution');
  assertEquals(WORKSPACE_RULES.files.testBase, 'solution_test');
});

// =============================================================================
// Cache behavior tests
// =============================================================================

Deno.test('clearWorkspacePathCache - clears the cache', () => {
  setupTest();
  const rootDir = '/home/user/workspace';

  // First call should populate cache
  const paths1 = getWorkspacePaths(rootDir);

  // Clear cache
  clearWorkspacePathCache();

  // Second call should create new object
  const paths2 = getWorkspacePaths(rootDir);

  // Objects should be equal in content but not necessarily the same reference
  assertEquals(paths1.root, paths2.root);
  assertEquals(paths1.problems, paths2.problems);
});

Deno.test('getWorkspacePaths - cache handles multiple different roots', () => {
  setupTest();
  const root1 = '/workspace1';
  const root2 = '/workspace2';

  const paths1 = getWorkspacePaths(root1);
  const paths2 = getWorkspacePaths(root2);

  assertEquals(paths1.root, root1);
  assertEquals(paths2.root, root2);
  assertEquals(paths1.problems !== paths2.problems, true);
});
