/**
 * Tests for problem archive and restore operations (PMS-016)
 *
 * @module tests/core/workspace/archive
 */

import { assertEquals, assertExists, assertRejects } from '@std/assert';
import { join } from '@std/path';
import {
  archiveProblem,
  type ArchiveProblemOptions,
  isArchived,
  listArchivedProblems,
  unarchiveProblem,
  type UnarchiveProblemOptions,
} from '../../../src/core/workspace/archive.ts';
import { WorkspaceError } from '../../../src/utils/errors.ts';
import { createDirectory, pathExists } from '../../../src/utils/fs.ts';

// =============================================================================
// Test Setup and Helpers
// =============================================================================

/**
 * Create a temporary test workspace
 */
async function createTestWorkspace(): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-test-' });
  const workspace = join(tempDir, 'workspace');

  // Create workspace structure
  await createDirectory(join(workspace, 'problems'));
  await createDirectory(join(workspace, 'completed'));
  await createDirectory(join(workspace, 'templates'));
  await createDirectory(join(workspace, 'config'));

  return workspace;
}

/**
 * Create a test problem directory with files
 */
async function createTestProblem(
  workspaceRoot: string,
  slug: string,
  inCompleted = false,
): Promise<void> {
  const baseDir = inCompleted ? 'completed' : 'problems';
  const problemDir = join(workspaceRoot, baseDir, slug);

  await createDirectory(problemDir);

  // Create some test files
  await Deno.writeTextFile(join(problemDir, 'solution.ts'), '// Solution code');
  await Deno.writeTextFile(join(problemDir, 'solution_test.ts'), '// Test code');
  await Deno.writeTextFile(join(problemDir, 'README.md'), '# Problem');
  await Deno.writeTextFile(
    join(problemDir, '.problem.json'),
    JSON.stringify({
      problemId: slug,
      slug,
      language: 'typescript',
      generatedAt: new Date().toISOString(),
    }),
  );
}

/**
 * Clean up temporary directory
 */
async function cleanupWorkspace(workspace: string): Promise<void> {
  try {
    const tempDir = join(workspace, '..');
    await Deno.remove(tempDir, { recursive: true });
  } catch (_error) {
    // Ignore cleanup errors
  }
}

// =============================================================================
// archiveProblem tests
// =============================================================================

