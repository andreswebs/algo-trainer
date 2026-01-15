/**
 * Workspace management utilities.
 *
 * Provides types and helpers for managing the local workspace structure,
 * file paths, and operations.
 *
 * ## Overview
 *
 * This module handles all workspace path resolution according to PMS-013 specification.
 * It provides:
 * - Workspace initialization and validation
 * - Type-safe path resolution for workspace directories and problem files
 * - Problem file generation (solution, test, README)
 * - Archive/complete operations
 * - File watching capabilities
 * - Language-specific file naming conventions
 * - Path validation and security checks
 *
 * ## Phase 3 Quick Start
 *
 * ### Initialize a Workspace
 *
 * ```ts
 * import { initWorkspace, getWorkspaceStructure } from './core/workspace/mod.ts';
 *
 * // Create workspace directories
 * await initWorkspace('/home/user/workspace');
 *
 * // Get structure info
 * const structure = getWorkspaceStructure('/home/user/workspace');
 * console.log(structure.problems);  // /home/user/workspace/problems
 * console.log(structure.completed); // /home/user/workspace/completed
 * ```
 *
 * ### Generate Problem Files
 *
 * ```ts
 * import { generateProblemFiles } from './core/workspace/mod.ts';
 * import { ProblemManager } from '../problem/mod.ts';
 *
 * const manager = new ProblemManager();
 * await manager.init();
 * const problem = manager.getBySlug('two-sum');
 *
 * const result = await generateProblemFiles({
 *   problem,
 *   workspaceRoot: '/home/user/workspace',
 *   language: 'typescript',
 *   templateStyle: 'documented',
 *   overwritePolicy: 'skip', // or 'overwrite' or 'error'
 * });
 *
 * console.log('Generated files:', result.files);
 * ```
 *
 * ### Archive Completed Problems
 *
 * ```ts
 * import { archiveProblem } from './core/workspace/mod.ts';
 *
 * const result = await archiveProblem({
 *   workspaceRoot: '/home/user/workspace',
 *   problemSlug: 'two-sum',
 * });
 *
 * console.log('Archived to:', result.archivedPath);
 * ```
 *
 * ## Security
 *
 * All path operations include validation to prevent:
 * - Path traversal attacks
 * - Null byte injection
 * - Invalid characters in paths
 *
 * ## Key Exports
 *
 * ### Workspace Management
 * - **initWorkspace** - Create workspace directory structure
 * - **getWorkspaceStructure** - Get workspace paths
 * - **isWorkspaceInitialized** - Check if workspace is set up
 * - **validateWorkspace** - Validate workspace structure
 *
 * ### File Generation
 * - **generateProblemFiles** - Generate solution/test/README files
 * - **problemExists** - Check if problem already exists
 * - **getProblemMetadata** - Get problem metadata
 *
 * ### Path Utilities
 * - **getWorkspacePaths** - Get workspace directory paths
 * - **getProblemPaths** - Get paths for a specific problem
 * - **getSolutionFileName** - Get language-specific solution file name
 *
 * ### Archive Operations
 * - **archiveProblem** - Move completed problem to archive
 * - **unarchiveProblem** - Restore archived problem
 *
 * ### File Watching
 * - **watchProblemFiles** - Watch problem files for changes
 *
 * @module core/workspace
 */

export * from './types.ts';
export * from './files.ts';
export * from './manager.ts';
export * from './generation.ts';
export * from './archive.ts';
export * from './watcher.ts';
