#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Example demonstration of archive operations
 *
 * This script demonstrates how to use the archive and unarchive functions
 * to move problems between active and completed directories.
 */

import { join } from '@std/path';
import { ProblemManager } from '../src/core/problem/manager.ts';
import {
  archiveProblem,
  isArchived,
  listArchivedProblems,
  unarchiveProblem,
} from '../src/core/workspace/archive.ts';
import { generateProblemFiles } from '../src/core/workspace/generation.ts';
import { initWorkspace } from '../src/core/workspace/manager.ts';

async function demo() {
  // Create a temporary workspace for demonstration
  const tempDir = await Deno.makeTempDir({ prefix: 'archive-demo-' });
  const workspaceRoot = join(tempDir, 'workspace');

  console.log('🔧 Initializing workspace...');
  await initWorkspace(workspaceRoot);

  // Initialize problem manager and get a problem
  console.log('📚 Loading problems...');
  const manager = new ProblemManager();
  await manager.init();
  const problem = manager.getBySlug('two-sum');

  if (!problem) {
    console.error('❌ Problem not found');
    return;
  }

  // Generate problem files
  console.log(`📝 Generating files for: ${problem.title}`);
  await generateProblemFiles({
    problem,
    workspaceRoot,
    language: 'typescript',
    templateStyle: 'minimal',
  });

  console.log(`✅ Files created in: ${workspaceRoot}/problems/${problem.slug}`);

  // Archive the problem
  console.log('\n📦 Archiving problem...');
  const archiveResult = await archiveProblem({
    workspaceRoot,
    slug: problem.slug,
    language: 'typescript',
  });

  console.log(`✅ Archived to: ${archiveResult.archivedTo}`);
  console.log(`   From: ${archiveResult.from}`);

  // Check if archived
  const archived = await isArchived(workspaceRoot, problem.slug, 'typescript');
  console.log(`\n🔍 Is archived: ${archived}`);

  // List all archived problems
  const archivedList = await listArchivedProblems(workspaceRoot);
  console.log(`\n📋 Archived problems: ${archivedList.join(', ')}`);

  // Restore the problem
  console.log('\n🔄 Restoring problem...');
  const restoreResult = await unarchiveProblem({
    workspaceRoot,
    slug: problem.slug,
    language: 'typescript',
  });

  console.log(`✅ Restored to: ${restoreResult.restoredTo}`);
  console.log(`   From: ${restoreResult.from}`);

  // Demonstrate collision handling
  console.log('\n⚠️  Demonstrating collision handling...');

  // Generate and archive again
  await generateProblemFiles({
    problem,
    workspaceRoot,
    language: 'typescript',
    templateStyle: 'minimal',
  });

  // Create an archived version first
  await archiveProblem({
    workspaceRoot,
    slug: problem.slug,
    language: 'typescript',
  });

  console.log('✅ First archive created');

  // Generate and try to archive again (should add timestamp)
  await generateProblemFiles({
    problem,
    workspaceRoot,
    language: 'typescript',
    templateStyle: 'minimal',
  });

  const collisionResult = await archiveProblem({
    workspaceRoot,
    slug: problem.slug,
    language: 'typescript',
  });

  console.log(`✅ Collision handled: ${collisionResult.collisionHandled}`);
  console.log(`   Archived to: ${collisionResult.archivedTo}`);

  // List all archived versions
  const finalList = await listArchivedProblems(workspaceRoot);
  console.log(`\n📋 Final archived problems: ${finalList.join(', ')}`);

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await Deno.remove(tempDir, { recursive: true });
  console.log('✅ Demo complete!');
}

// Run the demo
if (import.meta.main) {
  try {
    await demo();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    Deno.exit(1);
  }
}
