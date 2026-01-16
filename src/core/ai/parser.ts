/**
 * Teaching script YAML parser
 *
 * Parses trainer.yaml files into TeachingScript objects for the AI teaching system.
 * Handles YAML loading, type coercion, and graceful error handling.
 *
 * @module core/ai/parser
 */

import { parse as parseYaml } from '@std/yaml';
import { join } from '@std/path';
import type { TeachingScript } from './types.ts';
import { createErrorContext, ScriptError } from '../../utils/errors.ts';
import { pathExists } from '../../utils/fs.ts';
import { validateTeachingScript } from './validator.ts';

/**
 * Parses a YAML string into a TeachingScript object.
 *
 * Performs type coercion and normalization to ensure the parsed object
 * conforms to the TeachingScript interface. Does NOT perform full validation -
 * use the validator for that (ATS-002).
 *
 * @param yamlContent - The YAML content as a string
 * @returns Parsed TeachingScript object
 * @throws {ScriptError} If YAML parsing fails or required fields are missing
 *
 * @example
 * ```typescript
 * const yaml = `
 * id: two-sum
 * title: Two Sum
 * difficulty: easy
 * tags: [array, hash-table]
 * language: typescript
 * steps:
 *   - type: intro
 *     content: Welcome to Two Sum!
 * `;
 * const script = parseTeachingScript(yaml);
 * ```
 */
