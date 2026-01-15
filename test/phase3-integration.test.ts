/**
 * Integration test for Phase 3 - PMS-020
 *
 * This test verifies that Phase 3 implementers can easily import and use
 * the PMS APIs without needing to know internal module structure.
 */

import { assertEquals, assertExists } from '@std/assert';

// Test that all key APIs are available from the single import point
import {
  // Problem Management
  ProblemManager,
  ProblemDatabase,
  
  // Workspace Management
  initWorkspace,
  getWorkspaceStructure,
  isWorkspaceInitialized,
  validateWorkspace,
  
  // File Generation
  generateProblemFiles,
  problemExists,
  getProblemMetadata,
  
  // Archive Operations
  archiveProblem,
  
  // Template Rendering (less commonly needed, but available)
  renderTemplate,
  renderAllTemplates,
  
  // Types (verify they're exported)
  type Problem,
  type ProblemQuery,
  type WorkspaceStructure,
  type GenerateProblemFilesOptions,
  type SupportedLanguage,
  type Difficulty,
} from '../src/core/mod.ts';

Deno.test('PMS-020: Core module exports all required APIs', () => {
  // Verify problem management exports
  assertExists(ProblemManager);
  assertExists(ProblemDatabase);
  
  // Verify workspace management exports
  assertExists(initWorkspace);
  assertExists(getWorkspaceStructure);
  assertExists(isWorkspaceInitialized);
  assertExists(validateWorkspace);
  
  // Verify file generation exports
  assertExists(generateProblemFiles);
  assertExists(problemExists);
  assertExists(getProblemMetadata);
  
  // Verify archive exports
  assertExists(archiveProblem);
  
  // Verify template exports
  assertExists(renderTemplate);
  assertExists(renderAllTemplates);
});

Deno.test('PMS-020: ProblemManager can be initialized and used', async () => {
  const manager = new ProblemManager();
  await manager.init();
  
  // Verify basic operations work
  const allProblems = manager.list({});
  assertExists(allProblems);
  assertEquals(typeof allProblems.total, 'number');
  
  // Verify we have some problems
  assertEquals(allProblems.problems.length > 0, true, 'Should have problems');
  
  // Verify problem has expected structure
  const problem = allProblems.problems[0];
  assertExists(problem.id);
  assertExists(problem.slug);
  assertExists(problem.title);
  assertExists(problem.difficulty);
});

Deno.test('PMS-020: Workspace operations work through single import', async () => {
  const tempDir = await Deno.makeTempDir();
  
  try {
    // Test workspace initialization
    await initWorkspace(tempDir);
    
    // Verify workspace structure
    const structure = getWorkspaceStructure(tempDir);
    assertExists(structure.root);
    assertExists(structure.problems);
    assertExists(structure.completed);
    
    // Verify initialization check
    const initialized = await isWorkspaceInitialized(tempDir);
    assertEquals(initialized, true);
    
    // Verify directories exist
    const problemsDir = await Deno.stat(structure.problems);
    assertEquals(problemsDir.isDirectory, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('PMS-020: File generation works through single import', async () => {
  const tempDir = await Deno.makeTempDir();
  
  try {
    // Initialize workspace
    await initWorkspace(tempDir);
    
    // Get a problem
    const manager = new ProblemManager();
    await manager.init();
    const problem = manager.list({ limit: 1 }).problems[0];
    assertExists(problem);
    
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
    assertExists(result.filesCreated);
    assertEquals(result.filesCreated.length > 0, true, 'Should generate files');
    assertEquals(result.success, true, 'Generation should succeed');
    
    // Verify problem exists check
    const exists = await problemExists(tempDir, problem.slug, language);
    assertEquals(exists, true);
    
    // Verify metadata
    const metadata = await getProblemMetadata(tempDir, problem.slug, language);
    assertExists(metadata);
    assertEquals(metadata.slug, problem.slug);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('PMS-020: Typical Phase 3 command pattern works', async () => {
  // Simulate a simple challenge command implementation
  const tempDir = await Deno.makeTempDir();
  
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
      assertExists(allEasy);
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
      assertEquals(result.success, true);
      assertEquals(
        result.filesCreated.length >= 3,
        true,
        'Should create solution, test, and README',
      );
      
      // Verify all generated files exist
      for (const file of result.filesCreated) {
        const fileInfo = await Deno.stat(file);
        assertEquals(fileInfo.isFile, true, `File should exist: ${file}`);
      }
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test('PMS-020: Sub-module imports still work', async () => {
  // Verify that direct imports from sub-modules still work
  // (for Phase 3 implementers who want more specific imports)
  
  const { ProblemManager: PM1 } = await import('../src/core/problem/mod.ts');
  const { initWorkspace: iw1 } = await import('../src/core/workspace/mod.ts');
  
  assertExists(PM1);
  assertExists(iw1);
  
  // Verify they're the same as the top-level exports
  assertEquals(PM1, ProblemManager);
  assertEquals(iw1, initWorkspace);
});
