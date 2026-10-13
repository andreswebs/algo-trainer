/**
 * Tests for workspace file generation (PMS-015)
 *
 * @module test/core/workspace/generation
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getFileExtension, getProblemPaths } from '../../../src/core/workspace/files.ts';
import {
  type GenerateProblemFilesOptions,
  generateProblemFiles,
  getProblemMetadata,
  type ProblemWorkspaceMetadata,
  problemExists,
} from '../../../src/core/workspace/generation.ts';
import type { Problem, SupportedLanguage } from '../../../src/types/global.ts';
import { WorkspaceError } from '../../../src/utils/errors.ts';
import { pathExists } from '../../../src/utils/fs.ts';
import { assertRejectsWith } from '../../helpers/assert.ts';

// Test fixtures
const mockProblem: Problem = {
  id: 'test-001',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'easy',
  description:
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  examples: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      output: [0, 1],
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      output: [1, 2],
    },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    'Only one valid answer exists.',
  ],
  hints: [
    'Use a hash map to store values you have seen.',
    'For each element, check if target - element exists in the map.',
  ],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google', 'Microsoft'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

/**
 * Check if a path contains mixed path separators (both / and \)
 * This would indicate a path construction issue.
 */
function hasMixedSeparators(path: string): boolean {
  return path.includes('/') && path.includes('\\');
}

/**
 * Create a temporary workspace directory for testing
 */
async function createTempWorkspace(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-test-'));
  return tempDir;
}

/**
 * Clean up temporary workspace
 */
