/**
<<<<<<< HEAD
 * Problem-related types for parsing and storage
 *
 * This module defines the raw JSON format for problems as stored on disk,
 * and the related TypeScript types for parse results.
=======
 * Template type definitions for the Problem Management System.
 *
 * This module defines the template format, placeholders, and related types
 * used for generating problem files in the workspace.
>>>>>>> 7a27124 (pms-009 add template format)
 *
 * @module core/problem/types
 */

<<<<<<< HEAD
import type { Difficulty, Example, Problem } from '../../types/global.ts';

/**
 * Raw metadata as stored in JSON files (dates are strings)
 */
export interface RawProblemMetadata {
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  sourceId?: string;
}

/**
 * Raw problem as stored in JSON files
 *
 * This represents the on-disk format where:
 * - Optional array fields may be missing (will be normalized to [])
 * - Metadata date fields are ISO-8601 strings (will be converted to Date)
 */
export interface RawProblemJson {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  examples: Example[];
  constraints?: string[];
  hints?: string[];
  tags?: string[];
  companies?: string[];
  leetcodeUrl?: string;
  metadata?: RawProblemMetadata;
}

/**
 * Result of parsing a problem file
 */
export interface ParseResult {
  success: true;
  problem: Problem;
}

/**
 * Parse error with details
 */
export interface ParseError {
  success: false;
  errors: string[];
  path?: string;
}

/**
 * Union type for parse results
 */
export type ParseOutcome = ParseResult | ParseError;
=======
import type { Problem, SupportedLanguage, UserPreferences } from '../../types/global.ts';

/**
 * Template file kinds available for generation
 */
export type TemplateKind = 'solution' | 'test' | 'readme';

/**
 * Template style aliases (maps to UserPreferences.templateStyle)
 */
export type TemplateStyle = UserPreferences['templateStyle'];

/**
 * Template file extension for raw template files
 */
export const TEMPLATE_FILE_EXTENSION = '.tpl';

/**
 * Template placeholder delimiters
 */
export const PLACEHOLDER_DELIMITERS = {
  open: '{{',
  close: '}}',
} as const;

/**
 * Available template placeholders with their descriptions.
 *
 * These placeholders are replaced during template rendering with actual problem data.
 *
 * ## Problem Data Placeholders
 * - `{{PROBLEM_TITLE}}` - Human-readable title of the problem
 * - `{{PROBLEM_SLUG}}` - URL-friendly slug (kebab-case)
 * - `{{PROBLEM_ID}}` - Unique problem identifier
 * - `{{PROBLEM_DIFFICULTY}}` - Difficulty level (easy, medium, hard)
 * - `{{PROBLEM_DESCRIPTION}}` - Full problem description (may contain markdown)
 *
 * ## Problem Content Placeholders
 * - `{{EXAMPLES}}` - Formatted examples with input/output
 * - `{{CONSTRAINTS}}` - List of constraints
 * - `{{HINTS}}` - List of hints (for README only, not solution files)
 * - `{{TAGS}}` - Comma-separated list of tags
 * - `{{COMPANIES}}` - Comma-separated list of companies (if available)
 *
 * ## Template Context Placeholders
 * - `{{LANGUAGE}}` - Target programming language
 * - `{{LANGUAGE_DISPLAY}}` - Display name of the language (e.g., "TypeScript")
 * - `{{TEMPLATE_STYLE}}` - Template style being used
 * - `{{FILE_EXTENSION}}` - File extension for the language (e.g., ".ts")
 *
 * ## Code Generation Placeholders
 * - `{{FUNCTION_NAME}}` - Generated function name (camelCase from slug)
 * - `{{CLASS_NAME}}` - Generated class name (PascalCase from slug)
 * - `{{DATE}}` - Current date in ISO format
 * - `{{YEAR}}` - Current year
 *
 * ## URLs
 * - `{{LEETCODE_URL}}` - LeetCode problem URL (if available, empty otherwise)
 */
export const TEMPLATE_PLACEHOLDERS = {
  // Problem data
  PROBLEM_TITLE: 'PROBLEM_TITLE',
  PROBLEM_SLUG: 'PROBLEM_SLUG',
  PROBLEM_ID: 'PROBLEM_ID',
  PROBLEM_DIFFICULTY: 'PROBLEM_DIFFICULTY',
  PROBLEM_DESCRIPTION: 'PROBLEM_DESCRIPTION',

  // Problem content
  EXAMPLES: 'EXAMPLES',
  CONSTRAINTS: 'CONSTRAINTS',
  HINTS: 'HINTS',
  TAGS: 'TAGS',
  COMPANIES: 'COMPANIES',

  // Template context
  LANGUAGE: 'LANGUAGE',
  LANGUAGE_DISPLAY: 'LANGUAGE_DISPLAY',
  TEMPLATE_STYLE: 'TEMPLATE_STYLE',
  FILE_EXTENSION: 'FILE_EXTENSION',

  // Code generation
  FUNCTION_NAME: 'FUNCTION_NAME',
  CLASS_NAME: 'CLASS_NAME',
  DATE: 'DATE',
  YEAR: 'YEAR',

  // URLs
  LEETCODE_URL: 'LEETCODE_URL',
} as const;

