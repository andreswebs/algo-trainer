/**
 * Progress command handler
 *
 * Displays practice progress and statistics including:
 * - Total problems completed vs available
 * - Completion by difficulty (easy/medium/hard)
 * - Completion by category/tags
 * - Current problems in progress
 *
 * @module cli/commands/progress
 */

import type { Args } from '@std/cli/parse-args';
import { join } from '@std/path';
import type { CommandResult, Difficulty } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { getWorkspaceStructure, isWorkspaceInitialized } from '../../core/mod.ts';
import { pathExists } from '../../utils/fs.ts';
import { ExitCode } from '../exit-codes.ts';
import { requireProblemManager } from './shared.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'progress',
    description: 'View progress stats and completion',
    usage: [
      'at progress [options]',
    ],
    options: [
      { flags: '-d, --detailed', description: 'Show detailed breakdown' },
      { flags: '-c, --category', description: 'Group by category' },
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      { command: 'at progress', description: 'Show overall progress summary' },
      { command: 'at progress --detailed', description: 'Show detailed breakdown' },
      { command: 'at progress --category', description: 'Group by category' },
      { command: 'at progress --json', description: 'Output as JSON' },
    ],
  });
}

/**
 * Options extracted from command arguments
 */
export interface ProgressOptions {
  detailed: boolean;
  byCategory: boolean;
  json: boolean;
}

/**
 * Statistics for a specific difficulty level
 */
interface DifficultyStats {
  difficulty: Difficulty;
  current: number;
  completed: number;
  total: number;
}

/**
 * Statistics for a specific category/tag
 */
interface CategoryStats {
  category: string;
  current: number;
  completed: number;
  total: number;
}

/**
 * Overall progress statistics
 */
interface ProgressStats {
  totalProblems: number;
  currentProblems: number;
  completedProblems: number;
  byDifficulty: DifficultyStats[];
  byCategory: CategoryStats[];
}

/**
 * Extract progress options from command arguments
 */
export function extractProgressOptions(args: Args): ProgressOptions {
  return {
    detailed: !!args.detailed || !!args.d,
    byCategory: !!args.category || !!args.c,
    json: !!args.json,
  };
}

/**
 * Scan a directory for problem subdirectories
 */
async function scanProblemDirectory(dirPath: string): Promise<string[]> {
  const problems: string[] = [];

  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.isDirectory) {
        // Check if it's a valid problem directory (has .problem.json)
        const metadataPath = join(dirPath, entry.name, '.problem.json');
        if (await pathExists(metadataPath)) {
          problems.push(entry.name);
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read, return empty array
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }

  return problems;
}

/**
 * Read problem metadata from .problem.json file
 */
async function readProblemMetadata(
  dirPath: string,
  slug: string,
): Promise<{ difficulty?: Difficulty; tags?: string[] }> {
  try {
    const metadataPath = join(dirPath, slug, '.problem.json');
    const content = await Deno.readTextFile(metadataPath);
    const metadata = JSON.parse(content);
    return {
      difficulty: metadata.difficulty,
      tags: metadata.tags || [],
    };
  } catch {
    return {};
  }
}

/**
 * Calculate progress statistics by scanning workspace
 */
async function calculateProgressStats(
  workspaceRoot: string,
): Promise<ProgressStats> {
  const structure = getWorkspaceStructure(workspaceRoot);
  const manager = await requireProblemManager();

  // Scan current and completed directories
  const currentSlugs = await scanProblemDirectory(structure.problems);
  const completedSlugs = await scanProblemDirectory(structure.completed);

  // Initialize stats by difficulty
  const difficultyStats = new Map<Difficulty, DifficultyStats>([
    ['easy', { difficulty: 'easy', current: 0, completed: 0, total: 0 }],
    ['medium', { difficulty: 'medium', current: 0, completed: 0, total: 0 }],
    ['hard', { difficulty: 'hard', current: 0, completed: 0, total: 0 }],
  ]);

  // Initialize stats by category
  const categoryStats = new Map<string, CategoryStats>();

  // Count current problems
  for (const slug of currentSlugs) {
    const metadata = await readProblemMetadata(structure.problems, slug);

    if (metadata.difficulty) {
      const stats = difficultyStats.get(metadata.difficulty);
      if (stats) {
        stats.current++;
      }
    }

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const stats = categoryStats.get(tag) ||
          { category: tag, current: 0, completed: 0, total: 0 };
        stats.current++;
        categoryStats.set(tag, stats);
      }
    }
  }

  // Count completed problems
  for (const slug of completedSlugs) {
    const metadata = await readProblemMetadata(structure.completed, slug);

    if (metadata.difficulty) {
      const stats = difficultyStats.get(metadata.difficulty);
      if (stats) {
        stats.completed++;
      }
    }

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const stats = categoryStats.get(tag) ||
          { category: tag, current: 0, completed: 0, total: 0 };
        stats.completed++;
        categoryStats.set(tag, stats);
      }
    }
  }

  // Get total counts from problem manager
  const allProblems = manager.list({});
  const totalByDifficulty = new Map<Difficulty, number>([
    ['easy', 0],
    ['medium', 0],
    ['hard', 0],
  ]);
  const totalByCategory = new Map<string, number>();

  for (const problem of allProblems.problems) {
    // Count by difficulty
    const count = totalByDifficulty.get(problem.difficulty) || 0;
    totalByDifficulty.set(problem.difficulty, count + 1);

    // Count by tags
    for (const tag of problem.tags) {
      const tagCount = totalByCategory.get(tag) || 0;
      totalByCategory.set(tag, tagCount + 1);
    }
  }

  // Update total counts
  for (const [difficulty, total] of totalByDifficulty) {
    const stats = difficultyStats.get(difficulty);
    if (stats) {
      stats.total = total;
    }
  }

  for (const [category, total] of totalByCategory) {
    const stats = categoryStats.get(category);
    if (stats) {
      stats.total = total;
    } else {
      categoryStats.set(category, { category, current: 0, completed: 0, total });
    }
  }

  return {
    totalProblems: allProblems.total,
    currentProblems: currentSlugs.length,
    completedProblems: completedSlugs.length,
    byDifficulty: Array.from(difficultyStats.values()),
    byCategory: Array.from(categoryStats.values()).sort((a, b) =>
      b.completed - a.completed || a.category.localeCompare(b.category)
    ),
  };
}

