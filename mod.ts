/**
 * Algo Trainer - Modern CLI tool for algorithm practice
 *
 * Main module export for the Algo Trainer application.
 * This file serves as the primary entry point for the library.
 *
 * @module mod
 */

// Core type exports
export * from "./src/types/index.ts";

// Core functionality exports
export * from "./src/core/config/manager.ts";
export * from "./src/core/problem/manager.ts";
export * from "./src/core/workspace/manager.ts";

// Utility exports
export * from "./src/utils/output.ts";
export * from "./src/utils/validation.ts";

// CLI exports for programmatic use
export * from "./src/cli/main.ts";