export type TemplatePlaceholder = keyof typeof TEMPLATE_PLACEHOLDERS;

/**
 * Language-specific configuration for template rendering
 */
export interface LanguageConfig {
  /** Language identifier */
  language: SupportedLanguage;
  /** Display name for the language */
  displayName: string;
  /** File extension for solution files */
  extension: string;
  /** File extension for test files (if different) */
  testExtension?: string;
  /** Single-line comment prefix */
  commentPrefix: string;
  /** Multi-line comment start */
  blockCommentStart: string;
  /** Multi-line comment end */
  blockCommentEnd: string;
}

/**
 * Language configurations for all supported languages
 */
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  typescript: {
    language: 'typescript',
    displayName: 'TypeScript',
    extension: '.ts',
    testExtension: '.test.ts',
    commentPrefix: '//',
    blockCommentStart: '/**',
    blockCommentEnd: ' */',
  },
  javascript: {
    language: 'javascript',
    displayName: 'JavaScript',
    extension: '.js',
    testExtension: '.test.js',
    commentPrefix: '//',
    blockCommentStart: '/**',
    blockCommentEnd: ' */',
  },
  python: {
    language: 'python',
    displayName: 'Python',
    extension: '.py',
    testExtension: '_test.py',
    commentPrefix: '#',
    blockCommentStart: '"""',
    blockCommentEnd: '"""',
  },
  java: {
    language: 'java',
    displayName: 'Java',
    extension: '.java',
    testExtension: 'Test.java',
    commentPrefix: '//',
    blockCommentStart: '/**',
    blockCommentEnd: ' */',
  },
  cpp: {
    language: 'cpp',
    displayName: 'C++',
    extension: '.cpp',
    testExtension: '_test.cpp',
    commentPrefix: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  rust: {
    language: 'rust',
    displayName: 'Rust',
    extension: '.rs',
    testExtension: '.rs',
    commentPrefix: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  go: {
    language: 'go',
    displayName: 'Go',
    extension: '.go',
    testExtension: '_test.go',
    commentPrefix: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
};

/**
 * Template file path resolution
 */
export interface TemplatePathInfo {
  /** Base template directory (e.g., src/data/templates) */
  baseDir: string;
  /** Target language */
  language: SupportedLanguage;
  /** Template style */
  style: TemplateStyle;
  /** Template kind */
  kind: TemplateKind;
}

/**
 * Returns the relative path to a template file.
 *
 * Template path format: `<baseDir>/<language>/<style>/<kind>.tpl`
 *
 * @example
 * getTemplatePath({ baseDir: 'src/data/templates', language: 'typescript', style: 'documented', kind: 'solution' })
 * // Returns: 'src/data/templates/typescript/documented/solution.tpl'
 */
export function getTemplatePath(info: TemplatePathInfo): string {
  return `${info.baseDir}/${info.language}/${info.style}/${info.kind}${TEMPLATE_FILE_EXTENSION}`;
}

/**
 * Context data available during template rendering
 */
export interface TemplateContext {
  /** The problem being rendered */
  problem: Problem;
  /** Target language configuration */
  languageConfig: LanguageConfig;
  /** Template style */
  style: TemplateStyle;
  /** Current date */
  date: Date;
}

/**
 * Resolved placeholder values for template rendering
 */
export type PlaceholderValues = Record<TemplatePlaceholder, string>;

/**
 * Template rendering options
 */
export interface TemplateRenderOptions {
  /** If true, throw on unknown placeholders. Default: true */
  strictPlaceholders?: boolean;
  /** Custom placeholder values to override computed values */
  overrides?: Partial<PlaceholderValues>;
}

/**
 * Result of template rendering
 */
export interface TemplateRenderResult {
  /** Rendered content */
  content: string;
  /** Placeholders that were replaced */
  replacedPlaceholders: TemplatePlaceholder[];
  /** Unknown placeholders found (if strictPlaceholders is false) */
  unknownPlaceholders?: string[];
}
>>>>>>> 7a27124 (pms-009 add template format)
