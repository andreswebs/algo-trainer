/**
 * AI Teaching System Session State Management
 *
 * This module provides session state tracking for the teaching system,
 * enabling intelligent, context-aware guidance based on user progress
 * and struggle patterns.
 *
 * @module core/ai/session
 */

import type { ExecutionResult, TeachingSessionState, TriggerContext } from './types.ts';

/**
 * Manages session state for a teaching session.
 *
 * The TeachingSession class tracks all user activity and progress through
 * a problem, including attempts, executions, code history, and hints viewed.
 * This information enables the teaching engine to provide contextual,
 * adaptive guidance.
 *
 * @example
 * ```typescript
 * const session = new TeachingSession('two-sum');
 *
 * // Record an attempt
 * session.recordAttempt('function twoSum(nums, target) { ... }');
 *
 * // Record execution result
 * session.recordExecution({
 *   stdout: 'Test passed',
 *   stderr: '',
 *   passed: true,
 *   exitCode: 0
 * });
 *
 * // Get context for trigger evaluation
 * const context = session.getTriggerContext('function twoSum...');
 * ```
 */
export class TeachingSession {
  private state: TeachingSessionState;

  /**
   * Create a new teaching session.
   *
   * @param problemId - Unique identifier for the problem
   */
  constructor(problemId: string) {
    this.state = {
      problemId,
      attempts: 0,
      passed: false,
      lastOutput: '',
      lastError: '',
      codeHistory: [],
      hintsViewed: 0,
      startedAt: new Date(),
    };
  }

  /**
   * Get the current session state.
   *
   * Returns a copy of the state to prevent external modification.
   *
   * @returns Current session state
   */
  getState(): TeachingSessionState {
    return {
      ...this.state,
      codeHistory: [...this.state.codeHistory],
      startedAt: new Date(this.state.startedAt),
    };
  }

  /**
   * Record a code execution attempt.
   *
   * Increments the attempt counter and adds the code to the history.
   * This should be called whenever the user runs their code.
   *
   * @param code - The code that was executed
   */
  recordAttempt(code: string): void {
    this.state.attempts++;
    this.state.codeHistory.push(code);
  }

  /**
   * Record the results of a code execution.
   *
   * Updates the session state with execution output, errors, and test results.
   * This should be called after each code run with the execution results.
   *
   * @param result - The execution result containing stdout, stderr, and test results
   */
  recordExecution(result: ExecutionResult): void {
    this.state.lastOutput = result.stdout;
    this.state.lastError = result.stderr;

    if (result.passed) {
      this.markPassed();
    }
  }

  /**
   * Mark the problem as passed.
   *
   * Sets the passed flag to true. This is called automatically by
   * recordExecution when all tests pass.
   */
  markPassed(): void {
    this.state.passed = true;
  }

  /**
   * Increment the hints viewed counter.
   *
   * This should be called whenever the user views a hint to track
   * how much assistance they've needed.
   */
  incrementHintsViewed(): void {
    this.state.hintsViewed++;
  }

  /**
   * Reset the session for a new problem.
   *
   * Clears all state and reinitializes for the given problem.
   * This allows the same session object to be reused for multiple problems.
   *
   * @param problemId - Unique identifier for the new problem
   */
  reset(problemId: string): void {
    this.state = {
      problemId,
      attempts: 0,
      passed: false,
      lastOutput: '',
      lastError: '',
      codeHistory: [],
      hintsViewed: 0,
      startedAt: new Date(),
    };
  }

  /**
   * Get trigger context for the given code.
   *
   * Creates a TriggerContext object from the current session state
   * and provided code. This context is used by the trigger evaluator
   * to determine which teaching steps should be shown.
   *
   * @param code - The current user code
   * @returns Trigger context for evaluation
   */
  getTriggerContext(code: string): TriggerContext {
    return {
      code,
      stdout: this.state.lastOutput,
      stderr: this.state.lastError,
      passed: this.state.passed,
      attempts: this.state.attempts,
    };
  }
}
