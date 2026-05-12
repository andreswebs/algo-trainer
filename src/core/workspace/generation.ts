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
import type {
  Problem,
  SupportedLanguage,
  TemplateConfig,
  UserPreferences,
} from '../../types/global.ts';
import { createErrorContext, WorkspaceError } from '../../utils/errors.ts';
import { createDirectory, pathExists, writeTextFile } from '../../utils/fs.ts';
import {
  EXTRA_OUTPUT_FILES,
  getLanguageScaffolding,
  readSharedAsset,
  renderAllTemplates,
  renderExtraTemplate,
  SHARED_ASSET_OUTPUT_FILES,
  type TemplateContext,
} from '../problem/templates.ts';
import { getProblemPaths } from './files.ts';
import type { ProblemWorkspacePaths, WorkspacePathConfig } from './types.ts';

type Artifact = { path: string; name: string; content: string };

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
  /** Hint levels that have been viewed (0-indexed) */
  hintsUsed?: number[];
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
async function buildArtifacts(
  options: GenerateProblemFilesOptions,
  paths: ProblemWorkspacePaths,
): Promise<Artifact[]> {
  const {
    problem,
    language,
    templateStyle,
    includeImports = true,
    includeTypes = true,
    includeExample = false,
  } = options;

  const templateConfig: TemplateConfig = {
    language,
    style: templateStyle,
    includeImports,
    includeTypes,
    includeExample,
  };
  const context: TemplateContext = { problem, config: templateConfig };
  const scaffolding = getLanguageScaffolding(language);
  const { solution, test, readme } = await renderAllTemplates(context);

  const artifacts: Artifact[] = [
    { path: paths.solutionFile, name: 'solution', content: solution },
    { path: paths.readmeFile, name: 'README', content: readme },
  ];

  if (test !== undefined) {
    artifacts.push({ path: paths.testFile, name: 'test', content: test });
  }

  for (const extraKind of scaffolding.extras) {
    const content = await renderExtraTemplate(context, extraKind);
    artifacts.push({
      path: join(paths.dir, EXTRA_OUTPUT_FILES[extraKind]),
      name: EXTRA_OUTPUT_FILES[extraKind],
      content,
    });
  }

  for (const assetKind of scaffolding.sharedAssets) {
    const content = await readSharedAsset(language, assetKind);
    artifacts.push({
      path: join(paths.dir, SHARED_ASSET_OUTPUT_FILES[assetKind]),
      name: SHARED_ASSET_OUTPUT_FILES[assetKind],
      content,
    });
  }

  const now = new Date().toISOString();
  const metadata: ProblemWorkspaceMetadata = {
    problemId: problem.id,
    slug: problem.slug,
    language,
    generatedAt: now,
    templateStyle,
    lastModified: now,
  };
  artifacts.push({
    path: paths.metadataFile,
    name: 'metadata',
    content: JSON.stringify(metadata, null, 2),
  });

  return artifacts;
}

async function partitionArtifacts(
  artifacts: Artifact[],
  policy: OverwritePolicy,
  problemSlug: string,
): Promise<{ toWrite: Artifact[]; skipped: string[] }> {
  const toWrite: Artifact[] = [];
  const skipped: string[] = [];

  for (const artifact of artifacts) {
    const exists = await pathExists(artifact.path);
    if (!exists || policy === 'overwrite') {
      toWrite.push(artifact);
    } else if (policy === 'error') {
      throw new WorkspaceError(
        `File already exists: ${artifact.name}`,
        createErrorContext('generateProblemFiles', {
          problemSlug,
          filePath: artifact.path,
          overwritePolicy: policy,
        }),
      );
    } else {
      skipped.push(artifact.path);
    }
  }

  return { toWrite, skipped };
}

async function writeArtifacts(artifacts: Artifact[]): Promise<string[]> {
  const created: string[] = [];
  for (const artifact of artifacts) {
    await writeTextFile(artifact.path, artifact.content, { ensureParents: true, overwrite: true });
    created.push(artifact.path);
  }
  return created;
}

export async function generateProblemFiles(
  options: GenerateProblemFilesOptions,
): Promise<GenerationResult> {
  const { problem, workspaceRoot, language, templateStyle, overwritePolicy = 'skip' } = options;

  try {
    const paths = getProblemPaths({ rootDir: workspaceRoot, language }, problem.slug);
    await createDirectory(paths.dir);

    const artifacts = await buildArtifacts(options, paths);
    const { toWrite, skipped } = await partitionArtifacts(artifacts, overwritePolicy, problem.slug);
    const filesCreated = await writeArtifacts(toWrite);

    return { success: true, filesCreated, filesSkipped: skipped, problemDir: paths.dir };
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
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
  } catch (_error) {
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
  } catch (_error) {
    // If there's an error reading/parsing, return null
    return null;
  }
}

/**
 * Update metadata for a problem in the workspace
 *
 * Updates the .problem.json metadata file with new values.
 * This is useful for tracking hint usage and other progress indicators.
 *
 * @param workspaceRoot - Workspace root directory
 * @param slug - Problem slug
 * @param language - Programming language
 * @param updates - Partial metadata updates to apply
 * @returns True if update succeeded, false otherwise
 *
 * @example
 * ```ts
 * const success = await updateProblemMetadata(
 *   '/workspace',
 *   'two-sum',
 *   'typescript',
 *   { hintsUsed: [0, 1] }
 * );
 * ```
 */
export async function updateProblemMetadata(
  workspaceRoot: string,
  slug: string,
  language: SupportedLanguage,
  updates: Partial<ProblemWorkspaceMetadata>,
): Promise<boolean> {
  try {
    const config: WorkspacePathConfig = {
      rootDir: workspaceRoot,
      language,
    };
    const paths = getProblemPaths(config, slug);

    // Read current metadata
    const currentMetadata = await getProblemMetadata(workspaceRoot, slug, language);
    if (!currentMetadata) {
      return false;
    }

    // Merge updates with current metadata
    const updatedMetadata: ProblemWorkspaceMetadata = {
      ...currentMetadata,
      ...updates,
      lastModified: new Date().toISOString(),
    };

    // Write updated metadata
    await writeTextFile(
      paths.metadataFile,
      JSON.stringify(updatedMetadata, null, 2),
      { overwrite: true },
    );

    return true;
  } catch (_error) {
    // If there's an error updating, return false
    return false;
  }
}