/**
 * Format progress statistics as a table
 */
function formatProgressTable(stats: ProgressStats, options: ProgressOptions): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('=== Progress Summary ===');
  lines.push('');

  // Overall stats
  const completionRate = stats.totalProblems > 0
    ? ((stats.completedProblems / stats.totalProblems) * 100).toFixed(1)
    : '0.0';

  lines.push(`Total Problems Available: ${stats.totalProblems}`);
  lines.push(`Problems Completed: ${stats.completedProblems}`);
  lines.push(`Problems In Progress: ${stats.currentProblems}`);
  lines.push(`Overall Completion: ${completionRate}%`);
  lines.push('');

  // By difficulty
  lines.push('=== By Difficulty ===');
  lines.push('');
  lines.push('Difficulty | In Progress | Completed | Total');
  lines.push('-----------|-------------|-----------|------');

  for (const diff of stats.byDifficulty) {
    const difficulty = diff.difficulty.padEnd(10);
    const current = diff.current.toString().padStart(11);
    const completed = diff.completed.toString().padStart(9);
    const total = diff.total.toString().padStart(5);
    lines.push(`${difficulty} | ${current} | ${completed} | ${total}`);
  }
  lines.push('');

  // By category (if requested or detailed)
  if (options.byCategory || options.detailed) {
    lines.push('=== By Category ===');
    lines.push('');

    // Filter to only show categories with activity
    const activeCategories = stats.byCategory.filter(
      (cat) => cat.current > 0 || cat.completed > 0,
    );

    if (activeCategories.length > 0) {
      lines.push('Category           | In Progress | Completed | Total');
      lines.push('-------------------|-------------|-----------|------');

      // Limit to top 10 if not detailed
      const displayCategories = options.detailed ? activeCategories : activeCategories.slice(0, 10);

      for (const cat of displayCategories) {
        const category = cat.category.padEnd(18);
        const current = cat.current.toString().padStart(11);
        const completed = cat.completed.toString().padStart(9);
        const total = cat.total.toString().padStart(5);
        lines.push(`${category} | ${current} | ${completed} | ${total}`);
      }

      if (!options.detailed && activeCategories.length > 10) {
        lines.push('');
        lines.push(`... and ${activeCategories.length - 10} more categories`);
        lines.push('Use --detailed to see all categories');
      }
    } else {
      lines.push('No problems attempted yet in any category.');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Progress command implementation
 *
 * Shows progress statistics including total completion, breakdown by difficulty,
 * and optionally by category. Supports JSON output for scripting.
 */
export async function progressCommand(args: Args): Promise<CommandResult> {
  // Handle help flag
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    // Extract options
    const options = extractProgressOptions(args);

    // Get workspace from config
    const config = configManager.getConfig();
    const workspaceRoot = config.workspace;

    // Check if workspace is initialized
    if (!await isWorkspaceInitialized(workspaceRoot)) {
      console.error('Workspace not initialized. Run "at init" first.');
      return {
        success: false,
        error: 'Workspace not initialized',
        exitCode: ExitCode.WORKSPACE_ERROR,
      };
    }

    // Calculate statistics
    const stats = await calculateProgressStats(workspaceRoot);

    // Output results
    if (options.json) {
      // JSON output
      console.log(JSON.stringify(stats, null, 2));
    } else {
      // Table output
      const table = formatProgressTable(stats, options);
      console.log(table);
    }

    return {
      success: true,
      exitCode: ExitCode.SUCCESS,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error calculating progress: ${message}`);
    return {
      success: false,
      error: message,
      exitCode: ExitCode.GENERAL_ERROR,
    };
  }
}
