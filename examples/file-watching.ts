/**
 * Example: File Watching in Workspace
 *
 * This example demonstrates how to use the FileWatcher to monitor
 * changes in a workspace and react to file modifications.
 *
 * Run with:
 * deno run --allow-read --allow-write examples/file-watching.ts
 */

import { join } from '@std/path';
import { createWorkspaceWatcher } from '../src/core/workspace/watcher.ts';
import { initWorkspace } from '../src/core/workspace/manager.ts';

// Create a temporary workspace for this demo
const tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-demo-' });
const workspaceRoot = join(tempDir, 'demo-workspace');

console.log('📁 Creating demo workspace at:', workspaceRoot);
await initWorkspace(workspaceRoot);

// Create the file watcher
const watcher = createWorkspaceWatcher(workspaceRoot, {
  debounceMs: 500, // Wait 500ms before firing events
});

// Track statistics
let eventCount = 0;

// Listen to all events for logging
watcher.on('all', (event) => {
  eventCount++;
  console.log(`\n📝 Event #${eventCount}:`);
  console.log(`   Type: ${event.kind}`);
  console.log(`   Category: ${event.category}`);
  console.log(`   Path: ${event.path}`);
  console.log(`   Time: ${event.timestamp.toISOString()}`);
});

// React specifically to problem changes
watcher.on('problem-changed', (_event) => {
  console.log('🎯 Problem file changed! Time to reload problem data...');
});

// React specifically to template changes
watcher.on('template-changed', (_event) => {
  console.log('📋 Template changed! Time to regenerate files...');
});

// Start watching
console.log('\n👀 Starting file watcher...');
console.log('   Watching for changes in problems and templates directories');
console.log('   Press Ctrl+C to stop\n');
watcher.start();

// Simulate some file operations after a delay
setTimeout(async () => {
  console.log('\n🔧 Simulating file operations...\n');

  // Create a problem file
  const problemFile = join(workspaceRoot, 'problems', 'two-sum', 'solution.ts');
  await Deno.mkdir(join(workspaceRoot, 'problems', 'two-sum'), { recursive: true });
  await Deno.writeTextFile(problemFile, '// Solution for Two Sum\n');

  // Modify it after a bit
  setTimeout(async () => {
    await Deno.writeTextFile(
      problemFile,
      '// Solution for Two Sum\nfunction twoSum(nums: number[], target: number): number[] {\n  // TODO\n}\n',
    );
  }, 1000);

  // Create a template file
  setTimeout(async () => {
    const templateFile = join(workspaceRoot, 'templates', 'custom.tpl');
    await Deno.writeTextFile(templateFile, '{{PROBLEM_TITLE}}\n');
  }, 2000);
}, 1000);

// Cleanup on exit
const cleanup = async () => {
  console.log('\n\n🛑 Stopping watcher...');
  watcher.stop();
  console.log('✅ Watcher stopped');

  console.log('🗑️  Cleaning up demo workspace...');
  try {
    await Deno.remove(tempDir, { recursive: true });
    console.log('✅ Cleanup complete');
  } catch (_error) {
    console.log('⚠️  Cleanup failed (may need manual removal)');
  }

  Deno.exit(0);
};

// Handle Ctrl+C
Deno.addSignalListener('SIGINT', cleanup);

// Auto-cleanup after demo (10 seconds)
setTimeout(() => {
  console.log('\n⏰ Demo timeout reached');
  cleanup();
}, 10000);
