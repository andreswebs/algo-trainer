/**
 * Algo Trainer - Modern CLI tool for algorithm practice
 *
 * Main module export for the Algo Trainer application.
 * This file serves as the primary entry point for the library.
 *
 * @module mod
 */

// Core type exports
export * from './lib/types/index.ts';

// Core functionality exports
export * from './lib/config/manager.ts';
export * from './lib/core/problem/manager.ts';
export * from './lib/core/workspace/manager.ts';

// Utility exports
export * from './lib/utils/output.ts';
export * from './lib/utils/validation.ts';

// CLI exports for programmatic use
export * from './lib/cli/main.ts';
