/**
 * Input validation utilities
 *
 * Provides comprehensive validation functions for user input,
 * configuration, and data integrity.
 *
 * @module utils/validation
 */

import { ValidationError } from './errors.ts';
import type { Difficulty, SupportedLanguage } from '../types/global.ts';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Create a validation result
 */
export function createValidationResult(
  valid: boolean,
  errors: string[] = [],
): ValidationResult {
  return { valid, errors };
}

/**
 * Validate that a value is not null or undefined
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string,
): ValidationResult {
  if (value === null || value === undefined) {
    return createValidationResult(false, [`${fieldName} is required`]);
  }
  return createValidationResult(true);
}

/**
 * Validate string input
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {},
): ValidationResult {
  const {
    minLength = 0,
    maxLength = Number.MAX_SAFE_INTEGER,
    pattern,
    allowEmpty = true,
  } = options;
  const errors: string[] = [];

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return createValidationResult(false, errors);
  }

  if (!allowEmpty && value.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  }

  if (value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }

  if (value.length > maxLength) {
    errors.push(
      `${fieldName} must be no more than ${maxLength} characters long`,
    );
  }

  if (pattern && !pattern.test(value)) {
    errors.push(`${fieldName} format is invalid`);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate number input
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): ValidationResult {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false,
  } = options;
  const errors: string[] = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName} must be a number`);
    return createValidationResult(false, errors);
  }

  if (integer && !Number.isInteger(value)) {
    errors.push(`${fieldName} must be an integer`);
  }

  if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }

  if (value > max) {
    errors.push(`${fieldName} must be no more than ${max}`);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate boolean input
 */
export function validateBoolean(
  value: unknown,
  fieldName: string,
): ValidationResult {
  if (typeof value !== 'boolean') {
    return createValidationResult(false, [`${fieldName} must be a boolean`]);
  }
  return createValidationResult(true);
}

/**
 * Validate array input
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator?: (item: unknown, index: number) => ValidationResult,
  options: {
    minLength?: number;
    maxLength?: number;
  } = {},
): ValidationResult {
  const { minLength = 0, maxLength = Number.MAX_SAFE_INTEGER } = options;
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return createValidationResult(false, errors);
  }

  if (value.length < minLength) {
    errors.push(`${fieldName} must have at least ${minLength} items`);
  }

  if (value.length > maxLength) {
    errors.push(`${fieldName} must have no more than ${maxLength} items`);
  }

  if (itemValidator) {
    value.forEach((item, index) => {
      const result = itemValidator(item, index);
      if (!result.valid) {
        errors.push(
          ...result.errors.map((err) => `${fieldName}[${index}]: ${err}`),
        );
      }
    });
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  validValues: T[],
): ValidationResult {
  if (typeof value !== 'string' || !validValues.includes(value as T)) {
    return createValidationResult(false, [
      `${fieldName} must be one of: ${validValues.join(', ')}`,
    ]);
  }
  return createValidationResult(true);
}

/**
 * Validate supported language
 */
export function validateSupportedLanguage(value: unknown): ValidationResult {
  const validLanguages: SupportedLanguage[] = [
    'typescript',
    'javascript',
    'python',
    'java',
    'cpp',
    'rust',
    'go',
  ];
  return validateEnum(value, 'language', validLanguages);
}

/**
 * Validate difficulty
 */
export function validateDifficulty(value: unknown): ValidationResult {
  const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  return validateEnum(value, 'difficulty', validDifficulties);
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validateString(value, 'email', {
    pattern: emailPattern,
    allowEmpty: false,
  });
}

/**
 * Validate URL format
 */
export function validateUrl(
  value: unknown,
  fieldName = 'URL',
): ValidationResult {
  const stringResult = validateString(value, fieldName, { allowEmpty: false });
  if (!stringResult.valid) {
    return stringResult;
  }

  try {
    new URL(value as string);
    return createValidationResult(true);
  } catch {
    return createValidationResult(false, [`${fieldName} must be a valid URL`]);
  }
}

/**
 * Kebab-case pattern: lowercase letters and numbers, separated by single hyphens
 * No leading/trailing hyphens, no consecutive hyphens
 */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validate slug is kebab-case format
 */
