/**
 * Per-language solution runners for `at run`.
 *
 * Currently only C++ is implemented. The shape is deliberately small so
 * additional languages can be added behind a common interface without
 * reshaping the command layer.
 *
 * @module core/runner
 */

import { basename, join } from '@std/path';
import type { SupportedLanguage } from '../types/global.ts';
import { createErrorContext, WorkspaceError } from '../utils/errors.ts';
import { pathExists } from '../utils/fs.ts';

/**
 * Result of running a scaffolded solution.
 */
export interface RunResult {
  /** Whether the build step succeeded (or was skipped). */
  buildSucceeded: boolean;
  /** Combined stderr+stdout from cmake configure + build, when build ran. */
  buildOutput: string;
  /** True when {@link RunOptions.rebuild} was false. */
  buildSkipped: boolean;
  /** Exit code from the binary itself (non-zero indicates a runtime failure). */
  exitCode: number;
  /** Captured stdout from the binary. */
  stdout: string;
  /** Captured stderr from the binary. */
  stderr: string;
  /** Wall-clock duration of the run step (ms). Excludes build. */
  durationMs: number;
  /** Resolved path to the binary that was executed. */
  binaryPath: string;
}

/**
 * Options for running a solution.
 */
export interface RunOptions {
  /** Absolute path to the problem directory. */
  problemDir: string;
  /** Absolute path to the input file fed to the binary. */
  inputFile: string;
  /** When false, skip the cmake configure + build step entirely. */
  rebuild: boolean;
}

/**
 * Run a scaffolded solution for the given language.
 *
 * Throws {@link WorkspaceError} when the language has no runner registered.
 */
export async function runSolution(
  language: SupportedLanguage,
  options: RunOptions,
): Promise<RunResult> {
  if (language === 'cpp') {
    return await runCpp(options);
  }
  throw new WorkspaceError(
    `'at run' is not implemented for language '${language}' yet`,
    createErrorContext('runSolution', { language }),
  );
}

/**
 * Run a C++ solution scaffolded with the leetcode-driver harness.
 *
 * Steps (in order):
 *   1. Sanity-check `CMakeLists.txt`, `solution.cpp`, and the input file exist.
 *   2. (unless rebuild=false) `cmake -S . -B build` then `cmake --build build`.
 *   3. Locate the produced binary at `bin/<dir-name>` (CMake target == slug).
 *   4. Execute the binary with the input file as argv[1].
 */
async function runCpp(options: RunOptions): Promise<RunResult> {
  const { problemDir, inputFile, rebuild } = options;

  const cmakeListsPath = join(problemDir, 'CMakeLists.txt');
  const solutionPath = join(problemDir, 'solution.cpp');
  const buildDir = join(problemDir, 'build');

  if (!(await pathExists(cmakeListsPath))) {
    throw new WorkspaceError(
      `Missing CMakeLists.txt in ${problemDir}`,
      createErrorContext('runCpp', { problemDir }),
    );
  }
  if (!(await pathExists(solutionPath))) {
    throw new WorkspaceError(
      `Missing solution.cpp in ${problemDir}`,
      createErrorContext('runCpp', { problemDir }),
    );
  }
  if (!(await pathExists(inputFile))) {
    throw new WorkspaceError(
      `Input file not found: ${inputFile}`,
      createErrorContext('runCpp', { inputFile }),
    );
  }

  // The CMake target name (and therefore the produced binary basename) matches
  // the directory name, which is the problem slug.
  const slug = basename(problemDir);
  const binaryPath = join(problemDir, 'bin', slug);

  let buildOutput = '';

  if (rebuild) {
    const configure = await execCapture('cmake', ['-S', problemDir, '-B', buildDir], problemDir);
    buildOutput += configure.combined;
    if (configure.code !== 0) {
      return {
        buildSucceeded: false,
        buildOutput,
        buildSkipped: false,
        exitCode: configure.code,
        stdout: '',
        stderr: '',
        durationMs: 0,
        binaryPath,
      };
    }

    const build = await execCapture('cmake', ['--build', buildDir], problemDir);
    buildOutput += build.combined;
    if (build.code !== 0) {
      return {
        buildSucceeded: false,
        buildOutput,
        buildSkipped: false,
        exitCode: build.code,
        stdout: '',
        stderr: '',
        durationMs: 0,
        binaryPath,
      };
    }
  } else if (!(await pathExists(binaryPath))) {
    throw new WorkspaceError(
      `Binary not found at ${binaryPath} (did you skip --rebuild without an existing build?)`,
      createErrorContext('runCpp', { binaryPath }),
    );
  }

  if (!(await pathExists(binaryPath))) {
    return {
      buildSucceeded: false,
      buildOutput,
      buildSkipped: !rebuild,
      exitCode: -1,
      stdout: '',
      stderr: `cmake completed but no binary at ${binaryPath}`,
      durationMs: 0,
      binaryPath,
    };
  }

  const start = performance.now();
  const run = await execCaptureSeparate(binaryPath, [inputFile], problemDir);
  const durationMs = Math.round(performance.now() - start);

  return {
    buildSucceeded: true,
    buildOutput,
    buildSkipped: !rebuild,
    exitCode: run.code,
    stdout: run.stdout,
    stderr: run.stderr,
    durationMs,
    binaryPath,
  };
}

interface CombinedExec {
  code: number;
  combined: string;
}

interface SeparateExec {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a command, capturing stdout+stderr together (in order they were
 * written, but interleaved by line; sufficient for human-readable build logs).
 */
async function execCapture(cmd: string, args: string[], cwd: string): Promise<CombinedExec> {
  const command = new Deno.Command(cmd, {
    args,
    cwd,
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stdout, stderr } = await command.output();
  const decoder = new TextDecoder();
  return {
    code,
    combined: decoder.decode(stdout) + decoder.decode(stderr),
  };
}

/**
 * Execute a command, capturing stdout and stderr separately. Used for the
 * binary itself so the diff against expected.txt is byte-for-byte clean.
 */
async function execCaptureSeparate(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<SeparateExec> {
  const command = new Deno.Command(cmd, {
    args,
    cwd,
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stdout, stderr } = await command.output();
  const decoder = new TextDecoder();
  return {
    code,
    stdout: decoder.decode(stdout),
    stderr: decoder.decode(stderr),
  };
}

/**
 * Compute a unified-style diff between expected and actual output strings.
 * Not a real diff — just returns numbered side-by-side lines until the first
 * mismatch and a summary. Sufficient for `at run` user feedback; we are not
 * trying to compete with `git diff`.
 */
export function diffStrings(expected: string, actual: string): string {
  if (expected === actual) return '';

  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const maxLen = Math.max(expLines.length, actLines.length);
  const out: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    const e = expLines[i] ?? '';
    const a = actLines[i] ?? '';
    if (e === a) {
      out.push(`  ${i + 1}: ${e}`);
    } else {
      out.push(`- ${i + 1}: ${e}`, `+ ${i + 1}: ${a}`);
    }
  }
  return out.join('\n');
}
