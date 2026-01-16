/**
 * AI Teaching System Type Definitions
 *
 * This module defines all TypeScript types for the teaching system DSL and runtime.
 * The teaching system provides intelligent, proactive coaching for users solving
 * algorithmic problems through a YAML-based DSL (trainer.yaml).
 *
 * @module core/ai/types
 */

import type { Difficulty, SupportedLanguage } from '../../types/global.ts';

/**
 * Teaching step types define when and how guidance is provided to users.
 *
 * - `intro`: Introduction shown when a problem starts
 * - `pre_prompt`: Pre-coding guidance shown before user begins coding
 * - `on_run`: Triggered after code execution based on results
 * - `after_success`: Triggered after all tests pass
 * - `on_request`: Triggered by explicit user request with keyword matching
 * - `hint`: Contextual hints based on code analysis
 */
export type TeachingStepType =
  | 'intro'
  | 'pre_prompt'
  | 'on_run'
  | 'after_success'
  | 'on_request'
  | 'hint';

/**
 * A single teaching step in a teaching script.
 *
 * Steps define guidance provided at specific points in the problem-solving workflow.
 * Each step has a type that determines when it's shown, content in markdown format,
 * and optional trigger conditions or keywords.
 */
export interface TeachingStep {
  /**
   * Type of teaching step determining when it's shown
   */
  type: TeachingStepType;

  /**
   * Markdown content with variable substitution support.
   *
   * Supported variables:
   * - `{{title}}` - Problem title
   * - `{{difficulty}}` - Problem difficulty
   * - `{{attempts}}` - Number of attempts
   */
  content: string;

  /**
   * Optional JavaScript-like expression for conditional triggering.
   *
   * Supported operations:
   * - String methods: `includes()`, `match()`, `startsWith()`, `endsWith()`
   * - Comparisons: `===`, `!==`, `>`, `<`, `>=`, `<=`
   * - Logical: `&&`, `||`, `!`
   * - Property access on context variables
   *
   * Context variables:
   * - `code` - User's current code
   * - `stdout` - Execution output
   * - `stderr` - Execution errors
   * - `passed` - Test result boolean
   * - `attempts` - Attempt count number
   *
   * @example
   * "attempts > 2 && passed === false"
   * "code.includes('for') && !code.includes('Map')"
   * "stderr.match(/TypeError|undefined/)"
   */
  trigger?: string;

  /**
   * Keywords for matching user requests.
   *
   * Only valid for `on_request` type steps. When a user asks for help,
   * their query is matched against these keywords to find relevant guidance.
   *
   * @example
   * ["optimization", "faster", "time complexity"]
   */
  keywords?: string[];
}

/**
 * A complete teaching script for a problem.
 *
 * Teaching scripts define all guidance, hints, and feedback for a specific problem.
 * They are typically stored as YAML files (trainer.yaml) in problem directories.
 */
export interface TeachingScript {
  /**
   * Unique identifier for the problem (matches problem ID)
   */
  id: string;

  /**
   * Human-readable title of the problem
   */
  title: string;

  /**
   * Problem difficulty level
   */
  difficulty: Difficulty;

  /**
   * Problem tags/categories for topic-specific guidance
   */
  tags: string[];

  /**
   * Target programming language for this script
   */
  language: SupportedLanguage;

  /**
   * Ordered list of teaching steps
   *
   * Steps are evaluated in order, and the first matching step is returned
   * for types that support triggers (on_run, hint).
   */
  steps: TeachingStep[];
}

/**
 * User session state tracking progress through a problem.
 *
 * The session tracks all user activity and progress to enable intelligent,
 * context-aware guidance based on struggle patterns and history.
 */
export interface TeachingSessionState {
  /**
   * Unique identifier for the problem being worked on
   */
  problemId: string;

  /**
   * Number of code execution attempts
   */
  attempts: number;

  /**
   * Whether all tests have passed
   */
  passed: boolean;

  /**
   * Output from last execution (stdout)
   */
  lastOutput: string;

  /**
   * Error output from last execution (stderr)
   */
  lastError: string;

  /**
   * History of user's code submissions for pattern analysis
   */
  codeHistory: string[];

  /**
   * Number of hints viewed by the user
   */
  hintsViewed: number;

  /**
   * When the problem was started
   */
  startedAt: Date;
}

/**
 * Context information available for trigger evaluation.
 *
 * This context is passed to trigger expressions to determine if a teaching
 * step should be shown. All context variables are accessible in trigger
 * expressions.
 */
export interface TriggerContext {
  /**
   * User's current code
   */
  code: string;

  /**
   * Standard output from last execution
   */
  stdout: string;

  /**
   * Standard error from last execution
   */
  stderr: string;

  /**
   * Whether all tests passed
   */
  passed: boolean;

  /**
   * Number of execution attempts
   */
  attempts: number;
}

/**
 * Result of a single test case execution.
 *
 * Test results provide detailed information about individual test case
 * outcomes for more precise feedback.
 */
export interface TestResult {
  /**
   * Name or identifier of the test case
   */
  name: string;

  /**
   * Whether the test passed
   */
  passed: boolean;

  /**
   * Input used for the test case
   */
  input?: unknown;

  /**
   * Expected output for the test case
   */
  expected?: unknown;

  /**
   * Actual output produced by the code
   */
  actual?: unknown;

  /**
   * Error message if the test failed
   */
  error?: string;

  /**
   * Execution time in milliseconds
   */
  executionTime?: number;
}

/**
 * Result of code execution with test results.
 *
 * Execution results contain all information about a code run, including
 * output, errors, test outcomes, and execution metadata. This information
 * is used for trigger evaluation and generating contextual feedback.
 */
export interface ExecutionResult {
  /**
   * Standard output from execution
   */
  stdout: string;

  /**
   * Standard error from execution
   */
  stderr: string;

  /**
   * Whether all tests passed
   */
  passed: boolean;

  /**
   * Process exit code
   */
  exitCode: number;

  /**
   * Detailed results for individual test cases
   *
   * Optional but enables more specific feedback based on which
   * tests passed or failed.
   */
  testResults?: TestResult[];
}
