/**
 * Workspace file generation for problems (PMS-015)
 *
 * Provides functionality to generate solution, test, and README files
 * for problems in the workspace, using the template rendering system.
 *
 * ## Features
 *
 * - Generate all three file types (solution, test, README) for a problem
 * - Language-specific file naming and paths
 * - Configurable overwrite policies
 * - Metadata file generation for tracking problem progress
 * - Integration with template renderer (PMS-010) and workspace manager (PMS-014)
 *
 * ## Security
 *
 * - All paths are validated before file operations
 * - Files are only created within workspace boundaries
 * - Safe error handling for file system operations
 *
 * @module core/workspace/generation
 *
 * @example
 * ```ts
 * import { generateProblemFiles } from './workspace/generation.ts';
 * import { ProblemManager } from '../problem/manager.ts';
 *
 * const manager = new ProblemManager();
 * await manager.init();
 * const problem = manager.getBySlug('two-sum');
 *
 * const result = await generateProblemFiles({
 *   problem,
 *   workspaceRoot: '/home/user/workspace',
 *   language: 'typescript',
 *   templateStyle: 'documented',
 *   overwritePolicy: 'skip',
 * });
 * ```
 */

import { join } from '@std/path';
import type { Problem, SupportedLanguage, TemplateConfig, UserPreferences } from '../../types/global.ts';
import { createErrorContext, WorkspaceError } from '../../utils/errors.ts';
import { createDirectory, pathExists, writeTextFile } from '../../utils/fs.ts';
import { renderAllTemplates, type TemplateContext } from '../problem/templates.ts';
import { getProblemPaths } from './files.ts';
import type { WorkspacePathConfig } from './types.ts';

/**
 * Overwrite policy for file generation
 *
 * - `skip`: Skip files that already exist (no error)
 * - `overwrite`: Overwrite files that already exist
 * - `error`: Throw an error if files already exist
 */
export type OverwritePolicy = 'skip' | 'overwrite' | 'error';

/**
 * Options for generating problem files
 */
export interface GenerateProblemFilesOptions {
  /** The problem to generate files for */
  problem: Problem;
  /** Workspace root directory */
  workspaceRoot: string;
  /** Programming language */
  language: SupportedLanguage;
  /** Template style */
  templateStyle: UserPreferences['templateStyle'];
  /** Overwrite policy for existing files (default: 'skip') */
  overwritePolicy?: OverwritePolicy;
  /** Whether to include imports in templates (default: true) */
  includeImports?: boolean;
  /** Whether to include type annotations (default: true) */
  includeTypes?: boolean;
  /** Whether to include example usage (default: false) */
  includeExample?: boolean;
}

/**
 * Metadata stored in .problem.json file
 *
 * This file tracks the problem instance in the workspace and stores
 * information about when it was generated and with what configuration.
 */
export interface ProblemWorkspaceMetadata {
  /** Problem ID */
  problemId: string;
  /** Problem slug */
  slug: string;
  /** Programming language */
  language: SupportedLanguage;
  /** When the files were generated */
  generatedAt: string; // ISO-8601
  /** Template style used */
  templateStyle: UserPreferences['templateStyle'];
  /** When last modified (initially same as generatedAt) */
  lastModified: string; // ISO-8601
}

/**
 * Result of file generation operation
 */
export interface GenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Files that were created */
  filesCreated: string[];
  /** Files that were skipped (already existed) */
  filesSkipped: string[];
  /** Error message if generation failed */
  error?: string;
  /** Problem directory path */
  problemDir: string;
}

/**
 * Generate all files (solution, test, README, metadata) for a problem
 *
 * Creates a directory for the problem and generates all necessary files
 * using the template rendering system. Handles overwrite policies and
 * creates metadata for tracking.
 *
 * @param options - File generation options
 * @returns Result containing created/skipped files and status
 * @throws {WorkspaceError} If file generation fails
 *
 * @example
 * ```ts
 * const result = await generateProblemFiles({
 *   problem: myProblem,
 *   workspaceRoot: '/workspace',
 *   language: 'typescript',
 *   templateStyle: 'documented',
 *   overwritePolicy: 'skip',
 * });
 *
 * console.log(`Created ${result.filesCreated.length} files`);
 * console.log(`Skipped ${result.filesSkipped.length} files`);
 * ```
 */
