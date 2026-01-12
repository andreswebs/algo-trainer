/**
 * Problem parser and normalization
 *
 * Converts on-disk problem JSON files into validated, normalized Problem objects.
 * Handles JSON parsing, validation, and normalization of optional fields.
 *
 * @module core/problem/parser
 */

import { basename } from '@std/path';
import type { Problem, ProblemMetadata } from '../../types/global.ts';
import { createErrorContext, ProblemError } from '../../utils/errors.ts';
import { validateProblem } from '../../utils/validation.ts';
import type { RawProblemJson, RawProblemMetadata } from './types.ts';

/**
 * Parse a problem from a JSON file
 *
 * @param path - Absolute or relative path to the problem JSON file
 * @returns Parsed and normalized Problem object
 * @throws ProblemError if the file cannot be read, parsed, or validated
 */
export async function parseProblemFromFile(path: string): Promise<Problem> {
  let content: string;

  try {
    content = await Deno.readTextFile(path);
  } catch (error) {
    throw new ProblemError(
      `Failed to read problem file: ${path}`,
      createErrorContext('parseProblem', {
        path,
        reason: 'file_read_error',
        originalError: String(error),
      }),
    );
  }

  const problem = parseProblemFromJson(content, path);

  const expectedFilename = `${problem.slug}.json`;
  const actualFilename = basename(path);
  if (actualFilename !== expectedFilename) {
    throw new ProblemError(
      `Filename must match slug: expected '${expectedFilename}', got '${actualFilename}'`,
      createErrorContext('parseProblem', {
        path,
        reason: 'filename_mismatch',
        expectedFilename,
        actualFilename,
        slug: problem.slug,
      }),
    );
  }

  return problem;
}

/**
 * Parse a problem from a JSON string
 *
 * @param content - JSON string content
 * @param sourcePath - Optional source path for error messages
 * @returns Parsed and normalized Problem object
 * @throws ProblemError if JSON is invalid or validation fails
 */
export function parseProblemFromJson(content: string, sourcePath?: string): Problem {
  let rawData: unknown;

  try {
    rawData = JSON.parse(content);
  } catch (error) {
    throw new ProblemError(
      'Invalid JSON format',
      createErrorContext('parseProblem', {
        path: sourcePath,
        reason: 'json_parse_error',
        originalError: String(error),
      }),
    );
  }

  const validationResult = validateProblem(rawData);
  if (!validationResult.valid) {
    throw new ProblemError(
      `Invalid problem data: ${validationResult.errors.join('; ')}`,
      createErrorContext('parseProblem', {
        path: sourcePath,
        reason: 'validation_error',
        errors: validationResult.errors,
      }),
    );
  }

  const raw = rawData as RawProblemJson;
  return normalizeProblem(raw);
}

/**
 * Normalize a raw problem JSON to a full Problem object
 *
 * - Missing array fields become empty arrays
 * - Date strings are converted to Date objects
 */
export function normalizeProblem(raw: RawProblemJson): Problem {
  const problem: Problem = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    difficulty: raw.difficulty,
    description: raw.description,
    examples: raw.examples,
    constraints: raw.constraints ?? [],
    hints: raw.hints ?? [],
    tags: raw.tags ?? [],
  };

  if (raw.companies !== undefined) {
    problem.companies = raw.companies;
  }

  if (raw.leetcodeUrl !== undefined) {
    problem.leetcodeUrl = raw.leetcodeUrl;
  }

  if (raw.createdAt !== undefined) {
    const createdAt = parseIsoDate(raw.createdAt);
    if (createdAt !== undefined) {
      problem.createdAt = createdAt;
    }
  }

  if (raw.updatedAt !== undefined) {
    const updatedAt = parseIsoDate(raw.updatedAt);
    if (updatedAt !== undefined) {
      problem.updatedAt = updatedAt;
    }
  }

  if (raw.metadata !== undefined) {
    problem.metadata = normalizeMetadata(raw.metadata);
  }

  return problem;
}

/**
 * Normalize metadata
 */
export function normalizeMetadata(raw: RawProblemMetadata): ProblemMetadata {
  const metadata: ProblemMetadata = {};

  if (raw.source !== undefined) {
    metadata.source = raw.source;
  }

  if (raw.sourceId !== undefined) {
    metadata.sourceId = raw.sourceId;
  }

  return metadata;
}

/**
 * Parse an ISO-8601 date string to a Date object
 *
 * @param dateStr - ISO-8601 formatted date string
 * @returns Date object, or undefined if the string is invalid
 */
function parseIsoDate(dateStr: string): Date | undefined {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}
