/**
 * Core Module - Problem Management System Integration
 *
 * This module provides the main entry point for Phase 3 CLI command implementations.
 * It re-exports all public APIs from the problem management and workspace modules.
 *
 * ## Quick Start for Phase 3 Implementers
 *
 * This module makes it easy to work with problems and workspaces without needing
 * to know the internal module structure. Everything you need is exported from here.
 *
 * ### Basic Usage Pattern
 *
 * ```ts
 * import {
 *   ProblemManager,
 *   initWorkspace,
 *   generateProblemFiles,
 * } from './core/mod.ts';
 *
 * // 1. Initialize the problem manager
 * const manager = new ProblemManager();
 * await manager.init();
 *
 * // 2. Get a problem
 * const problem = manager.getBySlug('two-sum');
 *
 * // 3. Set up workspace
 * await initWorkspace('/path/to/workspace');
 *
 * // 4. Generate problem files
 * const result = await generateProblemFiles({
 *   problem,
 *   workspaceRoot: '/path/to/workspace',
 *   language: 'typescript',
 *   templateStyle: 'documented',
 * });
 * ```
 *
 * ### Common Patterns for Commands
 *
 * #### Challenge Command (Start a new problem)
 *
 * ```ts
 * import { ProblemManager, generateProblemFiles } from './core/mod.ts';
 * import type { Config } from './types/global.ts';
 *
 * async function startChallenge(config: Config, difficulty?: string) {
 *   // Initialize manager
 *   const manager = new ProblemManager();
 *   await manager.init();
 *
 *   // Find a random problem
 *   const query = difficulty ? { difficulty: difficulty as Difficulty } : {};
 *   const problem = manager.getRandom(query);
 *
 *   if (!problem) {
 *     throw new Error('No problems found');
 *   }
 *
 *   // Generate files
 *   const result = await generateProblemFiles({
 *     problem,
 *     workspaceRoot: config.workspace,
 *     language: config.language,
 *     templateStyle: config.preferences.templateStyle,
 *   });
 *
 *   return { problem, files: result };
 * }
 * ```
 *
 * #### List Command (Search/filter problems)
 *
 * ```ts
 * import { ProblemManager } from './core/mod.ts';
 * import type { ProblemQuery } from './types/global.ts';
 *
 * async function listProblems(query: ProblemQuery) {
 *   const manager = new ProblemManager();
 *   await manager.init();
 *
 *   // Search with filters
 *   const result = manager.list(query);
 *
 *   return result.problems;
 * }
 * ```
 *
 * #### Init Command (Initialize workspace)
 *
 * ```ts
 * import { initWorkspace, getWorkspaceStructure } from './core/mod.ts';
 *
 * async function initializeWorkspace(path: string) {
 *   // Create workspace directories
 *   await initWorkspace(path);
 *
 *   // Get structure for reference
 *   const structure = getWorkspaceStructure(path);
 *
 *   return structure;
 * }
 * ```
 *
 * ### Error Handling
 *
 * All operations throw typed errors that can be caught and handled:
 *
 * ```ts
 * import { ProblemManager } from './core/mod.ts';
 * import { ProblemError, WorkspaceError } from './utils/errors.ts';
 *
 * try {
 *   const manager = new ProblemManager();
 *   await manager.init();
 *   const problem = manager.getBySlug('invalid-slug');
 * } catch (error) {
 *   if (error instanceof ProblemError) {
 *     console.error('Problem error:', error.message);
 *   } else if (error instanceof WorkspaceError) {
 *     console.error('Workspace error:', error.message);
 *   }
 * }
 * ```
 *
 * ### Available APIs
 *
 * #### Problem Management (`ProblemManager`)
 * - `getById(id: string): Problem | null` - Get problem by ID
 * - `getBySlug(slug: string): Problem | null` - Get problem by slug
 * - `list(query?: ProblemQuery): ProblemQueryResult` - Search/filter problems
 * - `search(text: string): Problem[]` - Full-text search
 * - `getRandom(query?: ProblemQuery): Problem | null` - Get random problem
 * - `add(problem: Problem): Promise<void>` - Add custom problem
 * - `update(idOrSlug: string, patch: Partial<Problem>): Promise<void>` - Update problem
 * - `remove(idOrSlug: string): Promise<void>` - Remove problem
 *
 * #### Workspace Management
 * - `initWorkspace(root: string): Promise<void>` - Initialize workspace
 * - `getWorkspaceStructure(root: string): WorkspaceStructure` - Get workspace paths
 * - `isWorkspaceInitialized(root: string): Promise<boolean>` - Check if initialized
 * - `validateWorkspace(root: string): Promise<void>` - Validate workspace
 *
 * #### File Generation
 * - `generateProblemFiles(options: GenerateProblemFilesOptions): Promise<GenerationResult>` - Generate all files
 * - `problemExists(workspaceRoot: string, slug: string): Promise<boolean>` - Check if problem exists
 * - `getProblemMetadata(workspaceRoot: string, slug: string): Promise<ProblemWorkspaceMetadata>` - Get metadata
 *
 * #### Archive Operations
 * - `archiveProblem(options: ArchiveOptions): Promise<ArchiveResult>` - Archive completed problem
 * - `unarchiveProblem(options: UnarchiveOptions): Promise<void>` - Restore archived problem
 *
 * ### Type Imports
 *
 * Common types are also available through this module:
 *
 * ```ts
 * import type {
 *   Problem,
 *   ProblemQuery,
 *   Difficulty,
 *   SupportedLanguage,
 *   WorkspaceStructure,
 *   GenerateProblemFilesOptions,
 * } from './core/mod.ts';
 * ```
 *
 * @module core
 */

// Re-export everything from problem management
export * from './problem/mod.ts';

// Re-export everything from workspace management
export * from './workspace/mod.ts';

// Re-export commonly needed types from global.ts for convenience
export type {
  Problem,
  ProblemQuery,
  ProblemQueryResult,
  Difficulty,
  SupportedLanguage,
  WorkspaceStructure,
  Config,
  UserPreferences,
} from '../types/global.ts';
