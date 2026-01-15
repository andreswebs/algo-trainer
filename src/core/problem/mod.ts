/**
 * Problem Management System - Core Problem Module
 *
 * Re-exports all public APIs for the problem management system.
 *
 * ## Primary API: ProblemManager
 *
 * The main entry point for working with problems is the `ProblemManager` class.
 * It provides CRUD operations, searching, filtering, and random problem selection.
 *
 * @example Basic Usage
 * ```ts
 * import { ProblemManager } from './core/problem/mod.ts';
 *
 * // Initialize the manager
 * const manager = new ProblemManager();
 * await manager.init();
 *
 * // Get a problem
 * const problem = manager.getBySlug('two-sum');
 * console.log(problem.title); // "Two Sum"
 *
 * // Search for problems
 * const result = manager.list({
 *   difficulty: 'easy',
 *   tags: ['array', 'hash-table']
 * });
 *
 * // Get a random problem for challenges
 * const random = manager.getRandom({ difficulty: 'medium' });
 * ```
 *
 * ## Template Rendering
 *
 * Templates are used to generate problem files (solution, test, README).
 * The template system is typically consumed through workspace generation APIs.
 *
 * @example Template Usage
 * ```ts
 * import { renderTemplate, type TemplateContext } from './core/problem/mod.ts';
 *
 * const context: TemplateContext = {
 *   problem: myProblem,
 *   language: 'typescript',
 *   style: 'documented',
 *   includeImports: true,
 *   includeTypes: true,
 * };
 *
 * const code = await renderTemplate(context, 'solution');
 * ```
 *
 * ## Key Exports
 *
 * - **ProblemManager** - Main API for problem CRUD and queries
 * - **ProblemDatabase** - Lower-level database access (usually not needed)
 * - **renderTemplate**, **renderAllTemplates** - Template rendering functions
 * - **normalizeProblem**, **parseProblemFile** - Parsing utilities
 * - **escapeForTemplate** - Template escaping utilities
 * - Types: **Problem**, **ProblemQuery**, **TemplateContext**, etc.
 *
 * @module core/problem
 */

export * from './types.ts';
export * from './escaping.ts';
export * from './parser.ts';
export * from './database.ts';
export * from './manager.ts';
export { renderTemplate, renderAllTemplates } from './templates.ts';
