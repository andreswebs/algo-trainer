/**
 * Run command handler
 *
 * Builds and executes the scaffolded solution for a problem, then optionally
 * diffs the output against `expected.txt`. Currently implemented for C++
 * (leetcode-driver harness); other languages return a clear error.
 *
 * @module cli/commands/run
 */

import type { Args } from '@std/cli/parse-args';
import { join } from '@std/path';
import type { CommandResult, SupportedLanguage } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { getProblemMetadata } from '../../core/mod.ts';
import { diffStrings, runSolution } from '../../core/runner.ts';
import type { RunResult } from '../../core/runner.ts';
import { ExitCode } from '../exit-codes.ts';
import { logger, outputData } from '../../utils/output.ts';
import { pathExists } from '../../utils/fs.ts';
import { requireWorkspace } from './shared.ts';
import { showCommandHelp } from './help.ts';

function showHelp(): void {
  showCommandHelp({
    name: 'run',
    description: 'Build and run the scaffolded solution; diff against expected.txt',
    usage: [
      'algo-trainer run [<slug>]',
      'algo-trainer run --no-build',
      'algo-trainer run two-sum --input custom.txt',
    ],
    options: [
      {
        flags: '-l, --language <lang>',
        description: 'Override the language detected from .problem.json',
      },
      {
        flags: '-i, --input <path>',
        description: 'Input file (default: input.txt inside the problem dir)',
      },
      {
        flags: '-e, --expected <path>',
        description: 'Expected output file (default: expected.txt). Skip diff with --no-diff',
      },
      { flags: '--no-build', description: 'Skip cmake configure + build steps' },
      { flags: '--no-diff', description: 'Skip diff against expected.txt; just print stdout' },
      { flags: '-h, --help', description: 'Show this help message' },
    ],
    examples: [
      {
        command: 'algo-trainer run',
        description: 'Run the problem in the current directory',
      },
      {
        command: 'algo-trainer run two-sum',
        description: 'Run two-sum from anywhere inside the workspace',
      },
      {
        command: 'algo-trainer run two-sum --no-build',
        description: 'Re-execute the existing binary without rebuilding',
      },
      {
        command: 'algo-trainer run two-sum --no-diff',
        description: 'Just print stdout; ignore expected.txt',
      },
    ],
  });
}

export interface RunCommandOptions {
  slug: string | undefined;
  language: string | undefined;
  inputPath: string | undefined;
  expectedPath: string | undefined;
  noBuild: boolean;
  noDiff: boolean;
}

export function extractRunOptions(args: Args): RunCommandOptions {
  const positional = args._.slice(1);
  return {
    slug: positional[0] as string | undefined,
    language: (args.language || args.l) as string | undefined,
    inputPath: (args.input || args.i) as string | undefined,
    expectedPath: (args.expected || args.e) as string | undefined,
    // parseArgs flips negatable booleans (default true); falsy means "passed --no-X"
    noBuild: args.build === false,
    noDiff: args.diff === false,
  };
}

/**
 * Resolve a file path: return `fallback` when undefined, absolute paths as-is,
 * relative paths joined against `cwd`.
 */
export function resolveFilePath(
  path: string | undefined,
  fallback: string,
  cwd: string = Deno.cwd(),
): string {
  if (path === undefined) return fallback;
  if (path.startsWith('/')) return path;
  return join(cwd, path);
}

/**
 * Determine language for a problem directory.
 *
 * Priority: explicit flag → .problem.json `language` field →
 * getProblemMetadata (handles older formats) → defaultLang.
 */
export async function resolveLanguage(
  problemDir: string,
  explicitLang: string | undefined,
  workspaceRoot: string,
  defaultLang: SupportedLanguage,
): Promise<SupportedLanguage> {
  if (explicitLang) return explicitLang as SupportedLanguage;

  const metadataPath = join(problemDir, '.problem.json');
  if (!(await pathExists(metadataPath))) return defaultLang;

  try {
    const raw = JSON.parse(await Deno.readTextFile(metadataPath));
    if (typeof raw?.language === 'string') return raw.language as SupportedLanguage;
    if (typeof raw?.slug === 'string') {
      const meta = await getProblemMetadata(workspaceRoot, raw.slug, defaultLang);
      if (meta?.language) return meta.language;
    }
  } catch {
    // ignore — fall through to default
  }

  return defaultLang;
}

/**
 * Resolve which problem directory to run against.
 *
 * Priority:
 *   1. If `slug` was given, expect `<workspace>/problems/<slug>` to exist.
 *   2. Otherwise, walk up from the current working directory until we find a
 *      directory containing a `.problem.json` file — that's the problem dir.
 */