export function validateSlug(
  value: unknown,
  fieldName = 'slug',
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    return createValidationResult(false, [`${fieldName} must be a string`]);
  }

  if (value.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
  } else if (value.length > 100) {
    errors.push(`${fieldName} must be no more than 100 characters`);
  }

  if (value.length > 0 && !KEBAB_CASE_PATTERN.test(value)) {
    errors.push(
      `${fieldName} must be kebab-case (lowercase letters, numbers, and hyphens only, no leading/trailing/consecutive hyphens)`,
    );
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate ISO-8601 date string
 */
export function validateISODateString(
  value: unknown,
  fieldName: string,
): ValidationResult {
  if (typeof value !== 'string') {
    return createValidationResult(false, [`${fieldName} must be a string`]);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return createValidationResult(false, [
      `${fieldName} must be a valid ISO-8601 date string`,
    ]);
  }

  return createValidationResult(true);
}

/**
 * Validate file path format
 */
export function validateFilePath(
  value: unknown,
  fieldName = 'file path',
): ValidationResult {
  const stringResult = validateString(value, fieldName, {
    allowEmpty: false,
    minLength: 1,
    maxLength: 1000,
  });
  if (!stringResult.valid) {
    return stringResult;
  }

  const path = value as string;
  const errors: string[] = [];

  // Check for invalid characters (basic check)
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path)) {
    errors.push(`${fieldName} contains invalid characters`);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate user preferences
 */
export function validateUserPreferences(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return createValidationResult(false, ['preferences must be an object']);
  }

  const prefs = value as Record<string, unknown>;

  // Validate theme
  if ('theme' in prefs) {
    const themeResult = validateEnum(prefs.theme, 'theme', [
      'light',
      'dark',
      'auto',
    ]);
    if (!themeResult.valid) errors.push(...themeResult.errors);
  }

  // Validate verbosity
  if ('verbosity' in prefs) {
    const verbosityResult = validateEnum(prefs.verbosity, 'verbosity', [
      'quiet',
      'normal',
      'verbose',
    ]);
    if (!verbosityResult.valid) errors.push(...verbosityResult.errors);
  }

  // Validate templateStyle
  if ('templateStyle' in prefs) {
    const styleResult = validateEnum(prefs.templateStyle, 'templateStyle', [
      'minimal',
      'documented',
      'comprehensive',
    ]);
    if (!styleResult.valid) errors.push(...styleResult.errors);
  }

  // Validate boolean fields
  const booleanFields = ['autoSave', 'useEmoji', 'useColors'];
  for (const field of booleanFields) {
    if (field in prefs) {
      const result = validateBoolean(prefs[field], field);
      if (!result.valid) errors.push(...result.errors);
    }
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate config object
 */
export function validateConfig(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return createValidationResult(false, ['config must be an object']);
  }

  const config = value as Record<string, unknown>;

  // Validate required fields
  const requiredResult = validateRequired(config.language, 'language');
  if (!requiredResult.valid) errors.push(...requiredResult.errors);

  // Validate language
  if (config.language) {
    const languageResult = validateSupportedLanguage(config.language);
    if (!languageResult.valid) errors.push(...languageResult.errors);
  }

  // Validate workspace - must be a string, can be empty (before init), but if non-empty must be valid path
  if ('workspace' in config) {
    if (typeof config.workspace !== 'string') {
      errors.push('workspace must be a string');
    } else if (config.workspace.length > 0) {
      const pathResult = validateFilePath(config.workspace, 'workspace');
      if (!pathResult.valid) errors.push(...pathResult.errors);
    }
  }

  // Validate aiEnabled
  if ('aiEnabled' in config) {
    const aiResult = validateBoolean(config.aiEnabled, 'aiEnabled');
    if (!aiResult.valid) errors.push(...aiResult.errors);
  }

  // Validate companies array
  if ('companies' in config) {
    const companiesResult = validateArray(
      config.companies,
      'companies',
      (item, index) => validateString(item, `companies[${index}]`, { allowEmpty: false }),
    );
    if (!companiesResult.valid) errors.push(...companiesResult.errors);
  }

  // Validate preferences
  if ('preferences' in config) {
    const prefsResult = validateUserPreferences(config.preferences);
    if (!prefsResult.valid) errors.push(...prefsResult.errors);
  }

  // Validate version
  if ('version' in config) {
    const versionResult = validateString(config.version, 'version', {
      allowEmpty: false,
    });
    if (!versionResult.valid) errors.push(...versionResult.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate a single Example object
 */
function validateExample(
  value: unknown,
  index: number,
): ValidationResult {
  const errors: string[] = [];
  const prefix = `examples[${index}]`;

  if (!value || typeof value !== 'object') {
    return createValidationResult(false, [`${prefix} must be an object`]);
  }

  const example = value as Record<string, unknown>;

  // Validate input: must be an object (not null, not array)
  if (!('input' in example)) {
    errors.push(`${prefix}.input is required`);
  } else if (
    example.input === null ||
    typeof example.input !== 'object' ||
    Array.isArray(example.input)
  ) {
    errors.push(`${prefix}.input must be an object with named parameters`);
  }

  // Validate output: must exist (any value including null is allowed)
  if (!('output' in example)) {
    errors.push(`${prefix}.output is required`);
  }

  // Validate explanation if present: must be a non-empty string
  if ('explanation' in example && example.explanation !== undefined) {
    const explanationResult = validateString(
      example.explanation,
      `${prefix}.explanation`,
      { allowEmpty: false },
    );
    if (!explanationResult.valid) errors.push(...explanationResult.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate problem metadata object
 */
function validateProblemMetadata(
  value: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return createValidationResult(false, ['metadata must be an object']);
  }

  const metadata = value as Record<string, unknown>;

  // Validate date fields if present
  if ('createdAt' in metadata && metadata.createdAt !== undefined) {
    const result = validateISODateString(metadata.createdAt, 'metadata.createdAt');
    if (!result.valid) errors.push(...result.errors);
  }

  if ('updatedAt' in metadata && metadata.updatedAt !== undefined) {
    const result = validateISODateString(metadata.updatedAt, 'metadata.updatedAt');
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate string fields if present
  if ('source' in metadata && metadata.source !== undefined) {
    const result = validateString(metadata.source, 'metadata.source', {
      allowEmpty: false,
    });
    if (!result.valid) errors.push(...result.errors);
  }

  if ('sourceId' in metadata && metadata.sourceId !== undefined) {
    const result = validateString(metadata.sourceId, 'metadata.sourceId', {
      allowEmpty: false,
    });
    if (!result.valid) errors.push(...result.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate problem object
 *
 * Validates all required and optional fields according to PMS-001 specification:
 * - Required: id, slug, title, difficulty, description, examples
 * - Optional: constraints, hints, tags, companies, leetcodeUrl, metadata
 */
export function validateProblem(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!value || typeof value !== 'object') {
    return createValidationResult(false, ['problem must be an object']);
  }

  const problem = value as Record<string, unknown>;

  // Required fields
  const requiredFields = [
    'id',
    'slug',
    'title',
    'difficulty',
    'description',
    'examples',
  ];
  for (const field of requiredFields) {
    const result = validateRequired(problem[field], field);
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate id: non-empty string
  if (problem.id !== undefined) {
    const result = validateString(problem.id, 'id', { allowEmpty: false });
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate slug: kebab-case, 1-100 chars
  if (problem.slug !== undefined) {
    const result = validateSlug(problem.slug, 'slug');
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate title: non-empty string
  if (problem.title !== undefined) {
    const result = validateString(problem.title, 'title', { allowEmpty: false });
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate description: non-empty string
  if (problem.description !== undefined) {
    const result = validateString(problem.description, 'description', {
      allowEmpty: false,
    });
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate difficulty
  if (problem.difficulty !== undefined) {
    const difficultyResult = validateDifficulty(problem.difficulty);
    if (!difficultyResult.valid) errors.push(...difficultyResult.errors);
  }

  // Validate examples: non-empty array of valid Example objects
  if (problem.examples !== undefined) {
    if (!Array.isArray(problem.examples)) {
      errors.push('examples must be an array');
    } else if (problem.examples.length === 0) {
      errors.push('examples must have at least 1 item');
    } else {
      for (let i = 0; i < problem.examples.length; i++) {
        const result = validateExample(problem.examples[i], i);
        if (!result.valid) errors.push(...result.errors);
      }
    }
  }

  // Validate optional string arrays: constraints, hints, tags, companies
  // All must be arrays of non-empty strings
  const stringArrayFields = ['constraints', 'hints', 'tags', 'companies'];
  for (const field of stringArrayFields) {
    if (field in problem && problem[field] !== undefined) {
      const result = validateArray(
        problem[field],
        field,
        (item) => validateString(item, field, { allowEmpty: false }),
      );
      if (!result.valid) errors.push(...result.errors);
    }
  }

  // Validate leetcodeUrl if present: must be a valid URL
  if ('leetcodeUrl' in problem && problem.leetcodeUrl !== undefined) {
    const result = validateUrl(problem.leetcodeUrl, 'leetcodeUrl');
    if (!result.valid) errors.push(...result.errors);
  }

  // Validate metadata if present
  if ('metadata' in problem && problem.metadata !== undefined) {
    const result = validateProblemMetadata(problem.metadata);
    if (!result.valid) errors.push(...result.errors);
  }

  return createValidationResult(errors.length === 0, errors);
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(
  value: T,
  validator: (value: T) => ValidationResult,
  context?: string,
): T {
  const result = validator(value);
  if (!result.valid) {
    throw new ValidationError(
      `Validation failed${context ? ` for ${context}` : ''}: ${result.errors.join(', ')}`,
    );
  }
  return value;
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  const errors = results.flatMap((result) => result.errors);
  return createValidationResult(errors.length === 0, errors);
}
