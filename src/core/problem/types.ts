/**
 * Problem type definitions for the Problem Management System.
 *
 * This module defines:
 * - Raw JSON format for problems as stored on disk
 *
 * @module core/problem/types
 */

import type { Difficulty, Example, ProblemSignatures } from '../../types/global.ts';

// ============================================================================
// Problem Parsing Types (PMS-003)
// ============================================================================

/**
 * Raw metadata as stored in JSON files
 */
export interface RawProblemMetadata {
  source?: string;
  sourceId?: string;
}

/**
 * Raw problem as stored in JSON files
 *
 * This represents the on-disk format where:
 * - Optional array fields may be missing (will be normalized to [])
 * - Date fields are ISO-8601 strings (will be converted to Date)
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
  signatures?: ProblemSignatures;
  createdAt?: string;
  updatedAt?: string;
  metadata?: RawProblemMetadata;
}