async function resolveProblemDir(
  slug: string | undefined,
  workspaceProblemsDir: string,
): Promise<{ dir: string; resolvedFrom: 'slug' | 'cwd' }> {
  if (slug) {
    const dir = join(workspaceProblemsDir, slug);
    if (!(await pathExists(dir))) {
      throw new Error(
        `No scaffolded problem at ${dir}. Run 'algo-trainer challenge ${slug}' first.`,
      );
    }
    return { dir, resolvedFrom: 'slug' };
  }

  // Walk up from cwd
  let current = Deno.cwd();
  for (let i = 0; i < 10; i++) {
    if (await pathExists(join(current, '.problem.json'))) {
      return { dir: current, resolvedFrom: 'cwd' };
    }
    const parent = join(current, '..');
    if (parent === current) break;
    current = await Deno.realPath(parent).catch(() => parent);
  }

  throw new Error(
    "Couldn't determine which problem to run. Pass a slug (e.g. 'algo-trainer run two-sum') or cd into a problem directory.",
  );
}

function reportRunFailure(result: RunResult): CommandResult {
  logger.error(`Binary exited with code ${result.exitCode} after ${result.durationMs}ms`);
  if (result.stderr) {
    logger.log('--- stderr ---');
    logger.log(result.stderr);
  }
  if (result.stdout) {
    logger.log('--- stdout ---');
    logger.log(result.stdout);
  }
  return { success: false, exitCode: ExitCode.GENERAL_ERROR };
}

async function checkDiff(
  stdout: string,
  expectedFile: string,
  durationMs: number,
): Promise<CommandResult> {
  if (!(await pathExists(expectedFile))) {
    logger.info(
      `No expected.txt at ${expectedFile} — skipping diff. Run with --no-diff to silence this.`,
    );
    logger.info(`Run completed in ${durationMs}ms`);
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  const expected = await Deno.readTextFile(expectedFile);
  if (expected === stdout) {
    logger.info(`PASS — output matches expected.txt (${durationMs}ms)`);
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  logger.error('FAIL — output does not match expected.txt');
  logger.log('--- diff (- expected, + actual) ---');
  logger.log(diffStrings(expected, stdout));
  return { success: false, exitCode: ExitCode.GENERAL_ERROR };
}

export async function runCommand(args: Args): Promise<CommandResult> {
  if (args.help || args.h) {
    showHelp();
    return { success: true, exitCode: ExitCode.SUCCESS };
  }

  try {
    const opts = extractRunOptions(args);
    const structure = await requireWorkspace();

    let problemDir: string;
    try {
      const resolved = await resolveProblemDir(opts.slug, structure.problems);
      problemDir = resolved.dir;
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      return { success: false, exitCode: ExitCode.WORKSPACE_ERROR };
    }

    const config = configManager.getConfig();
    const defaultLang = (config.language ?? 'typescript') as SupportedLanguage;
    const language = await resolveLanguage(problemDir, opts.language, structure.root, defaultLang);
    const cwd = Deno.cwd();
    const inputFile = resolveFilePath(opts.inputPath, join(problemDir, 'input.txt'), cwd);

    logger.info(`Problem: ${problemDir}`);
    logger.info(`Language: ${language}`);
    logger.info(`Input: ${inputFile}`);
    if (opts.noBuild) logger.info('Skipping build (--no-build)');

    const result = await runSolution(language, {
      problemDir,
      inputFile,
      rebuild: !opts.noBuild,
    });

    if (!result.buildSucceeded) {
      logger.error('Build failed:');
      logger.log(result.buildOutput);
      return { success: false, exitCode: ExitCode.GENERAL_ERROR };
    }

    if (result.exitCode !== 0) return reportRunFailure(result);

    // Success path: print stdout to stdout for the user / scripting.
    outputData(result.stdout.endsWith('\n') ? result.stdout.slice(0, -1) : result.stdout);
    if (result.stderr) {
      logger.log('--- stderr ---');
      logger.log(result.stderr);
    }

    if (opts.noDiff) {
      logger.info(`Run completed in ${result.durationMs}ms (diff skipped)`);
      return { success: true, exitCode: ExitCode.SUCCESS };
    }

    const expectedFile = resolveFilePath(opts.expectedPath, join(problemDir, 'expected.txt'), cwd);
    return await checkDiff(result.stdout, expectedFile, result.durationMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Run failed: ${message}`);
    return { success: false, exitCode: ExitCode.GENERAL_ERROR };
  }
}
