/**
 * Teaching Script Validator
 *
 * Validates teaching scripts against the DSL specification defined in
 * .specs/deno-rewrite/ai-teaching-system/tasks.md (ATS-002).
 *
 * The validator ensures that:
 * - All required metadata fields are present and valid
 * - Steps array is non-empty with valid step objects
 * - Step type constraints are enforced (triggers, keywords)
 * - All validation errors are aggregated for helpful feedback
 *
 * @module core/ai/validator
 */

import type { TeachingScript, TeachingStepType } from './types.ts';
import {
  combineValidationResults,
  createValidationResult,
  validateArray,
  validateDifficulty,
  validateString,
  validateSupportedLanguage,
  type ValidationResult,
} from '../../utils/validation.ts';

/**
 * Valid teaching step types
 */
const VALID_STEP_TYPES: TeachingStepType[] = [
  'intro',
  'pre_prompt',
  'on_run',
  'after_success',
  'on_request',
  'hint',
];

/**
 * Step types that should not have triggers
 */
const NO_TRIGGER_TYPES: TeachingStepType[] = [
  'intro',
  'pre_prompt',
  'after_success',
];

/**
 * Step types that require triggers
 */
const REQUIRES_TRIGGER_TYPES: TeachingStepType[] = ['hint'];

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
    const tagsResult = validateArray(
      script.tags,
      'tags',
      (item) => validateString(item, 'tag', { allowEmpty: false }),
    );
    if (!tagsResult.valid) errors.push(...tagsResult.errors);
  }

  // Validate language: valid SupportedLanguage enum value
  if (!('language' in script)) {
    errors.push('language is required');
  } else {
    const languageResult = validateSupportedLanguage(script.language);
    if (!languageResult.valid) errors.push(...languageResult.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a single teaching step
 */
function validateStep(step: unknown, index: number): ValidationResult {
  const errors: string[] = [];
  const prefix = `steps[${index}]`;

  // Check if step is an object
  if (!step || typeof step !== 'object') {
    return createValidationResult(false, [`${prefix} must be an object`]);
  }

  const stepObj = step as Record<string, unknown>;

  // Validate type: required and must be valid TeachingStepType
  if (!('type' in stepObj)) {
    errors.push(`${prefix}.type is required`);
  } else if (typeof stepObj.type !== 'string') {
    errors.push(`${prefix}.type must be a string`);
  } else if (!VALID_STEP_TYPES.includes(stepObj.type as TeachingStepType)) {
    errors.push(
      `${prefix}.type must be one of: ${VALID_STEP_TYPES.join(', ')}`,
    );
  }

  const stepType = stepObj.type as TeachingStepType;

  // Validate content: required non-empty string
  if (!('content' in stepObj)) {
    errors.push(`${prefix}.content is required`);
  } else {
    const contentResult = validateString(stepObj.content, `${prefix}.content`, {
      allowEmpty: false,
    });
    if (!contentResult.valid) errors.push(...contentResult.errors);
  }

  // Validate trigger constraints based on step type
  if ('trigger' in stepObj && stepObj.trigger !== undefined) {
    // Check trigger is a string
    const triggerResult = validateString(stepObj.trigger, `${prefix}.trigger`, {
      allowEmpty: false,
    });
    if (!triggerResult.valid) {
      errors.push(...triggerResult.errors);
    }

    // Check if step type should not have triggers
    if (NO_TRIGGER_TYPES.includes(stepType)) {
      errors.push(
        `${prefix}: '${stepType}' steps must not have triggers (they are always shown)`,
      );
    }
  }

  // Check if required triggers are missing
  if (REQUIRES_TRIGGER_TYPES.includes(stepType)) {
    if (!('trigger' in stepObj) || !stepObj.trigger) {
      errors.push(`${prefix}: '${stepType}' steps must have a trigger`);
    }
  }

  // Validate keywords constraints
  if ('keywords' in stepObj && stepObj.keywords !== undefined) {
    // Keywords only valid for on_request type
    if (stepType !== 'on_request') {
      errors.push(
        `${prefix}: 'keywords' are only valid for 'on_request' steps`,
      );
    }

    // Validate keywords is array of strings
    const keywordsResult = validateArray(
      stepObj.keywords,
      `${prefix}.keywords`,
      (item) => validateString(item, 'keyword', { allowEmpty: false }),
    );
    if (!keywordsResult.valid) errors.push(...keywordsResult.errors);
  }

  // on_request steps must have keywords
  if (stepType === 'on_request') {
    if (!('keywords' in stepObj) || !stepObj.keywords) {
      errors.push(`${prefix}: 'on_request' steps must have keywords`);
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate steps array
 */
function validateSteps(script: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Check steps exists and is an array
  if (!('steps' in script)) {
    errors.push('steps is required');
    return createValidationResult(false, errors);
  }

  if (!Array.isArray(script.steps)) {
    errors.push('steps must be an array');
    return createValidationResult(false, errors);
  }

  // Check steps is non-empty
  if (script.steps.length === 0) {
    errors.push('steps must have at least one step');
    return createValidationResult(false, errors);
  }

  // Validate each step
  for (let i = 0; i < script.steps.length; i++) {
    const stepResult = validateStep(script.steps[i], i);
    if (!stepResult.valid) {
      errors.push(...stepResult.errors);
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a teaching script against the DSL specification.
 *
 * Validates all required fields and enforces step type constraints.
 * Returns all validation errors to provide helpful feedback.
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
export function validateTeachingScript(script: unknown): ValidationResult {
  // Check if script is an object (but not an array or null)
  if (!script || typeof script !== 'object' || Array.isArray(script)) {
    return createValidationResult(false, ['script must be an object']);
  }

  const scriptObj = script as Record<string, unknown>;

  // Validate metadata and steps
  const metadataResult = validateScriptMetadata(scriptObj);
  const stepsResult = validateSteps(scriptObj);

  // Combine all validation results
  return combineValidationResults(metadataResult, stepsResult);
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
