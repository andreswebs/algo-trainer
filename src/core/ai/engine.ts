/**
 * Teaching Engine Core
 *
 * Loads the teaching script for a problem and provides its guidance: the
 * introduction and pre-coding advice that `challenge` shows.
 *
 * @module core/ai/engine
 */

import { createErrorContext, TeachingError } from '../../utils/errors.ts';
import { findScriptPath, findTeachingScript, loadAndValidateScript } from './parser.ts';
import type { TeachingScript, TeachingStep, TeachingStepType } from './types.ts';

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
   * Total number of teaching steps
   */
  stepCount: number;
}

/**
 * Teaching engine for one problem.
 *
 * @example
 * ```typescript
 * const engine = new TeachingEngine('two-sum');
 * const loaded = await engine.loadScript('./problems/two-sum');
 * if (loaded) {
 *   console.log(engine.getIntroduction());
 * }
 * ```
 */
export class TeachingEngine {
  private currentScript: TeachingScript | null = null;
  private problemSlug: string;

  /**
   * Create a new teaching engine.
   *
   * @param problemSlug - Slug of the problem, used to find user and built-in scripts
   */
  constructor(problemSlug: string) {
    this.problemSlug = problemSlug;
  }

  /**
   * Load and validate a teaching script.
   *
   * Loads trainer.yaml from the problem directory, or else the user's custom
   * or built-in script for the problem (see `findTeachingScript`).
   * The script is validated before being stored.
   *
   * @param problemPath - Path to the problem directory
   * @returns true if script was loaded successfully, false if no script found
   * @throws {TeachingError} If script loading or validation fails
   */
  async loadScript(problemPath: string): Promise<boolean> {
    try {
      const scriptPath =
        (await findScriptPath(problemPath)) ?? (await findTeachingScript(this.problemSlug));

      if (!scriptPath) {
        // No script found - this is not an error
        this.currentScript = null;
        return false;
      }

      const script = await loadAndValidateScript(scriptPath);

      if (!script) {
        // Should not happen since the path was found to exist
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
   * Clear the currently loaded script.
   */
  reset(): void {
    this.currentScript = null;
  }

  /**
   * Get metadata about the currently loaded script.
   *
   * @returns Script metadata, or null if no script is loaded
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
      stepCount: this.currentScript.steps.length,
    };
  }

  /**
   * Get the introduction message shown when a problem starts.
   *
   * @returns Formatted introduction content, or null if none
   */
  getIntroduction(): string | null {
    return this.getFirstStepContent('intro');
  }

  /**
   * Get the pre-coding guidance shown before the user begins coding.
   *
   * @returns Formatted pre-prompt content, or null if none
   */
  getPrePrompt(): string | null {
    return this.getFirstStepContent('pre_prompt');
  }

  private getFirstStepContent(type: TeachingStepType): string | null {
    const step: TeachingStep | undefined = this.currentScript?.steps.find(
      (candidate) => candidate.type === type,
    );
    return step ? this.formatContent(step.content) : null;
  }

  /**
   * Substitute the `{{title}}` and `{{difficulty}}` variables.
   */
  private formatContent(content: string): string {
    if (!this.currentScript) {
      return content;
    }

    return content
      .replace(/\{\{title\}\}/g, this.currentScript.title)
      .replace(/\{\{difficulty\}\}/g, this.currentScript.difficulty);
  }
}