export async function generateProblemFiles(
  options: GenerateProblemFilesOptions,
): Promise<GenerationResult> {
  const {
    problem,
    workspaceRoot,
    language,
    templateStyle,
    overwritePolicy = 'skip',
    includeImports = true,
    includeTypes = true,
    includeExample = false,
  } = options;

  const filesCreated: string[] = [];
  const filesSkipped: string[] = [];

  try {
    // Resolve paths for the problem
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };
    const paths = getProblemPaths(config, problem.slug);

    // Create problem directory
    await createDirectory(paths.dir);

    // Check existing files and apply overwrite policy
    const filesToGenerate = [
      { path: paths.solutionFile, name: 'solution' },
      { path: paths.testFile, name: 'test' },
      { path: paths.readmeFile, name: 'README' },
      { path: paths.metadataFile, name: 'metadata' },
    ];

    for (const file of filesToGenerate) {
      const exists = await pathExists(file.path);
      if (exists) {
        if (overwritePolicy === 'error') {
          throw new WorkspaceError(
            `File already exists: ${file.name}`,
            createErrorContext('generateProblemFiles', {
              problemSlug: problem.slug,
              filePath: file.path,
              overwritePolicy,
            }),
          );
        } else if (overwritePolicy === 'skip') {
          filesSkipped.push(file.path);
        }
      }
    }

    // Build template context
    const templateConfig: TemplateConfig = {
      language,
      style: templateStyle,
      includeImports,
      includeTypes,
      includeExample,
    };

    const templateContext: TemplateContext = {
      problem,
      config: templateConfig,
    };

    // Render all templates
    const { solution, test, readme } = await renderAllTemplates(templateContext);

    // Write files (respecting overwrite policy)
    const shouldOverwrite = overwritePolicy === 'overwrite';

    // Write solution file
    if (shouldOverwrite || !filesSkipped.includes(paths.solutionFile)) {
      await writeTextFile(paths.solutionFile, solution, {
        ensureParents: true,
        overwrite: shouldOverwrite,
      });
      filesCreated.push(paths.solutionFile);
    }

    // Write test file
    if (shouldOverwrite || !filesSkipped.includes(paths.testFile)) {
      await writeTextFile(paths.testFile, test, {
        ensureParents: true,
        overwrite: shouldOverwrite,
      });
      filesCreated.push(paths.testFile);
    }

    // Write README file
    if (shouldOverwrite || !filesSkipped.includes(paths.readmeFile)) {
      await writeTextFile(paths.readmeFile, readme, {
        ensureParents: true,
        overwrite: shouldOverwrite,
      });
      filesCreated.push(paths.readmeFile);
    }

    // Write metadata file
    if (shouldOverwrite || !filesSkipped.includes(paths.metadataFile)) {
      const metadata: ProblemWorkspaceMetadata = {
        problemId: problem.id,
        slug: problem.slug,
        language,
        generatedAt: new Date().toISOString(),
        templateStyle,
        lastModified: new Date().toISOString(),
      };

      await writeTextFile(
        paths.metadataFile,
        JSON.stringify(metadata, null, 2),
        {
          ensureParents: true,
          overwrite: shouldOverwrite,
        },
      );
      filesCreated.push(paths.metadataFile);
    }

    return {
      success: true,
      filesCreated,
      filesSkipped,
      problemDir: paths.dir,
    };
  } catch (error) {
    // If it's already a WorkspaceError, let it propagate
    if (error instanceof WorkspaceError) {
      throw error;
    }

    // Otherwise, wrap in WorkspaceError
    throw new WorkspaceError(
      `Failed to generate problem files: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('generateProblemFiles', {
        problemSlug: problem.slug,
        language,
        templateStyle,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Check if a problem already exists in the workspace
 *
 * Checks if the problem directory exists and contains the expected files.
 *
 * @param workspaceRoot - Workspace root directory
 * @param slug - Problem slug
 * @param language - Programming language
 * @returns True if problem files exist, false otherwise
 *
 * @example
 * ```ts
 * const exists = await problemExists('/workspace', 'two-sum', 'typescript');
 * if (exists) {
 *   console.log('Problem already exists in workspace');
 * }
 * ```
 */
export async function problemExists(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
): Promise<boolean> {
  try {
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };
    const paths = getProblemPaths(config, slug);

    // Check if at least the solution file exists
    // (could also check for all files, but solution is the minimum)
    return await pathExists(paths.solutionFile);
  } catch (error) {
    // If there's an error checking, assume it doesn't exist
    return false;
  }
}

/**
 * Get metadata for a problem in the workspace
 *
 * Reads and parses the .problem.json metadata file.
 *
 * @param workspaceRoot - Workspace root directory
 * @param slug - Problem slug
 * @param language - Programming language
 * @returns Problem metadata, or null if not found
 *
 * @example
 * ```ts
 * const metadata = await getProblemMetadata('/workspace', 'two-sum', 'typescript');
 * if (metadata) {
 *   console.log(`Generated at: ${metadata.generatedAt}`);
 * }
 * ```
 */
export async function getProblemMetadata(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
): Promise<ProblemWorkspaceMetadata | null> {
  try {
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };
    const paths = getProblemPaths(config, slug);

    if (!(await pathExists(paths.metadataFile))) {
      return null;
    }

    const content = await Deno.readTextFile(paths.metadataFile);
    return JSON.parse(content) as ProblemWorkspaceMetadata;
  } catch (error) {
    // If there's an error reading/parsing, return null
    return null;
  }
}
