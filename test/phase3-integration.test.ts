/**
 * Integration test for Phase 3 - PMS-020
 *
 * This test verifies that Phase 3 implementers can easily import and use
 * the PMS APIs without needing to know internal module structure.
 */

// Test that all key APIs are available from the single import point
import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Difficulty as _Difficulty,
  type GenerateProblemFilesOptions as _GenerateProblemFilesOptions,
  // Types (imported to verify they're exported, hence the underscore prefix)
  type Problem as _Problem,
  type ProblemQuery as _ProblemQuery,
  type WorkspaceStructure as _WorkspaceStructure,
  // Archive Operations
  archiveProblem,
  // File Generation
  generateProblemFiles,
  getProblemMetadata,
  getWorkspaceStructure,
  // Workspace Management
  initWorkspace,
  isWorkspaceInitialized,
  ProblemDatabase,
  // Problem Management
  ProblemManager,
  problemExists,
  renderAllTemplates,
  // Template Rendering (less commonly needed, but available)
  renderTemplate,
  type SupportedLanguage,
  validateWorkspace,
} from '../src/core/mod.ts';

type _ExportedTypes = [
  _Difficulty,
  _GenerateProblemFilesOptions,
  _Problem,
  _ProblemQuery,
  _WorkspaceStructure,
];

test('PMS-020: Core module exports all required APIs', () => {
  // Verify problem management exports
  ok(ProblemManager != null);
  ok(ProblemDatabase != null);

  // Verify workspace management exports
  ok(initWorkspace != null);
  ok(getWorkspaceStructure != null);
  ok(isWorkspaceInitialized != null);
  ok(validateWorkspace != null);

  // Verify file generation exports
  ok(generateProblemFiles != null);
  ok(problemExists != null);
  ok(getProblemMetadata != null);

  // Verify archive exports
  ok(archiveProblem != null);

  // Verify template exports
  ok(renderTemplate != null);
  ok(renderAllTemplates != null);
});

test('PMS-020: ProblemManager can be initialized and used', async () => {
  const manager = new ProblemManager();
  await manager.init();

  // Verify basic operations work
  const allProblems = manager.list({});
  ok(allProblems != null);
  deepStrictEqual(typeof allProblems.total, 'number');

  // Verify we have some problems
  deepStrictEqual(allProblems.problems.length > 0, true, 'Should have problems');

  // Verify problem has expected structure
  const problem = allProblems.problems[0];
  ok(problem.id != null);
  ok(problem.slug != null);
  ok(problem.title != null);
  ok(problem.difficulty != null);
});

test('PMS-020: Workspace operations work through single import', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));

  try {
    // Test workspace initialization
    await initWorkspace(tempDir);

    // Verify workspace structure
    const structure = getWorkspaceStructure(tempDir);
    ok(structure.root != null);
    ok(structure.problems != null);
    ok(structure.completed != null);

    // Verify initialization check
    const initialized = await isWorkspaceInitialized(tempDir);
    deepStrictEqual(initialized, true);

    // Verify directories exist
    const problemsDir = await stat(structure.problems);
    deepStrictEqual(problemsDir.isDirectory(), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('PMS-020: File generation works through single import', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));

  try {
    // Initialize workspace
    await initWorkspace(tempDir);

    // Get a problem
    const manager = new ProblemManager();
    await manager.init();
    const problem = manager.list({ limit: 1 }).problems[0];
    ok(problem != null);

    const language: SupportedLanguage = 'typescript';

    // Generate files
    const result = await generateProblemFiles({
      problem,
      workspaceRoot: tempDir,
      language,
      templateStyle: 'documented',
      overwritePolicy: 'skip',
    });

    // Verify result
    ok(result.filesCreated != null);
    deepStrictEqual(result.filesCreated.length > 0, true, 'Should generate files');
    deepStrictEqual(result.success, true, 'Generation should succeed');

    // Verify problem exists check
    const exists = await problemExists(tempDir, problem.slug, language);
    deepStrictEqual(exists, true);

    // Verify metadata
    const metadata = await getProblemMetadata(tempDir, problem.slug, language);
    ok(metadata != null);
    deepStrictEqual(metadata.slug, problem.slug);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('PMS-020: Typical Phase 3 command pattern works', async () => {
  // Simulate a simple challenge command implementation
  const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));

  try {
    // Step 1: Initialize workspace
    await initWorkspace(tempDir);

    // Step 2: Initialize problem manager
    const manager = new ProblemManager();
    await manager.init();

    // Step 3: Get a random problem with filters
    const problem = manager.getRandom({ difficulty: 'easy' });

    // If no problems match, list should still work
    if (!problem) {
      const allEasy = manager.list({ difficulty: 'easy' });
      // No assertion needed - just verify it doesn't throw
      ok(allEasy != null);
    } else {
      // Step 4: Generate files
      const result = await generateProblemFiles({
        problem,
        workspaceRoot: tempDir,
        language: 'typescript',
        templateStyle: 'minimal',
        overwritePolicy: 'skip',
      });

      // Verify generation succeeded
      deepStrictEqual(result.success, true);
      deepStrictEqual(
        result.filesCreated.length >= 3,
        true,
        'Should create solution, test, and README',
      );

      // Verify all generated files exist
      for (const file of result.filesCreated) {
        const fileInfo = await stat(file);
        deepStrictEqual(fileInfo.isFile(), true, `File should exist: ${file}`);
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('PMS-020: Sub-module imports still work', async () => {
  // Verify that direct imports from sub-modules still work
  // (for Phase 3 implementers who want more specific imports)

  const { ProblemManager: PM1 } = await import('../src/core/problem/mod.ts');
  const { initWorkspace: iw1 } = await import('../src/core/workspace/mod.ts');

  ok(PM1 != null);
  ok(iw1 != null);

  // Verify they're the same as the top-level exports
  deepStrictEqual(PM1, ProblemManager);
  deepStrictEqual(iw1, initWorkspace);
});