export function parseTeachingScript(yamlContent: string): TeachingScript {
  let parsed: unknown;

  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    throw new ScriptError(
      'Failed to parse YAML content',
      createErrorContext('parseTeachingScript', {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ScriptError(
      'Parsed YAML is not an object',
      createErrorContext('parseTeachingScript', {
        type: typeof parsed,
      }),
    );
  }

  // Type coercion and normalization
  const obj = parsed as Record<string, unknown>;

  // Ensure required fields exist (basic check, validator does thorough checking)
  if (!obj.id || typeof obj.id !== 'string') {
    throw new ScriptError(
      'Missing or invalid required field: id',
      createErrorContext('parseTeachingScript'),
    );
  }

  if (!obj.title || typeof obj.title !== 'string') {
    throw new ScriptError(
      'Missing or invalid required field: title',
      createErrorContext('parseTeachingScript'),
    );
  }

  if (!obj.difficulty || typeof obj.difficulty !== 'string') {
    throw new ScriptError(
      'Missing or invalid required field: difficulty',
      createErrorContext('parseTeachingScript'),
    );
  }

  if (!obj.language || typeof obj.language !== 'string') {
    throw new ScriptError(
      'Missing or invalid required field: language',
      createErrorContext('parseTeachingScript'),
    );
  }

  if (!Array.isArray(obj.steps)) {
    throw new ScriptError(
      'Missing or invalid required field: steps (must be an array)',
      createErrorContext('parseTeachingScript'),
    );
  }

  // Normalize tags array (default to empty array if missing)
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  // Normalize steps array
  const steps = obj.steps.map((step: unknown, index: number) => {
    if (!step || typeof step !== 'object') {
      throw new ScriptError(
        `Invalid step at index ${index}: must be an object`,
        createErrorContext('parseTeachingScript', { stepIndex: index }),
      );
    }

    const stepObj = step as Record<string, unknown>;

    if (!stepObj.type || typeof stepObj.type !== 'string') {
      throw new ScriptError(
        `Invalid step at index ${index}: missing or invalid type`,
        createErrorContext('parseTeachingScript', { stepIndex: index }),
      );
    }

    if (!stepObj.content || typeof stepObj.content !== 'string') {
      throw new ScriptError(
        `Invalid step at index ${index}: missing or invalid content`,
        createErrorContext('parseTeachingScript', { stepIndex: index }),
      );
    }

    return {
      type: stepObj.type as string,
      content: stepObj.content as string,
      trigger: typeof stepObj.trigger === 'string' ? stepObj.trigger : undefined,
      keywords: Array.isArray(stepObj.keywords)
        ? stepObj.keywords.filter((k): k is string => typeof k === 'string')
        : undefined,
    };
  });

  return {
    id: obj.id,
    title: obj.title,
    difficulty: obj.difficulty as 'easy' | 'medium' | 'hard',
    tags,
    language: obj.language as string,
    steps,
  } as TeachingScript;
}

/**
 * Loads and parses a teaching script from a file path.
 *
 * This is a convenience function that reads the file and calls parseTeachingScript.
 * If the file doesn't exist, returns null instead of throwing an error.
 *
 * @param filePath - Path to the trainer.yaml file
 * @returns Parsed TeachingScript object, or null if file doesn't exist
 * @throws {ScriptError} If file read fails or YAML parsing fails
 *
 * @example
 * ```typescript
 * const script = await loadTeachingScript('./problems/two-sum/trainer.yaml');
 * if (script) {
 *   console.log(`Loaded script for: ${script.title}`);
 * }
 * ```
 */
export async function loadTeachingScript(
  filePath: string,
): Promise<TeachingScript | null> {
  // Check if file exists
  const fileExists = await pathExists(filePath);

  if (!fileExists) {
    return null;
  }

  // Read file content
  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch (error) {
    throw new ScriptError(
      'Failed to read teaching script file',
      createErrorContext('loadTeachingScript', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  // Parse YAML content
  try {
    return parseTeachingScript(content);
  } catch (error) {
    if (error instanceof ScriptError) {
      // Re-throw with file context added
      throw new ScriptError(
        error.message,
        createErrorContext('loadTeachingScript', {
          filePath,
          ...error.context,
        }),
      );
    }
    throw error;
  }
}

/**
 * Loads and validates a teaching script from a file path.
 *
 * This is the recommended way to load teaching scripts as it combines
 * parsing and validation into a single operation with consistent error handling.
 *
 * Error handling behavior:
 * - File not found → returns null
 * - Parse error → throws ScriptError
 * - Validation error → throws ScriptError with validation details
 *
 * @param filePath - Path to the trainer.yaml file
 * @returns Validated TeachingScript object, or null if file doesn't exist
 * @throws {ScriptError} If parsing or validation fails
 *
 * @example
 * ```typescript
 * const script = await loadAndValidateScript('./problems/two-sum/trainer.yaml');
 * if (script) {
 *   console.log(`Loaded valid script for: ${script.title}`);
 * } else {
 *   console.log('No teaching script found');
 * }
 * ```
 */
export async function loadAndValidateScript(
  filePath: string,
): Promise<TeachingScript | null> {
  // First, try to load the script (returns null if not found)
  const script = await loadTeachingScript(filePath);

  if (script === null) {
    return null;
  }

  // Validate the loaded script
  const validationResult = validateTeachingScript(script);

  if (!validationResult.valid) {
    throw new ScriptError(
      `Teaching script validation failed: ${validationResult.errors.join(', ')}`,
      createErrorContext('loadAndValidateScript', {
        filePath,
        errors: validationResult.errors,
      }),
    );
  }

  return script;
}

/**
 * Finds the path to a teaching script (trainer.yaml) in a problem directory.
 *
 * This function looks for trainer.yaml in the given problem directory path.
 * It checks if the file exists and returns the full path if found.
 *
 * @param problemPath - Path to the problem directory
 * @returns Full path to trainer.yaml if found, null otherwise
 *
 * @example
 * ```typescript
 * const scriptPath = await findScriptPath('./problems/two-sum');
 * if (scriptPath) {
 *   const script = await loadAndValidateScript(scriptPath);
 * }
 * ```
 */
export async function findScriptPath(
  problemPath: string,
): Promise<string | null> {
  const trainerYamlPath = join(problemPath, 'trainer.yaml');
  
  const fileExists = await pathExists(trainerYamlPath);
  
  return fileExists ? trainerYamlPath : null;
}
