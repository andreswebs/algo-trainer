/**
 * Workspace types for the Problem Management System.
 * 
 * Defines the concrete structure of the user's workspace where problems
 * are solved, templates are stored, and configuration is kept.
 * 
 * @module core/workspace/types
 */

import type { SupportedLanguage } from '../../types/global.ts';

/**
 * Concrete layout of the workspace directory structure
 * 
 * This interface maps the high-level `WorkspaceStructure` from global types
 * to concrete file system paths and naming conventions.
 */
export interface WorkspacePaths {
  /** Root directory of the workspace */
  root: string;
  
  /** 
   * Directory for active problems being solved 
   * Path: `<root>/problems`
   */
  problems: string;
  
  /** 
   * Directory for completed/archived problems
   * Path: `<root>/completed`
   */
  completed: string;
  
  /** 
   * Directory for user templates
   * Path: `<root>/templates`
   */
  templates: string;
  
  /** 
   * Directory for workspace configuration
   * Path: `<root>/config`
   */
  config: string;
}

/**
 * File paths for a specific problem within the workspace
 */
export interface ProblemWorkspacePaths {
  /**
   * Root directory for the specific problem
   * Path: `<root>/problems/<slug>`
   */
  dir: string;
  
  /**
   * Path to the solution file
   * Path: `<dir>/solution.<ext>`
   */
  solutionFile: string;
  
  /**
   * Path to the test file
   * Path: `<dir>/solution_test.<ext>` (or language specific)
   */
  testFile: string;
  
  /**
   * Path to the problem README
   * Path: `<dir>/README.md`
   */
  readmeFile: string;
  
  /**
   * Path to the problem metadata/tracking file (hidden)
   * Path: `<dir>/.problem.json`
   */
  metadataFile: string;
}

/**
 * Configuration for workspace path resolution
 */
export interface WorkspacePathConfig {
  /** The workspace root directory */
  rootDir: string;
  /** The programming language (affects file extensions) */
  language: SupportedLanguage;
}

/**
 * Rules for resolving file paths
 */
export const WORKSPACE_RULES = {
  /** Directory names */
  dirs: {
    problems: 'problems',
    completed: 'completed',
    templates: 'templates',
    config: 'config',
  },
  
  /** File names */
  files: {
    readme: 'README.md',
    metadata: '.problem.json',
    solutionBase: 'solution',
    testBase: 'solution_test', // Default, may vary by language
  },
} as const;
