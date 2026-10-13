/**
 * AI Teaching System Type Definitions
 *
 * This module defines the TypeScript types for the teaching script DSL (trainer.yaml).
 * A teaching script holds problem-specific guidance that `challenge` shows when a
 * problem starts.
 *
 * @module core/ai/types
 */

import type { Difficulty } from '../../types/global.ts';

/**
 * Teaching step types define when guidance is shown.
 *
 * - `intro`: Introduction shown when a problem starts
 * - `pre_prompt`: Pre-coding guidance shown before the user begins coding
 */
export const TEACHING_STEP_TYPES = ['intro', 'pre_prompt'] as const;

export type TeachingStepType = (typeof TEACHING_STEP_TYPES)[number];

/**
 * Step types from earlier versions of the DSL. Scripts that still contain them
 * load normally; these steps are skipped.
 */
export const RETIRED_STEP_TYPES = ['hint', 'on_run', 'after_success', 'on_request'] as const;

/**
 * A single teaching step in a teaching script.
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
   */
  content: string;
}

/**
 * A complete teaching script for a problem.
 *
 * Teaching scripts are stored as YAML files (trainer.yaml): in a workspace problem
 * directory, in the user's data directory, or built in.
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
   * Problem tags/categories
   */
  tags: string[];

  /**
   * Ordered list of teaching steps
   */
  steps: TeachingStep[];
}