async function cleanupTempWorkspace(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

test('generateProblemFiles - generates all files successfully', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
      overwritePolicy: 'skip',
    };

    const result = await generateProblemFiles(options);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.filesCreated.length, 4); // solution, test, readme, metadata
    deepStrictEqual(result.filesSkipped.length, 0);

    // Verify files exist
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    deepStrictEqual(await pathExists(paths.solutionFile), true);
    deepStrictEqual(await pathExists(paths.testFile), true);
    deepStrictEqual(await pathExists(paths.readmeFile), true);
    deepStrictEqual(await pathExists(paths.metadataFile), true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - solution file contains problem title', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    const solutionContent = await readFile(paths.solutionFile, 'utf8');

    ok(solutionContent.includes('Two Sum'));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - test file contains problem examples', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    const testContent = await readFile(paths.testFile, 'utf8');

    // Should contain example data
    ok(testContent.includes('Two Sum'));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - README contains problem description', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    const readmeContent = await readFile(paths.readmeFile, 'utf8');

    ok(readmeContent.includes('Two Sum'));
    ok(readmeContent.includes(mockProblem.description));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - metadata file contains correct data', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    const metadataContent = await readFile(paths.metadataFile, 'utf8');
    const metadata: ProblemWorkspaceMetadata = JSON.parse(metadataContent);

    deepStrictEqual(metadata.problemId, mockProblem.id);
    deepStrictEqual(metadata.slug, mockProblem.slug);
    deepStrictEqual(metadata.language, 'typescript');
    deepStrictEqual(metadata.templateStyle, 'documented');
    ok(metadata.generatedAt != null);
    ok(metadata.lastModified != null);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - overwritePolicy skip skips existing files', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
      overwritePolicy: 'skip',
    };

    // Generate files first time
    const result1 = await generateProblemFiles(options);
    deepStrictEqual(result1.filesCreated.length, 4);
    deepStrictEqual(result1.filesSkipped.length, 0);

    // Generate files second time - should skip
    const result2 = await generateProblemFiles(options);
    deepStrictEqual(result2.filesCreated.length, 0);
    deepStrictEqual(result2.filesSkipped.length, 4);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - overwritePolicy overwrite replaces files', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
      overwritePolicy: 'overwrite',
    };

    // Generate files first time
    const result1 = await generateProblemFiles(options);
    deepStrictEqual(result1.filesCreated.length, 4);

    // Modify a file
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');
    await writeFile(paths.solutionFile, '// Modified content');

    // Generate files second time - should overwrite
    const result2 = await generateProblemFiles(options);
    deepStrictEqual(result2.filesCreated.length, 4);
    deepStrictEqual(result2.filesSkipped.length, 0);

    // Verify file was overwritten
    const content = await readFile(paths.solutionFile, 'utf8');
    deepStrictEqual(content.includes('// Modified content'), false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - overwritePolicy error throws on existing files', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
      overwritePolicy: 'skip',
    };

    // Generate files first time
    await generateProblemFiles(options);

    // Try to generate again with error policy
    const optionsWithError: GenerateProblemFilesOptions = {
      ...options,
      overwritePolicy: 'error',
    };

    await assertRejectsWith(
      async () => {
        await generateProblemFiles(optionsWithError);
      },
      WorkspaceError,
      'File already exists',
    );
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - works for multiple languages', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const languages: SupportedLanguage[] = [
      'typescript',
      'javascript',
      'python',
      'java',
      'cpp',
      'rust',
      'go',
    ];

    for (const language of languages) {
      const options: GenerateProblemFilesOptions = {
        problem: { ...mockProblem, slug: `two-sum-${language}` },
        workspaceRoot,
        language,
        templateStyle: 'minimal',
      };

      const result = await generateProblemFiles(options);
      deepStrictEqual(result.success, true);

      // Expected file count varies per language scaffolding spec.
      // cpp emits: solution, README, metadata, CMakeLists.txt, input.txt,
      //            expected.txt, leetcode.hpp.
      // Other languages emit: solution, test, README, metadata.
      const expectedCount = language === 'cpp' ? 7 : 4;
      deepStrictEqual(
        result.filesCreated.length,
        expectedCount,
        `${language}: expected ${expectedCount} files, got ${result.filesCreated.length}`,
      );
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - handles different template styles', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const styles = ['minimal', 'documented', 'comprehensive'] as const;

    for (const style of styles) {
      const options: GenerateProblemFilesOptions = {
        problem: { ...mockProblem, slug: `two-sum-${style}` },
        workspaceRoot,
        language: 'typescript',
        templateStyle: style,
      };

      const result = await generateProblemFiles(options);
      deepStrictEqual(result.success, true);
      deepStrictEqual(result.filesCreated.length, 4);

      // Verify metadata has correct style
      const metadata = await getProblemMetadata(workspaceRoot, `two-sum-${style}`, 'typescript');
      ok(metadata != null);
      deepStrictEqual(metadata?.templateStyle, style);
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('problemExists - returns true when problem exists', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    await generateProblemFiles(options);

    const exists = await problemExists(workspaceRoot, 'two-sum', 'typescript');
    deepStrictEqual(exists, true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('problemExists - returns false when problem does not exist', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const exists = await problemExists(workspaceRoot, 'non-existent', 'typescript');
    deepStrictEqual(exists, false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('getProblemMetadata - returns metadata for existing problem', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);

    const metadata = await getProblemMetadata(workspaceRoot, 'two-sum', 'typescript');

    ok(metadata != null);
    deepStrictEqual(metadata?.problemId, mockProblem.id);
    deepStrictEqual(metadata?.slug, mockProblem.slug);
    deepStrictEqual(metadata?.language, 'typescript');
    deepStrictEqual(metadata?.templateStyle, 'documented');
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('getProblemMetadata - returns null for non-existent problem', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const metadata = await getProblemMetadata(workspaceRoot, 'non-existent', 'typescript');

    deepStrictEqual(metadata, null);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - creates problem directory structure', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    const result = await generateProblemFiles(options);

    // Check problem directory exists
    const problemDir = result.problemDir;
    ok(problemDir != null);
    deepStrictEqual(await pathExists(problemDir), true);

    // Check it's under the problems subdirectory (use OS-independent path)
    ok(problemDir.includes(join('problems', 'two-sum')));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - handles problem with minimal data', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const minimalProblem: Problem = {
      id: 'minimal-001',
      slug: 'minimal-problem',
      title: 'Minimal Problem',
      difficulty: 'easy',
      description: 'A minimal problem with only required fields.',
      examples: [
        {
          input: { x: 1 },
          output: 2,
        },
      ],
      constraints: [],
      hints: [],
      tags: [],
    };

    const options: GenerateProblemFilesOptions = {
      problem: minimalProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    const result = await generateProblemFiles(options);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.filesCreated.length, 4);

    // Verify files were created and are not empty
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'minimal-problem',
    );

    const solutionContent = await readFile(paths.solutionFile, 'utf8');
    const testContent = await readFile(paths.testFile, 'utf8');
    const readmeContent = await readFile(paths.readmeFile, 'utf8');

    // All files should have some content
    deepStrictEqual(solutionContent.length > 0, true);
    deepStrictEqual(testContent.length > 0, true);
    deepStrictEqual(readmeContent.length > 0, true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - handles special characters in workspace path', async () => {
  // Create a workspace with spaces in the path
  const tempBase = await mkdtemp(join(tmpdir(), 'algo-trainer test-'));
  const workspaceRoot = join(tempBase, 'workspace with spaces');
  await mkdir(workspaceRoot, { recursive: true });

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    const result = await generateProblemFiles(options);

    deepStrictEqual(result.success, true);
    deepStrictEqual(result.filesCreated.length, 4);

    // Verify files exist in the path with spaces
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    deepStrictEqual(await pathExists(paths.solutionFile), true);
    deepStrictEqual(await pathExists(paths.testFile), true);
    deepStrictEqual(await pathExists(paths.readmeFile), true);
    deepStrictEqual(await pathExists(paths.metadataFile), true);
  } finally {
    await cleanupTempWorkspace(tempBase);
  }
});

test('generateProblemFiles - uses platform-specific path separators', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    const result = await generateProblemFiles(options);

    // Verify the returned path uses the correct separator for the platform
    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'typescript' }, 'two-sum');

    // All paths should be under the workspace root
    deepStrictEqual(paths.dir.startsWith(workspaceRoot), true);
    deepStrictEqual(paths.solutionFile.startsWith(workspaceRoot), true);
    deepStrictEqual(paths.testFile.startsWith(workspaceRoot), true);
    deepStrictEqual(paths.readmeFile.startsWith(workspaceRoot), true);

    // Paths should not contain mixed separators
    deepStrictEqual(hasMixedSeparators(result.problemDir), false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - file extensions match language', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const languages: SupportedLanguage[] = [
      'typescript',
      'javascript',
      'python',
      'java',
      'cpp',
      'rust',
      'go',
    ];

    for (const language of languages) {
      const options: GenerateProblemFilesOptions = {
        problem: { ...mockProblem, slug: `test-${language}` },
        workspaceRoot,
        language,
        templateStyle: 'minimal',
      };

      const result = await generateProblemFiles(options);
      deepStrictEqual(result.success, true);

      const paths = getProblemPaths({ rootDir: workspaceRoot, language }, `test-${language}`);

      // Verify solution file has correct extension using the same logic as the implementation
      const expectedExt = getFileExtension(language);
      deepStrictEqual(paths.solutionFile.endsWith(expectedExt), true);
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - cpp scaffolds harness, CMakeLists, input.txt and skips test file', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const cppProblem: Problem = {
      ...mockProblem,
      slug: 'two-sum',
      signatures: { cpp: 'vector<int> twoSum(vector<int>& nums, int target)' },
    };

    const result = await generateProblemFiles({
      problem: cppProblem,
      workspaceRoot,
      language: 'cpp',
      templateStyle: 'documented',
    });

    deepStrictEqual(result.success, true);

    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'cpp' }, 'two-sum');

    // Standard files for cpp scaffolding
    deepStrictEqual(await pathExists(paths.solutionFile), true);
    deepStrictEqual(await pathExists(paths.readmeFile), true);
    deepStrictEqual(await pathExists(paths.metadataFile), true);

    // The standalone test file is intentionally NOT scaffolded for cpp
    deepStrictEqual(await pathExists(paths.testFile), false);

    // Per-problem build + run kit
    const cmakelistsPath = join(paths.dir, 'CMakeLists.txt');
    const inputPath = join(paths.dir, 'input.txt');
    const expectedPath = join(paths.dir, 'expected.txt');
    const harnessPath = join(paths.dir, 'leetcode.hpp');
    deepStrictEqual(await pathExists(cmakelistsPath), true);
    deepStrictEqual(await pathExists(inputPath), true);
    deepStrictEqual(await pathExists(expectedPath), true);
    deepStrictEqual(await pathExists(harnessPath), true);

    // Solution uses the curated signature, the LC_LOCAL guards, and the
    // harness dispatch.
    const solution = await readFile(paths.solutionFile, 'utf8');
    ok(solution.includes('vector<int> twoSum(vector<int>& nums, int target)'));
    ok(solution.includes('using namespace std;'));
    ok(solution.includes('#ifdef LC_LOCAL'));
    ok(solution.includes('#include "leetcode.hpp"'));
    ok(solution.includes('run(&Solution::twoSum, argc, argv);'));

    // CMakeLists names the target after the slug.
    const cmakelists = await readFile(cmakelistsPath, 'utf8');
    ok(cmakelists.includes('project(two-sum'));
    ok(cmakelists.includes('CMAKE_CXX_STANDARD 23'));
    ok(cmakelists.includes('LC_LOCAL'));

    // input.txt is in LeetCode wire format, one example per line.
    const input = await readFile(inputPath, 'utf8');
    ok(input.includes('[2,7,11,15] 9'));
    ok(input.includes('[3,2,4] 6'));

    // expected.txt mirrors what the harness prints when each output is
    // returned in order, separated by `---` lines.
    const expected = await readFile(expectedPath, 'utf8');
    deepStrictEqual(expected, '[0,1]\n---\n[1,2]\n');

    // Harness is the vendored leetcode-driver header.
    const harness = await readFile(harnessPath, 'utf8');
    ok(harness.includes('struct TreeNode'));
    ok(harness.includes('struct ListNode'));
    ok(harness.includes('void run(R (Solution::*fn)(Ts...)'));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

test('generateProblemFiles - cpp falls back to a TODO signature when problem.signatures.cpp is absent', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const result = await generateProblemFiles({
      problem: { ...mockProblem, slug: 'two-sum-no-sig' },
      workspaceRoot,
      language: 'cpp',
      templateStyle: 'minimal',
    });

    deepStrictEqual(result.success, true);

    const paths = getProblemPaths({ rootDir: workspaceRoot, language: 'cpp' }, 'two-sum-no-sig');
    const solution = await readFile(paths.solutionFile, 'utf8');
    ok(solution.includes('auto twoSumNoSig'));
    ok(solution.includes('TODO: declare params'));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});
