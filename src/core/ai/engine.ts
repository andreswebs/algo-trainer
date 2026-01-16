/**
 * Teaching Engine Core
 *
 * Main engine class that orchestrates the AI teaching system. Provides
 * intelligent, proactive coaching for users solving algorithmic problems
 * by managing teaching scripts, evaluating triggers, and delivering
 * contextual guidance based on user progress.
 *
 * @module core/ai/engine
 */

import type {
  ExecutionResult,
  TeachingScript,
  TeachingStep,
  TeachingStepType,
  TriggerContext,
} from './types.ts';
import { TeachingSession } from './session.ts';
import { evaluateTrigger } from './triggers.ts';
import { findScriptPath, loadAndValidateScript } from './parser.ts';
import { createErrorContext, TeachingError } from '../../utils/errors.ts';

/**
 * Script metadata information returned by getScriptInfo.
 */
export interface ScriptInfo {
  /**
   * Problem identifier
   */
  id: string;

  /**
   * Problem title
   */
  title: string;

  /**
   * Problem difficulty level
   */
  difficulty: string;

  /**
   * Problem tags/topics
   */
  tags: string[];

  /**
   * Target programming language
   */
  language: string;

  /**
   * Total number of teaching steps
   */
  stepCount: number;
}

/**
 * Main teaching engine that orchestrates the AI teaching system.
 *
 * The TeachingEngine manages teaching scripts, evaluates triggers, and provides
 * contextual guidance based on user progress. It integrates with TeachingSession
 * to track state and uses the trigger evaluator to determine when to show guidance.
 *
 * @example
 * ```typescript
 * const session = new TeachingSession('two-sum');
 * const engine = new TeachingEngine(session);
 *
 * // Load a teaching script
 * const loaded = await engine.loadScript('./problems/two-sum');
 * if (loaded) {
 *   // Get introduction
 *   const intro = engine.getIntroduction();
 *   console.log(intro);
 *
 *   // Process execution
 *   const feedback = engine.processExecution(userCode, executionResult);
 *   if (feedback) {
 *     console.log(feedback);
 *   }
 * }
 * ```
 */
export class TeachingEngine {
  private currentScript: TeachingScript | null = null;
  private session: TeachingSession;

  /**
   * Create a new teaching engine.
   *
   * @param session - Teaching session for state management
   */
  constructor(session: TeachingSession) {
    this.session = session;
  }

