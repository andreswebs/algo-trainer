/**
 * Tests for workspace manager utilities
 *
 * @module tests/workspace-manager
 */

import { assertEquals, assertExists, assertRejects } from '@std/assert';
import { join } from '@std/path';
import {
  getWorkspaceStructure,
  initWorkspace,
  isWorkspaceInitialized,
  validateWorkspace,
} from '../src/core/workspace/mod.ts';
import { ValidationError, WorkspaceError } from '../src/utils/errors.ts';
import { pathExists, remove } from '../src/utils/fs.ts';

// =============================================================================
// Test Setup and Cleanup
// =============================================================================

/**
 * Create a unique temporary directory for each test
 */
async function createTempDir(): Promise<string> {
  const tempBase = await Deno.makeTempDir({ prefix: 'workspace-test-' });
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

Deno.test('getWorkspaceStructure - returns correct structure', () => {
  const root = '/home/user/workspace';
  const structure = getWorkspaceStructure(root);

  assertExists(structure);
  assertEquals(structure.root, root);
  assertEquals(structure.problems, join(root, 'problems'));
  assertEquals(structure.completed, join(root, 'completed'));
  assertEquals(structure.templates, join(root, 'templates'));
  assertEquals(structure.config, join(root, 'config'));
});

Deno.test('getWorkspaceStructure - converts relative to absolute path', async () => {
  const tempDir = await createTempDir();
  try {
    const relativePath = '.';
    const structure = getWorkspaceStructure(relativePath);

    assertExists(structure);
    assertExists(structure.root);
    // Root should be absolute
    assertEquals(structure.root.startsWith('/'), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('getWorkspaceStructure - throws ValidationError for empty string', () => {
  try {
    getWorkspaceStructure('');
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    assertEquals(error instanceof ValidationError, true);
    assertEquals((error as ValidationError).message.includes('cannot be empty'), true);
  }
});

Deno.test('getWorkspaceStructure - throws ValidationError for invalid path', () => {
  try {
    getWorkspaceStructure('/home/user/../../../etc');
    throw new Error('Should have thrown ValidationError');
  } catch (error) {
    assertEquals(error instanceof ValidationError, true);
    assertEquals((error as ValidationError).message.includes('path traversal'), true);
  }
});

// =============================================================================
// initWorkspace tests
// =============================================================================

Deno.test('initWorkspace - creates all required directories', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Verify all directories exist
    const structure = getWorkspaceStructure(workspaceRoot);
    assertEquals(await pathExists(structure.root), true);
    assertEquals(await pathExists(structure.problems), true);
    assertEquals(await pathExists(structure.completed), true);
    assertEquals(await pathExists(structure.templates), true);
    assertEquals(await pathExists(structure.config), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initWorkspace - is idempotent (can be called multiple times)', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace twice
    await initWorkspace(workspaceRoot);
    await initWorkspace(workspaceRoot);

    // Should still have all directories
    const structure = getWorkspaceStructure(workspaceRoot);
    assertEquals(await pathExists(structure.root), true);
    assertEquals(await pathExists(structure.problems), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initWorkspace - works with relative paths', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceName = 'test-workspace-relative';
    const workspaceRoot = join(tempDir, workspaceName);

    // Save current directory
    const originalCwd = Deno.cwd();
    try {
      // Change to temp directory
      Deno.chdir(tempDir);

      // Initialize with relative path
      await initWorkspace(`./${workspaceName}`);

      // Verify directories exist
      assertEquals(await pathExists(workspaceRoot), true);
      assertEquals(await pathExists(join(workspaceRoot, 'problems')), true);
    } finally {
      // Restore original directory
      Deno.chdir(originalCwd);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('initWorkspace - throws ValidationError for empty root', async () => {
  await assertRejects(
    async () => await initWorkspace(''),
    ValidationError,
    'cannot be empty',
  );
});

Deno.test('initWorkspace - throws ValidationError for invalid path', async () => {
  await assertRejects(
    async () => await initWorkspace('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// isWorkspaceInitialized tests
// =============================================================================

Deno.test('isWorkspaceInitialized - returns true for initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Check if initialized
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(initialized, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isWorkspaceInitialized - returns false for non-existent workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'non-existent-workspace');

    // Check if initialized (should be false)
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(initialized, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isWorkspaceInitialized - returns false for partially initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'partial-workspace');

    // Create only root and problems directory
    await Deno.mkdir(workspaceRoot, { recursive: true });
    await Deno.mkdir(join(workspaceRoot, 'problems'));

    // Check if initialized (should be false - missing other dirs)
    const initialized = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(initialized, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('isWorkspaceInitialized - throws ValidationError for invalid root', async () => {
  await assertRejects(
    async () => await isWorkspaceInitialized(''),
    ValidationError,
    'cannot be empty',
  );
});

// =============================================================================
// validateWorkspace tests
// =============================================================================

Deno.test('validateWorkspace - succeeds for valid workspace', async () => {
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

Deno.test('validateWorkspace - throws WorkspaceError for non-existent workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'non-existent-workspace');

    // Validate workspace (should throw)
    await assertRejects(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'Missing directories',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('validateWorkspace - throws WorkspaceError for partially initialized workspace', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'partial-workspace');

    // Create only root and problems directory
    await Deno.mkdir(workspaceRoot, { recursive: true });
    await Deno.mkdir(join(workspaceRoot, 'problems'));

    // Validate workspace (should throw)
    await assertRejects(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'Missing directories',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('validateWorkspace - throws WorkspaceError if path exists but is not a directory', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'test-workspace');

    // Create workspace structure
    await initWorkspace(workspaceRoot);

    // Replace problems directory with a file
    await remove(join(workspaceRoot, 'problems'), { recursive: true });
    await Deno.writeTextFile(join(workspaceRoot, 'problems'), 'This is a file, not a directory');

    // Validate workspace (should throw)
    await assertRejects(
      async () => await validateWorkspace(workspaceRoot),
      WorkspaceError,
      'not a directory',
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('validateWorkspace - throws ValidationError for invalid root', async () => {
  await assertRejects(
    async () => await validateWorkspace(''),
    ValidationError,
    'cannot be empty',
  );
});

Deno.test('validateWorkspace - throws ValidationError for path traversal', async () => {
  await assertRejects(
    async () => await validateWorkspace('/home/user/../../../etc'),
    ValidationError,
    'path traversal',
  );
});

// =============================================================================
// Integration tests
// =============================================================================

Deno.test('integration - complete workspace lifecycle', async () => {
  const tempDir = await createTempDir();
  try {
    const workspaceRoot = join(tempDir, 'lifecycle-workspace');

    // 1. Check initial state (not initialized)
    const initialState = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(initialState, false);

    // 2. Initialize workspace
    await initWorkspace(workspaceRoot);

    // 3. Check state after initialization
    const afterInitState = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(afterInitState, true);

    // 4. Validate workspace structure
    await validateWorkspace(workspaceRoot);

    // 5. Get workspace structure and verify paths
    const structure = getWorkspaceStructure(workspaceRoot);
    assertEquals(await pathExists(structure.root), true);
    assertEquals(await pathExists(structure.problems), true);
    assertEquals(await pathExists(structure.completed), true);
    assertEquals(await pathExists(structure.templates), true);
    assertEquals(await pathExists(structure.config), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test('integration - workspace can be re-initialized after partial deletion', async () => {
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
    assertEquals(partialState, false);

    // Re-initialize workspace (should recreate missing directories)
    await initWorkspace(workspaceRoot);

    // Check state (should be true)
    const finalState = await isWorkspaceInitialized(workspaceRoot);
    assertEquals(finalState, true);

    // Validate workspace
    await validateWorkspace(workspaceRoot);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
