/**
 * Tests for workspace manager utilities
 *
 * @module tests/workspace-manager
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getWorkspaceStructure,
  initWorkspace,
  isWorkspaceInitialized,
  validateWorkspace,
} from '../src/core/workspace/mod.ts';
import { ValidationError, WorkspaceError } from '../src/utils/errors.ts';
import { pathExists, remove } from '../src/utils/fs.ts';
import { assertRejectsWith } from './helpers/assert.ts';

// =============================================================================
// Test Setup and Cleanup
// =============================================================================

/**
 * Create a unique temporary directory for each test
 */
async function createTempDir(): Promise<string> {
  const tempBase = await mkdtemp(join(tmpdir(), 'workspace-test-'));
  return tempBase;
}

/**
 * Clean up temporary directory after test
 */
async function cleanupTempDir(path: string): Promise<void> {
  try {
    await remove(path, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// =============================================================================
// getWorkspaceStructure tests
// =============================================================================

test('getWorkspaceStructure - returns correct structure', () => {
  const root = '/home/user/workspace';
  const structure = getWorkspaceStructure(root);

  ok(structure != null);
  deepStrictEqual(structure.root, root);
  deepStrictEqual(structure.problems, join(root, 'problems'));
  deepStrictEqual(structure.completed, join(root, 'completed'));
  deepStrictEqual(structure.templates, join(root, 'templates'));
  deepStrictEqual(structure.config, join(root, 'config'));
});

test('getWorkspaceStructure - converts relative to absolute path', async () => {
  const tempDir = await createTempDir();
  try {
    const relativePath = '.';
    const structure = getWorkspaceStructure(relativePath);

    ok(structure != null);
    ok(structure.root != null);
    // Root should be absolute
    deepStrictEqual(structure.root.startsWith('/'), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('getWorkspaceStructure - throws ValidationError for empty string', () => {
  try {
    getWorkspaceStructure('');
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    deepStrictEqual(error instanceof ValidationError, true);
    deepStrictEqual((error as ValidationError).message.includes('cannot be empty'), true);
  }
});

test('getWorkspaceStructure - throws ValidationError for invalid path', () => {
  try {
    getWorkspaceStructure('/home/user/../../../etc');
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    deepStrictEqual(error instanceof ValidationError, true);
    deepStrictEqual((error as ValidationError).message.includes('path traversal'), true);
  }
});

// =============================================================================
// initWorkspace tests
// =============================================================================

test('initWorkspace - creates all required directories', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Verify all directories exist
    const structure = getWorkspaceStructure(workspaceRoot);
    deepStrictEqual(await pathExists(structure.root), true);
    deepStrictEqual(await pathExists(structure.problems), true);
    deepStrictEqual(await pathExists(structure.completed), true);
    deepStrictEqual(await pathExists(structure.templates), true);
    deepStrictEqual(await pathExists(structure.config), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('initWorkspace - is idempotent (can be called multiple times)', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace twice
    await initWorkspace(workspaceRoot);
    await initWorkspace(workspaceRoot);

    // Should still have all directories
    const structure = getWorkspaceStructure(workspaceRoot);
    deepStrictEqual(await pathExists(structure.root), true);
    deepStrictEqual(await pathExists(structure.problems), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('initWorkspace - works with relative paths', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceName = 'test-workspace-relative';
    const workspaceRoot = join(tempDir, workspaceName);

    // Save current directory
    const originalCwd = process.cwd();
    try {
      // Change to temp directory
      process.chdir(tempDir);

      // Initialize with relative path
      await initWorkspace(`./${workspaceName}`);

      // Verify directories exist
      deepStrictEqual(await pathExists(workspaceRoot), true);
      deepStrictEqual(await pathExists(join(workspaceRoot, 'problems')), true);
    } finally {
      // Restore original directory
      process.chdir(originalCwd);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('initWorkspace - throws ValidationError for empty root', async () => {
  await assertRejectsWith(async () => await initWorkspace(''), ValidationError, 'cannot be empty');
});

test('initWorkspace - throws ValidationError for invalid path', async () => {
  await assertRejectsWith(
    async () => await initWorkspace('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// isWorkspaceInitialized tests
// =============================================================================

test('isWorkspaceInitialized - returns true for initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Check if initialized
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(initialized, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('isWorkspaceInitialized - returns false for non-existent workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'non-existent-workspace');

    // Check if initialized (should be false)
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(initialized, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('isWorkspaceInitialized - returns false for partially initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'partial-workspace');

    // Create only root and problems directory
    await mkdir(workspaceRoot, { recursive: true });
    await mkdir(join(workspaceRoot, 'problems'));

    // Check if initialized (should be false - missing other dirs)
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(initialized, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('isWorkspaceInitialized - throws ValidationError for invalid root', async () => {
  await assertRejectsWith(
    async () => await isWorkspaceInitialized(''),
    ValidationError,
    'cannot be empty',
  );
});

// =============================================================================
// validateWorkspace tests
// =============================================================================

test('validateWorkspace - succeeds for valid workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Validate workspace (should not throw)
    await validateWorkspace(workspaceRoot);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('validateWorkspace - throws WorkspaceError for non-existent workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'non-existent-workspace');

    // Validate workspace (should throw)
    await assertRejectsWith(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'Missing directories',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('validateWorkspace - throws WorkspaceError for partially initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'partial-workspace');

    // Create only root and problems directory
    await mkdir(workspaceRoot, { recursive: true });
    await mkdir(join(workspaceRoot, 'problems'));

    // Validate workspace (should throw)
    await assertRejectsWith(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'Missing directories',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('validateWorkspace - throws WorkspaceError if path exists but is not a directory', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Create workspace structure
    await initWorkspace(workspaceRoot);

    // Replace problems directory with a file
    await remove(join(workspaceRoot, 'problems'), { recursive: true });
    await writeFile(join(workspaceRoot, 'problems'), 'This is a file, not a directory');

    // Validate workspace (should throw)
    await assertRejectsWith(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'not a directory',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('validateWorkspace - throws ValidationError for invalid root', async () => {
  await assertRejectsWith(
    async () => await validateWorkspace(''),
    ValidationError,
    'cannot be empty',
  );
});

test('validateWorkspace - throws ValidationError for path traversal', async () => {
  await assertRejectsWith(
    async () => await validateWorkspace('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// Integration tests
// =============================================================================

test('integration - complete workspace lifecycle', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'lifecycle-workspace');

    // 1. Check initial state (not initialized)
    const initialState = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(initialState, false);

    // 2. Initialize workspace
    await initWorkspace(workspaceRoot);

    // 3. Check state after initialization
    const afterInitState = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(afterInitState, true);

    // 4. Validate workspace structure
    await validateWorkspace(workspaceRoot);

    // 5. Get workspace structure and verify paths
    const structure = getWorkspaceStructure(workspaceRoot);
    deepStrictEqual(await pathExists(structure.root), true);
    deepStrictEqual(await pathExists(structure.problems), true);
    deepStrictEqual(await pathExists(structure.completed), true);
    deepStrictEqual(await pathExists(structure.templates), true);
    deepStrictEqual(await pathExists(structure.config), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('integration - workspace can be re-initialized after partial deletion', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'reinit-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Delete some directories
    await remove(join(workspaceRoot, 'completed'), { recursive: true });
    await remove(join(workspaceRoot, 'templates'), { recursive: true });

    // Check state (should be false)
    const partialState = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(partialState, false);

    // Re-initialize workspace (should recreate missing directories)
    await initWorkspace(workspaceRoot);

    // Check state (should be true)
    const finalState = await isWorkspaceInitialized(workspaceRoot);
    deepStrictEqual(finalState, true);

    // Validate workspace
    await validateWorkspace(workspaceRoot);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
