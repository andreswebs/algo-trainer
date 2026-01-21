#!/usr/bin/env -S deno run --allow-read --allow-write
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

const PROBLEMS_DIR = 'src/data/problems';
const OUTPUT_FILE = 'src/data/problems.generated.ts';

interface ProblemFile {
  filename: string;
  content: string;
}

async function main() {
  console.log('🔍 Scanning for problem files...');

  // Read all JSON files from problems directory
  const problems: ProblemFile[] = [];
  for await (const entry of Deno.readDir(PROBLEMS_DIR)) {
    if (entry.isFile && entry.name.endsWith('.json')) {
      const path = join(PROBLEMS_DIR, entry.name);
      const content = await Deno.readTextFile(path);
      problems.push({ filename: entry.name, content });
      console.log(`  ✓ ${entry.name}`);
    }
  }

  console.log(`\n📦 Found ${problems.length} problem files`);

  // Sort by filename for consistent output
  problems.sort((a, b) => a.filename.localeCompare(b.filename));

  // Generate TypeScript module
  console.log('\n✨ Generating TypeScript module...');

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

  console.log(`✅ Generated ${OUTPUT_FILE}`);
  console.log(`📊 Output size: ${(output.length / 1024).toFixed(2)} KB`);
  console.log('\n✨ Done!');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    Deno.exit(1);
  });
}
