/**
 * Example of Phase 3 command implementation using PMS-020 integration
 *
 * This demonstrates the clean, simple import pattern that Phase 3
 * implementers can now use without knowing internal module structure.
 */

import {
  // All APIs from a single import!
  ProblemManager,
  initWorkspace,
  generateProblemFiles,
  type Problem,
  type Config,
} from '../src/core/mod.ts';

/**
 * Example: Challenge command implementation
 */
async function challengeCommand(
  config: Config,
  difficulty?: 'easy' | 'medium' | 'hard',
): Promise<Problem> {
  // 1. Initialize problem manager
  const manager = new ProblemManager();
  await manager.init();

  // 2. Get a random problem with filters
  const query = difficulty ? { difficulty } : {};
  const problem = manager.getRandom(query);

  if (!problem) {
    throw new Error('No problems found matching criteria');
  }

  // 3. Generate files in workspace
  const result = await generateProblemFiles({
    problem,
    workspaceRoot: config.workspace,
    language: config.language,
    templateStyle: config.preferences.templateStyle,
    overwritePolicy: 'skip', // Don't overwrite existing work
  });

  console.log(`✅ Started challenge: ${problem.title}`);
  console.log(`📁 Files generated: ${result.filesCreated.length}`);

  return problem;
}

/**
 * Example: Init command implementation
 */
async function initCommand(workspacePath: string): Promise<void> {
  // Single import for workspace operations
  await initWorkspace(workspacePath);
  console.log(`✅ Workspace initialized at: ${workspacePath}`);
}

/**
 * Example: List command implementation
 */
async function listCommand(tag?: string): Promise<Problem[]> {
  const manager = new ProblemManager();
  await manager.init();

  const query = tag ? { tags: [tag] } : {};
  const result = manager.list(query);

  console.log(`Found ${result.total} problems`);
  return result.problems;
}

// Example usage (not executed, just for demonstration)
if (import.meta.main) {
  console.log('This is a demonstration file, not meant to be executed directly.');
  console.log('It shows how Phase 3 commands can use PMS-020 integration.');
}