Deno.test('archiveProblem - moves problem from problems to completed', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum');

    const options: ArchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    };

    const result = await archiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, false);
    assertEquals(result.from, join(workspace, 'problems', 'two-sum'));
    assertEquals(result.archivedTo, join(workspace, 'completed', 'two-sum'));

    // Verify source no longer exists
    const sourceExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(sourceExists, false);

    // Verify destination exists
    const destExists = await pathExists(join(workspace, 'completed', 'two-sum'));
    assertEquals(destExists, true);

    // Verify files were moved
    const solutionExists = await pathExists(
      join(workspace, 'completed', 'two-sum', 'solution.ts'),
    );
    assertEquals(solutionExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('archiveProblem - handles collision with timestamp suffix by default', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum');
    await createTestProblem(workspace, 'two-sum', true); // Already archived

    const options: ArchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    };

    const result = await archiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, true);

    // Verify source no longer exists
    const sourceExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(sourceExists, false);

    // Verify original archived version still exists
    const originalExists = await pathExists(join(workspace, 'completed', 'two-sum'));
    assertEquals(originalExists, true);

    // Verify new version exists with timestamp suffix
    const archivedPath = result.archivedTo;
    const archivedExists = await pathExists(archivedPath);
    assertEquals(archivedExists, true);

    // Verify timestamp pattern in archived path
    const timestampPattern = /two-sum-\d{8}-\d{6}$/;
    assertEquals(timestampPattern.test(archivedPath), true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('archiveProblem - overwrites when collision strategy is overwrite', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum');
    await createTestProblem(workspace, 'two-sum', true); // Already archived

    const options: ArchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
      onCollision: 'overwrite',
    };

    const result = await archiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, false);
    assertEquals(result.archivedTo, join(workspace, 'completed', 'two-sum'));

    // Verify only one version exists
    const entries: string[] = [];
    for await (const entry of Deno.readDir(join(workspace, 'completed'))) {
      if (entry.isDirectory && entry.name.startsWith('two-sum')) {
        entries.push(entry.name);
      }
    }
    assertEquals(entries.length, 1);
    assertEquals(entries[0], 'two-sum');
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('archiveProblem - throws error when collision strategy is error', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum');
    await createTestProblem(workspace, 'two-sum', true); // Already archived

    const options: ArchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
      onCollision: 'error',
    };

    await assertRejects(
      async () => await archiveProblem(options),
      WorkspaceError,
      'Archived problem already exists',
    );

    // Verify source still exists (move didn't happen)
    const sourceExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(sourceExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('archiveProblem - throws error if problem does not exist', async () => {
  const workspace = await createTestWorkspace();
  try {
    const options: ArchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'nonexistent',
      language: 'typescript',
    };

    await assertRejects(
      async () => await archiveProblem(options),
      WorkspaceError,
      'Problem not found in active directory',
    );
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// unarchiveProblem tests
// =============================================================================

Deno.test('unarchiveProblem - moves problem from completed to problems', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum', true); // In completed

    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    };

    const result = await unarchiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, false);
    assertEquals(result.from, join(workspace, 'completed', 'two-sum'));
    assertEquals(result.restoredTo, join(workspace, 'problems', 'two-sum'));

    // Verify source no longer exists
    const sourceExists = await pathExists(join(workspace, 'completed', 'two-sum'));
    assertEquals(sourceExists, false);

    // Verify destination exists
    const destExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(destExists, true);

    // Verify files were moved
    const solutionExists = await pathExists(
      join(workspace, 'problems', 'two-sum', 'solution.ts'),
    );
    assertEquals(solutionExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('unarchiveProblem - handles collision with timestamp suffix by default', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum'); // Already in problems
    await createTestProblem(workspace, 'two-sum', true); // In completed

    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    };

    const result = await unarchiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, true);

    // Verify source no longer exists
    const sourceExists = await pathExists(join(workspace, 'completed', 'two-sum'));
    assertEquals(sourceExists, false);

    // Verify original active version still exists
    const originalExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(originalExists, true);

    // Verify new version exists with timestamp suffix
    const restoredPath = result.restoredTo;
    const restoredExists = await pathExists(restoredPath);
    assertEquals(restoredExists, true);

    // Verify timestamp pattern in restored path
    const timestampPattern = /two-sum-\d{8}-\d{6}$/;
    assertEquals(timestampPattern.test(restoredPath), true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('unarchiveProblem - overwrites when collision strategy is overwrite', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum'); // Already in problems
    await createTestProblem(workspace, 'two-sum', true); // In completed

    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
      onCollision: 'overwrite',
    };

    const result = await unarchiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, false);
    assertEquals(result.restoredTo, join(workspace, 'problems', 'two-sum'));

    // Verify only one version exists
    const entries: string[] = [];
    for await (const entry of Deno.readDir(join(workspace, 'problems'))) {
      if (entry.isDirectory && entry.name.startsWith('two-sum')) {
        entries.push(entry.name);
      }
    }
    assertEquals(entries.length, 1);
    assertEquals(entries[0], 'two-sum');
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('unarchiveProblem - throws error when collision strategy is error', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum'); // Already in problems
    await createTestProblem(workspace, 'two-sum', true); // In completed

    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
      onCollision: 'error',
    };

    await assertRejects(
      async () => await unarchiveProblem(options),
      WorkspaceError,
      'Active problem already exists',
    );

    // Verify source still exists (move didn't happen)
    const sourceExists = await pathExists(join(workspace, 'completed', 'two-sum'));
    assertEquals(sourceExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('unarchiveProblem - throws error if archived problem does not exist', async () => {
  const workspace = await createTestWorkspace();
  try {
    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: 'nonexistent',
      language: 'typescript',
    };

    await assertRejects(
      async () => await unarchiveProblem(options),
      WorkspaceError,
      'Archived problem not found',
    );
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('unarchiveProblem - handles timestamped slugs correctly', async () => {
  const workspace = await createTestWorkspace();
  try {
    // Create an archived problem with timestamp suffix
    const slugWithTimestamp = 'two-sum-20260114-143045';
    await createTestProblem(workspace, slugWithTimestamp, true);

    const options: UnarchiveProblemOptions = {
      workspaceRoot: workspace,
      slug: slugWithTimestamp,
      language: 'typescript',
    };

    const result = await unarchiveProblem(options);

    assertExists(result);
    assertEquals(result.success, true);
    assertEquals(result.collisionHandled, false);
    assertEquals(result.from, join(workspace, 'completed', slugWithTimestamp));
    // Should restore to base slug without timestamp
    assertEquals(result.restoredTo, join(workspace, 'problems', 'two-sum'));

    // Verify restored with correct name (without timestamp)
    const destExists = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(destExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// isArchived tests
// =============================================================================

Deno.test('isArchived - returns true for archived problem', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum', true);

    const result = await isArchived(workspace, 'two-sum', 'typescript');
    assertEquals(result, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('isArchived - returns false for non-archived problem', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum', false); // In problems, not completed

    const result = await isArchived(workspace, 'two-sum', 'typescript');
    assertEquals(result, false);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('isArchived - returns false for nonexistent problem', async () => {
  const workspace = await createTestWorkspace();
  try {
    const result = await isArchived(workspace, 'nonexistent', 'typescript');
    assertEquals(result, false);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// listArchivedProblems tests
// =============================================================================

Deno.test('listArchivedProblems - returns empty array when no archived problems', async () => {
  const workspace = await createTestWorkspace();
  try {
    const result = await listArchivedProblems(workspace);
    assertEquals(result, []);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('listArchivedProblems - returns list of archived problems', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum', true);
    await createTestProblem(workspace, 'add-two-numbers', true);
    await createTestProblem(workspace, 'longest-substring', true);

    const result = await listArchivedProblems(workspace);
    assertEquals(result.length, 3);
    assertEquals(result.includes('two-sum'), true);
    assertEquals(result.includes('add-two-numbers'), true);
    assertEquals(result.includes('longest-substring'), true);

    // Should be sorted
    assertEquals(result, result.slice().sort());
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('listArchivedProblems - includes timestamped problems', async () => {
  const workspace = await createTestWorkspace();
  try {
    await createTestProblem(workspace, 'two-sum', true);
    await createTestProblem(workspace, 'two-sum-20260114-143045', true);

    const result = await listArchivedProblems(workspace);
    assertEquals(result.length, 2);
    assertEquals(result.includes('two-sum'), true);
    assertEquals(result.includes('two-sum-20260114-143045'), true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

// =============================================================================
// Integration tests
// =============================================================================

Deno.test('archive and unarchive - round trip preserves data', async () => {
  const workspace = await createTestWorkspace();
  try {
    // Create initial problem
    await createTestProblem(workspace, 'two-sum');

    // Archive it
    const archiveResult = await archiveProblem({
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    });
    assertEquals(archiveResult.success, true);

    // Verify it's archived
    const isArch = await isArchived(workspace, 'two-sum', 'typescript');
    assertEquals(isArch, true);

    // Unarchive it
    const unarchiveResult = await unarchiveProblem({
      workspaceRoot: workspace,
      slug: 'two-sum',
      language: 'typescript',
    });
    assertEquals(unarchiveResult.success, true);

    // Verify it's back in problems directory
    const backInProblems = await pathExists(join(workspace, 'problems', 'two-sum'));
    assertEquals(backInProblems, true);

    // Verify files still exist
    const solutionExists = await pathExists(
      join(workspace, 'problems', 'two-sum', 'solution.ts'),
    );
    assertEquals(solutionExists, true);
  } finally {
    await cleanupWorkspace(workspace);
  }
});

Deno.test('multiple archive operations with timestamp collision handling', async () => {
  const workspace = await createTestWorkspace();
  try {
    // Create and archive three versions of the same problem
    for (let i = 0; i < 3; i++) {
      await createTestProblem(workspace, 'two-sum');
      const result = await archiveProblem({
        workspaceRoot: workspace,
        slug: 'two-sum',
        language: 'typescript',
      });
      assertEquals(result.success, true);

      // First archive shouldn't have collision, others should
      if (i === 0) {
        assertEquals(result.collisionHandled, false);
      } else {
        assertEquals(result.collisionHandled, true);
      }

      // Delay to ensure different timestamps (1100ms to guarantee different seconds)
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    // List archived problems
    const archived = await listArchivedProblems(workspace);
    assertEquals(archived.length, 3);

    // All should start with 'two-sum'
    for (const slug of archived) {
      assertEquals(slug.startsWith('two-sum'), true);
    }
  } finally {
    await cleanupWorkspace(workspace);
  }
});
