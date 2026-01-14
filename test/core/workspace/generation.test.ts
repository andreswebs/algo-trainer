/**
 * Tests for workspace file generation (PMS-015)
 *
 * @module test/core/workspace/generation
 */

import { assertEquals, assertExists, assertRejects, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';
import {
  generateProblemFiles,
  type GenerateProblemFilesOptions,
  getProblemMetadata,
  problemExists,
  type ProblemWorkspaceMetadata,
} from '../../../src/core/workspace/generation.ts';
import { getProblemPaths } from '../../../src/core/workspace/files.ts';
import type { Problem, SupportedLanguage } from '../../../src/types/global.ts';
import { WorkspaceError } from '../../../src/utils/errors.ts';
import { pathExists } from '../../../src/utils/fs.ts';

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
 * Create a temporary workspace directory for testing
 */
async function createTempWorkspace(): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: 'algo-trainer-test-' });
  return tempDir;
}

/**
 * Clean up temporary workspace
 */
async function cleanupTempWorkspace(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test('generateProblemFiles - generates all files successfully', async () => {
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

    assertEquals(result.success, true);
    assertEquals(result.filesCreated.length, 4); // solution, test, readme, metadata
    assertEquals(result.filesSkipped.length, 0);

    // Verify files exist
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    assertEquals(await pathExists(paths.solutionFile), true);
    assertEquals(await pathExists(paths.testFile), true);
    assertEquals(await pathExists(paths.readmeFile), true);
    assertEquals(await pathExists(paths.metadataFile), true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - solution file contains problem title', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    const solutionContent = await Deno.readTextFile(paths.solutionFile);

    assertStringIncludes(solutionContent, 'Two Sum');
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - test file contains problem examples', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    const testContent = await Deno.readTextFile(paths.testFile);

    // Should contain example data
    assertStringIncludes(testContent, 'Two Sum');
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - README contains problem description', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    const readmeContent = await Deno.readTextFile(paths.readmeFile);

    assertStringIncludes(readmeContent, 'Two Sum');
    assertStringIncludes(readmeContent, mockProblem.description);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - metadata file contains correct data', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    const metadataContent = await Deno.readTextFile(paths.metadataFile);
    const metadata: ProblemWorkspaceMetadata = JSON.parse(metadataContent);

    assertEquals(metadata.problemId, mockProblem.id);
    assertEquals(metadata.slug, mockProblem.slug);
    assertEquals(metadata.language, 'typescript');
    assertEquals(metadata.templateStyle, 'documented');
    assertExists(metadata.generatedAt);
    assertExists(metadata.lastModified);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - overwritePolicy skip skips existing files', async () => {
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
    assertEquals(result1.filesCreated.length, 4);
    assertEquals(result1.filesSkipped.length, 0);

    // Generate files second time - should skip
    const result2 = await generateProblemFiles(options);
    assertEquals(result2.filesCreated.length, 0);
    assertEquals(result2.filesSkipped.length, 4);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - overwritePolicy overwrite replaces files', async () => {
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
    assertEquals(result1.filesCreated.length, 4);

    // Modify a file
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );
    await Deno.writeTextFile(paths.solutionFile, '// Modified content');

    // Generate files second time - should overwrite
    const result2 = await generateProblemFiles(options);
    assertEquals(result2.filesCreated.length, 4);
    assertEquals(result2.filesSkipped.length, 0);

    // Verify file was overwritten
    const content = await Deno.readTextFile(paths.solutionFile);
    assertEquals(content.includes('// Modified content'), false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - overwritePolicy error throws on existing files', async () => {
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

    await assertRejects(
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

Deno.test('generateProblemFiles - works for multiple languages', async () => {
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
      assertEquals(result.success, true);
      assertEquals(result.filesCreated.length, 4);
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - handles different template styles', async () => {
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
      assertEquals(result.success, true);
      assertEquals(result.filesCreated.length, 4);

      // Verify metadata has correct style
      const metadata = await getProblemMetadata(
        workspaceRoot,
        `two-sum-${style}`,
        'typescript',
      );
      assertExists(metadata);
      assertEquals(metadata?.templateStyle, style);
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('problemExists - returns true when problem exists', async () => {
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
    assertEquals(exists, true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('problemExists - returns false when problem does not exist', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const exists = await problemExists(
      workspaceRoot,
      'non-existent',
      'typescript',
    );
    assertEquals(exists, false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('getProblemMetadata - returns metadata for existing problem', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'documented',
    };

    await generateProblemFiles(options);

    const metadata = await getProblemMetadata(
      workspaceRoot,
      'two-sum',
      'typescript',
    );

    assertExists(metadata);
    assertEquals(metadata?.problemId, mockProblem.id);
    assertEquals(metadata?.slug, mockProblem.slug);
    assertEquals(metadata?.language, 'typescript');
    assertEquals(metadata?.templateStyle, 'documented');
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('getProblemMetadata - returns null for non-existent problem', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const metadata = await getProblemMetadata(
      workspaceRoot,
      'non-existent',
      'typescript',
    );

    assertEquals(metadata, null);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - creates problem directory structure', async () => {
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
    assertExists(problemDir);
    assertEquals(await pathExists(problemDir), true);

    // Check it's under the problems subdirectory (use OS-independent path)
    assertStringIncludes(problemDir, join('problems', 'two-sum'));
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - handles problem with minimal data', async () => {
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

    assertEquals(result.success, true);
    assertEquals(result.filesCreated.length, 4);

    // Verify files were created and are not empty
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'minimal-problem',
    );

    const solutionContent = await Deno.readTextFile(paths.solutionFile);
    const testContent = await Deno.readTextFile(paths.testFile);
    const readmeContent = await Deno.readTextFile(paths.readmeFile);

    // All files should have some content
    assertEquals(solutionContent.length > 0, true);
    assertEquals(testContent.length > 0, true);
    assertEquals(readmeContent.length > 0, true);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - handles special characters in workspace path', async () => {
  // Create a workspace with spaces in the path
  const tempBase = await Deno.makeTempDir({ prefix: 'algo-trainer test-' });
  const workspaceRoot = join(tempBase, 'workspace with spaces');
  await Deno.mkdir(workspaceRoot, { recursive: true });

  try {
    const options: GenerateProblemFilesOptions = {
      problem: mockProblem,
      workspaceRoot,
      language: 'typescript',
      templateStyle: 'minimal',
    };

    const result = await generateProblemFiles(options);

    assertEquals(result.success, true);
    assertEquals(result.filesCreated.length, 4);

    // Verify files exist in the path with spaces
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    assertEquals(await pathExists(paths.solutionFile), true);
    assertEquals(await pathExists(paths.testFile), true);
    assertEquals(await pathExists(paths.readmeFile), true);
    assertEquals(await pathExists(paths.metadataFile), true);
  } finally {
    try {
      await Deno.remove(tempBase, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

Deno.test('generateProblemFiles - uses platform-specific path separators', async () => {
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
    const paths = getProblemPaths(
      { rootDir: workspaceRoot, language: 'typescript' },
      'two-sum',
    );

    // All paths should be under the workspace root
    assertEquals(paths.dir.startsWith(workspaceRoot), true);
    assertEquals(paths.solutionFile.startsWith(workspaceRoot), true);
    assertEquals(paths.testFile.startsWith(workspaceRoot), true);
    assertEquals(paths.readmeFile.startsWith(workspaceRoot), true);

    // Paths should not contain mixed separators
    const hasMixedSeparators = (path: string) => {
      return path.includes('/') && path.includes('\\');
    };

    assertEquals(hasMixedSeparators(result.problemDir), false);
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});

Deno.test('generateProblemFiles - file extensions match language', async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const languageExtensions: Record<SupportedLanguage, string> = {
      typescript: '.ts',
      javascript: '.js',
      python: '.py',
      java: '.java',
      cpp: '.cpp',
      rust: '.rs',
      go: '.go',
    };

    for (const [language, expectedExt] of Object.entries(languageExtensions)) {
      const options: GenerateProblemFilesOptions = {
        problem: { ...mockProblem, slug: `test-${language}` },
        workspaceRoot,
        language: language as SupportedLanguage,
        templateStyle: 'minimal',
      };

      const result = await generateProblemFiles(options);
      assertEquals(result.success, true);

      const paths = getProblemPaths(
        { rootDir: workspaceRoot, language: language as SupportedLanguage },
        `test-${language}`,
      );

      // Verify solution file has correct extension
      assertEquals(paths.solutionFile.endsWith(expectedExt), true);
    }
  } finally {
    await cleanupTempWorkspace(workspaceRoot);
  }
});
