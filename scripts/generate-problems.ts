#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
/**
 * Generate TypeScript module from problem JSON files
 *
 * This script reads all JSON files from src/data/problems/ and generates a
 * TypeScript module that exports them as constants. This allows the problems
 * to be bundled with `deno compile` instead of being read from the file system.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/generate-problems.ts
 */

import { join } from '@std/path';
import { logger } from '../src/utils/output.ts';

const PROBLEMS_DIR = 'src/data/problems';
const OUTPUT_FILE = 'src/data/problems.generated.ts';

interface ProblemFile {
  filename: string;
  content: string;
}

async function main() {
  logger.debug('Scanning for problem files...');

  // Read all JSON files from problems directory
  const problems: ProblemFile[] = [];
  for await (const entry of Deno.readDir(PROBLEMS_DIR)) {
    if (entry.isFile && entry.name.endsWith('.json')) {
      const path = join(PROBLEMS_DIR, entry.name);
      const content = await Deno.readTextFile(path);
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
  lines.push(' * DO NOT EDIT MANUALLY - run `deno task generate-problems` to regenerate');
  lines.push(' *');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
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
  await Deno.writeTextFile(OUTPUT_FILE, output);

  logger.success(`Generated ${OUTPUT_FILE}`);
  logger.debug(`Output size: ${(output.length / 1024).toFixed(2)} KB`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error('Failed to generate problems', String(error));
    Deno.exit(1);
  });
}
