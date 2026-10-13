/**
 * Teaching Script Validator
 *
 * Validates teaching scripts against the DSL specification defined in
 * docs/specs/done/deno-rewrite/ai-teaching-system/tasks.md (ATS-002).
 *
 * The validator ensures that:
 * - All required metadata fields are present and valid
 * - Steps array is non-empty with valid step objects
 * - Step types are `intro` or `pre_prompt`; retired step types and the
 *   `trigger` and `keywords` fields produce warnings, not errors
 * - All validation errors are aggregated for helpful feedback
 *
 * @module core/ai/validator
 */

import {
  combineValidationResults,
  createValidationResult,
  type ValidationResult,
  validateArray,
  validateDifficulty,
  validateString,
} from '../../utils/validation.ts';
import { RETIRED_STEP_TYPES, TEACHING_STEP_TYPES, type TeachingScript } from './types.ts';

/**
 * Result of validating a teaching script. Warnings name retired DSL features
 * that are skipped when the script loads.
 */
export interface TeachingScriptValidationResult extends ValidationResult {
  warnings: string[];
}

/**
 * Validate teaching script metadata fields
 */
function validateScriptMetadata(script: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate id: non-empty string
  if (!('id' in script)) {
    errors.push('id is required');
  } else {
    const idResult = validateString(script.id, 'id', { allowEmpty: false });
    if (!idResult.valid) errors.push(...idResult.errors);
  }

  // Validate title: non-empty string
  if (!('title' in script)) {
    errors.push('title is required');
  } else {
    const titleResult = validateString(script.title, 'title', { allowEmpty: false });
    if (!titleResult.valid) errors.push(...titleResult.errors);
  }

  // Validate difficulty: valid Difficulty enum value
  if (!('difficulty' in script)) {
    errors.push('difficulty is required');
  } else {
    const difficultyResult = validateDifficulty(script.difficulty);
    if (!difficultyResult.valid) errors.push(...difficultyResult.errors);
  }

  // Validate tags: array of non-empty strings
  if (!('tags' in script)) {
    errors.push('tags is required');
  } else {
    const tagsResult = validateArray(script.tags, 'tags', (item) =>
      validateString(item, 'tag', { allowEmpty: false }),
    );
    if (!tagsResult.valid) errors.push(...tagsResult.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a single teaching step
 */
function validateStep(step: unknown, index: number): TeachingScriptValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `steps[${index}]`;

  if (!step || typeof step !== 'object') {
    return { valid: false, errors: [`${prefix} must be an object`], warnings };
  }

  const stepObj = step as Record<string, unknown>;

  if (!('type' in stepObj)) {
    errors.push(`${prefix}.type is required`);
  } else if (typeof stepObj.type !== 'string') {
    errors.push(`${prefix}.type must be a string`);
  } else if ((RETIRED_STEP_TYPES as readonly string[]).includes(stepObj.type)) {
    warnings.push(`${prefix}: '${stepObj.type}' steps are no longer supported and are ignored`);
  } else if (!(TEACHING_STEP_TYPES as readonly string[]).includes(stepObj.type)) {
    errors.push(`${prefix}.type must be one of: ${TEACHING_STEP_TYPES.join(', ')}`);
  }

  if (!('content' in stepObj)) {
    errors.push(`${prefix}.content is required`);
  } else {
    const contentResult = validateString(stepObj.content, `${prefix}.content`, {
      allowEmpty: false,
    });
    if (!contentResult.valid) errors.push(...contentResult.errors);
  }

  const retiredStep = warnings.length > 0;
  for (const field of ['trigger', 'keywords']) {
    if (!retiredStep && field in stepObj) {
      warnings.push(`${prefix}.${field} is no longer supported and is ignored`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate steps array
 */
function validateSteps(script: Record<string, unknown>): TeachingScriptValidationResult {
  const errors: string[] = [];

  // Check steps exists and is an array
  if (!('steps' in script)) {
    errors.push('steps is required');
    return { valid: false, errors, warnings: [] };
  }

  if (!Array.isArray(script.steps)) {
    errors.push('steps must be an array');
    return { valid: false, errors, warnings: [] };
  }

  // Check steps is non-empty
  if (script.steps.length === 0) {
    errors.push('steps must have at least one step');
    return { valid: false, errors, warnings: [] };
  }

  const warnings: string[] = [];
  for (let i = 0; i < script.steps.length; i++) {
    const stepResult = validateStep(script.steps[i], i);
    errors.push(...stepResult.errors);
    warnings.push(...stepResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a teaching script against the DSL specification.
 *
 * Validates all required fields and step types. Returns all errors, plus a
 * warning for each retired DSL feature the script still uses.
 *
 * @param script - The script object to validate (typically from parsed YAML)
 * @returns ValidationResult with all errors aggregated
 *
 * @example
 * ```typescript
 * const result = validateTeachingScript(parsedYaml);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateTeachingScript(script: unknown): TeachingScriptValidationResult {
  if (!script || typeof script !== 'object' || Array.isArray(script)) {
    return { valid: false, errors: ['script must be an object'], warnings: [] };
  }

  const scriptObj = script as Record<string, unknown>;
  const metadataResult = validateScriptMetadata(scriptObj);
  const stepsResult = validateSteps(scriptObj);

  return {
    ...combineValidationResults(metadataResult, stepsResult),
    warnings: stepsResult.warnings,
  };
}

/**
 * Type guard to check if a value is a valid TeachingScript.
 *
 * This performs validation and narrows the type if successful.
 *
 * @param value - The value to check
 * @returns true if value is a valid TeachingScript
 */
export function isValidTeachingScript(value: unknown): value is TeachingScript {
  const result = validateTeachingScript(value);
  return result.valid;
}
