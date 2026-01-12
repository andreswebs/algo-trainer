/**
 * Problem-related types for parsing and storage
 *
 * This module defines the raw JSON format for problems as stored on disk,
 * and provides type guards and conversion utilities.
 *
 * @module core/problem/types
 */

import type { Difficulty, Example, Problem } from '../../types/global.ts';

/**
 * Raw metadata as stored in JSON files (dates are strings)
 */
export interface RawProblemMetadata {
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  sourceId?: string;
}

/**
 * Raw problem as stored in JSON files
 *
 * This represents the on-disk format where:
 * - Optional array fields may be missing (will be normalized to [])
 * - Metadata date fields are ISO-8601 strings (will be converted to Date)
 */
export interface RawProblemJson {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  examples: Example[];
  constraints?: string[];
  hints?: string[];
  tags?: string[];
  companies?: string[];
  leetcodeUrl?: string;
  metadata?: RawProblemMetadata;
}

/**
 * Result of parsing a problem file
 */
export interface ParseResult {
  success: true;
  problem: Problem;
}

/**
 * Parse error with details
 */
export interface ParseError {
  success: false;
  errors: string[];
  path?: string;
}

/**
 * Union type for parse results
 */
export type ParseOutcome = ParseResult | ParseError;
