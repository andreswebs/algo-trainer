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
 * Validate problem object
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

  // Validate string fields
  const stringFields = ['id', 'slug', 'title', 'description'];
  for (const field of stringFields) {
    if (problem[field]) {
      const result = validateString(problem[field], field, {
        allowEmpty: false,
      });
      if (!result.valid) errors.push(...result.errors);
    }
  }

  // Validate difficulty
  if (problem.difficulty) {
    const difficultyResult = validateDifficulty(problem.difficulty);
    if (!difficultyResult.valid) errors.push(...difficultyResult.errors);
  }

  // Validate arrays
  const arrayFields = ['examples', 'constraints', 'hints', 'tags'];
  for (const field of arrayFields) {
    if (problem[field]) {
      const result = validateArray(problem[field], field);
      if (!result.valid) errors.push(...result.errors);
    }
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
