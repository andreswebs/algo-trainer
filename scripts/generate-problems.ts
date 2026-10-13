#!/usr/bin/env bun
/**
 * Generate TypeScript module from problem JSON files
 *
 * This script reads all JSON files from src/data/problems/ and generates a
 * TypeScript module that exports them as constants. This allows the problems
 * to be bundled with `bun build --compile` instead of being read from the file system.
 *
 * Usage:
 *   bun run generate-problems
 */

import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '../src/utils/output.ts';

const PROBLEMS_DIR = 'src/data/problems';
const OUTPUT_FILE = 'src/data/problems.generated.ts';

interface ProblemFile {
  filename: string;
  content: string;
}

async function main(): Promise<void> {
  logger.debug('Scanning for problem files...');

  // Read all JSON files from problems directory
  const problems: ProblemFile[] = [];
  for (const entry of await readdir(PROBLEMS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const path = join(PROBLEMS_DIR, entry.name);
      const content = await readFile(path, 'utf8');
      problems.push({ filename: entry.name, content });
      logger.debug(`Found: ${entry.name}`);
    }
  }

  logger.debug(`Found ${problems.length} problem files`);

  // Sort by filename for consistent output
  problems.sort((a, b) => a.filename.localeCompare(b.filename));

  // Generate TypeScript module
  logger.debug('Generating TypeScript module...');

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Generated problem data');
  lines.push(' *');
  lines.push(' * This file is auto-generated from src/data/problems/*.json');
  lines.push(' * DO NOT EDIT MANUALLY - run `bun run generate-problems` to regenerate');
  lines.push(' *');
  lines.push(` * Total problems: ${problems.length}`);
  lines.push(' */');
  lines.push('');
  lines.push('/**');
  lines.push(' * Raw problem JSON data as string constants');
  lines.push(' */');
  lines.push('export const PROBLEM_DATA: Record<string, string> = {');

  for (const problem of problems) {
    const slug = problem.filename.replace('.json', '');
    // Escape the JSON string for TypeScript
    const escapedContent = JSON.stringify(problem.content);
    lines.push(`  '${slug}': ${escapedContent},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get all problem slugs');
  lines.push(' */');
  lines.push('export function getAllProblemSlugs(): string[] {');
  lines.push('  return Object.keys(PROBLEM_DATA);');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get problem JSON by slug');
  lines.push(' */');
  lines.push('export function getProblemJson(slug: string): string | null {');
  lines.push('  return PROBLEM_DATA[slug] ?? null;');
  lines.push('}');
  lines.push('');

  const output = lines.join('\n');

  // Write the generated file
  await writeFile(OUTPUT_FILE, output);

  // Format the output so `bun run format:check` is stable after generation.
  const result = spawnSync('bunx', ['biome', 'format', '--write', OUTPUT_FILE], {
    stdio: ['ignore', 'ignore', 'pipe'],
    encoding: 'utf8',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Formatting ${OUTPUT_FILE} failed: ${result.stderr.trim()}`);
  }

  logger.success(`Generated ${OUTPUT_FILE}`);
  logger.debug(`Output size: ${(output.length / 1024).toFixed(2)} KB`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error('Failed to generate problems', String(error));
    process.exit(1);
  });
}