  /**
   * Load and validate a teaching script from a problem directory.
   *
   * Searches for trainer.yaml in the problem directory and loads it
   * if found. The script is validated before being stored.
   *
   * @param problemPath - Path to the problem directory
   * @returns true if script was loaded successfully, false if no script found
   * @throws {TeachingError} If script loading or validation fails
   *
   * @example
   * ```typescript
   * const loaded = await engine.loadScript('./problems/two-sum');
   * if (loaded) {
   *   console.log('Teaching script loaded successfully');
   * }
   * ```
   */
  async loadScript(problemPath: string): Promise<boolean> {
    try {
      // Find script path in problem directory
      const scriptPath = await findScriptPath(problemPath);

      if (!scriptPath) {
        // No script found - this is not an error
        this.currentScript = null;
        return false;
      }

      // Load and validate the script
      const script = await loadAndValidateScript(scriptPath);

      if (!script) {
        // Should not happen since findScriptPath already checked existence
        this.currentScript = null;
        return false;
      }

      this.currentScript = script;
      return true;
    } catch (error) {
      throw new TeachingError(
        'Failed to load teaching script',
        createErrorContext('TeachingEngine.loadScript', {
          problemPath,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Reset the engine state.
   *
   * Clears the currently loaded script. The session must be reset
   * separately if needed.
   */
  reset(): void {
    this.currentScript = null;
  }

  /**
   * Get metadata about the currently loaded script.
   *
   * @returns Script metadata if a script is loaded, null otherwise
   *
   * @example
   * ```typescript
   * const info = engine.getScriptInfo();
   * if (info) {
   *   console.log(`Script for: ${info.title}`);
   *   console.log(`Difficulty: ${info.difficulty}`);
   *   console.log(`Steps: ${info.stepCount}`);
   * }
   * ```
   */
  getScriptInfo(): ScriptInfo | null {
    if (!this.currentScript) {
      return null;
    }

    return {
      id: this.currentScript.id,
      title: this.currentScript.title,
      difficulty: this.currentScript.difficulty,
      tags: [...this.currentScript.tags],
      language: this.currentScript.language,
      stepCount: this.currentScript.steps.length,
    };
  }

  /**
   * Get introduction message for the problem.
   *
   * Returns the content of the first 'intro' step if present.
   * Introduction steps are shown when a problem starts and have no triggers.
   *
   * @returns Introduction content with formatted variables, or null if not available
   *
   * @example
   * ```typescript
   * const intro = engine.getIntroduction();
   * if (intro) {
   *   console.log(intro);
   * }
   * ```
   */
  getIntroduction(): string | null {
    const steps = this.getStepsByType('intro');
    if (steps.length === 0) {
      return null;
    }

    // Return the first intro step (typically only one)
    return this.formatContent(steps[0].content);
  }

  /**
   * Get pre-coding guidance message.
   *
   * Returns the content of the 'pre_prompt' step if present.
   * Pre-prompt steps provide guidance before the user begins coding.
   *
   * @returns Pre-prompt content with formatted variables, or null if not available
   *
   * @example
   * ```typescript
   * const prePrompt = engine.getPrePrompt();
   * if (prePrompt) {
   *   console.log(prePrompt);
   * }
   * ```
   */
  getPrePrompt(): string | null {
    const steps = this.getStepsByType('pre_prompt');
    if (steps.length === 0) {
      return null;
    }

    // Return the first pre_prompt step (typically only one)
    return this.formatContent(steps[0].content);
  }

  /**
   * Get a contextual hint based on the user's code.
   *
   * Evaluates 'hint' step triggers against the current code and session state.
   * Returns the first matching hint, or null if no hints match.
   *
   * Increments the hints viewed counter when a hint is returned.
   *
   * @param code - User's current code
   * @returns Hint content with formatted variables, or null if no matching hint
   *
   * @example
   * ```typescript
   * const hint = engine.getHint(userCode);
   * if (hint) {
   *   console.log('Hint:', hint);
   * } else {
   *   console.log('No hints available for current code');
   * }
   * ```
   */
  getHint(code: string): string | null {
    const steps = this.getStepsByType('hint');
    if (steps.length === 0) {
      return null;
    }

    const context = this.session.getTriggerContext(code);
    const matchingStep = this.findMatchingStep(steps, context);

    if (matchingStep) {
      this.session.incrementHintsViewed();
      return this.formatContent(matchingStep.content);
    }

    return null;
  }

  /**
   * Get success message after all tests pass.
   *
   * Returns the content of the 'after_success' step if present.
   * Success messages celebrate completion and may include additional insights.
   *
   * @returns Success message with formatted variables, or null if not available
   *
   * @example
   * ```typescript
   * if (allTestsPassed) {
   *   const successMsg = engine.getSuccessMessage();
   *   if (successMsg) {
   *     console.log(successMsg);
   *   }
   * }
   * ```
   */
  getSuccessMessage(): string | null {
    const steps = this.getStepsByType('after_success');
    if (steps.length === 0) {
      return null;
    }

    // Return the first success message (typically only one)
    return this.formatContent(steps[0].content);
  }

  /**
   * Handle explicit user request for help.
   *
   * Matches the user's query against keywords in 'on_request' steps.
   * Returns the first matching step's content.
   *
   * @param query - User's help request query
   * @returns Matched help content with formatted variables, or null if no match
   *
   * @example
   * ```typescript
   * const help = engine.handleRequest('how can I optimize this?');
   * if (help) {
   *   console.log(help);
   * }
   * ```
   */
  handleRequest(query: string): string | null {
    const steps = this.getStepsByType('on_request');
    if (steps.length === 0) {
      return null;
    }

    const lowerQuery = query.toLowerCase();

    // Find first step with matching keyword
    for (const step of steps) {
      if (step.keywords && step.keywords.length > 0) {
        const hasMatch = step.keywords.some((keyword) =>
          lowerQuery.includes(keyword.toLowerCase())
        );
        if (hasMatch) {
          return this.formatContent(step.content);
        }
      }
    }

    return null;
  }

  /**
   * Process code execution results and provide feedback.
   *
   * Updates the session state with execution results, including:
   * - Incrementing the attempt counter
   * - Adding the code to history
   * - Storing stdout/stderr output
   * - Updating the passed status
   *
   * Then evaluates 'on_run' step triggers to provide contextual feedback
   * based on the execution outcome.
   *
   * @param code - User's executed code
   * @param result - Execution result containing output, errors, and test results
   * @returns Feedback message with formatted variables, or null if no matching feedback
   *
   * @example
   * ```typescript
   * const feedback = engine.processExecution(userCode, {
   *   stdout: 'Test output...',
   *   stderr: '',
   *   passed: false,
   *   exitCode: 0
   * });
   * if (feedback) {
   *   console.log('Feedback:', feedback);
   * }
   * ```
   */
  processExecution(code: string, result: ExecutionResult): string | null {
    // Update session state with attempt and execution results
    this.session.recordAttempt(code);
    this.session.recordExecution(result);

    // Get on_run steps
    const steps = this.getStepsByType('on_run');
    if (steps.length === 0) {
      return null;
    }

    // Evaluate triggers against current context
    const context = this.session.getTriggerContext(code);
    const matchingStep = this.findMatchingStep(steps, context);

    if (matchingStep) {
      return this.formatContent(matchingStep.content);
    }

    return null;
  }

  /**
   * Get all steps of a specific type from the current script.
   *
   * @param type - Teaching step type to filter by
   * @returns Array of steps matching the type, empty array if no script loaded
   */
  private getStepsByType(type: TeachingStepType): TeachingStep[] {
    if (!this.currentScript) {
      return [];
    }

    return this.currentScript.steps.filter((step) => step.type === type);
  }

  /**
   * Find the first step that matches the given trigger context.
   *
   * Steps are evaluated in order. The first step with a matching trigger
   * (or no trigger) is returned. Steps without triggers always match.
   *
   * @param steps - Steps to evaluate
   * @param context - Trigger context for evaluation
   * @returns First matching step, or null if no match
   */
  private findMatchingStep(
    steps: TeachingStep[],
    context: TriggerContext,
  ): TeachingStep | null {
    for (const step of steps) {
      // Steps without triggers always match
      if (!step.trigger) {
        return step;
      }

      // Evaluate trigger expression
      try {
        if (evaluateTrigger(step.trigger, context)) {
          return step;
        }
      } catch (error) {
        // Log warning but continue checking other steps
        console.warn(
          `Failed to evaluate trigger: ${step.trigger}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return null;
  }

  /**
   * Format content by replacing variable placeholders.
   *
   * Supported variables:
   * - {{title}} - Problem title
   * - {{difficulty}} - Problem difficulty
   * - {{attempts}} - Number of attempts
   *
   * @param content - Content string with placeholders
   * @returns Formatted content with variables replaced
   */
  private formatContent(content: string): string {
    if (!this.currentScript) {
      return content;
    }

    const sessionState = this.session.getState();

    let formatted = content;

    // Replace script-level variables
    formatted = formatted.replace(/\{\{title\}\}/g, this.currentScript.title);
    formatted = formatted.replace(/\{\{difficulty\}\}/g, this.currentScript.difficulty);

    // Replace session-level variables
    formatted = formatted.replace(/\{\{attempts\}\}/g, String(sessionState.attempts));

    return formatted;
  }
}
