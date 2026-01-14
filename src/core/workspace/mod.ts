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
 * - Type-safe path resolution for workspace directories and problem files
 * - Language-specific file naming conventions
 * - Path validation and security checks
 * - Performance optimizations through caching
 *
 * ## Security
 *
 * All path operations include validation to prevent:
 * - Path traversal attacks
 * - Null byte injection
 * - Invalid characters in paths
 *
 * ## Usage
 *
 * @example
 * ```ts
 * import {
 *   getWorkspacePaths,
 *   getProblemPaths,
 *   type WorkspacePaths
 * } from './core/workspace/mod.ts';
 *
 * // Get workspace structure
 * const workspace = getWorkspacePaths('/home/user/workspace');
 * console.log(workspace.problems); // /home/user/workspace/problems
 *
 * // Get paths for a specific problem
 * const config = { rootDir: '/home/user/workspace', language: 'typescript' };
 * const problemPaths = getProblemPaths(config, 'two-sum');
 * console.log(problemPaths.solutionFile); // /home/user/workspace/problems/two-sum/solution.ts
 * ```
 *
 * @module core/workspace
 */

export * from './types.ts';
export * from './files.ts';
export * from './manager.ts';
