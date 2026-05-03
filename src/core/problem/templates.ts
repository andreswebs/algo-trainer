/**
 * Template rendering system for code generation
 *
 * Provides functionality to resolve template paths and render template files
 * with placeholder substitution for problem-specific content.
 *
 * @module core/problem/templates
 */

import { join } from '@std/path';
import { exists } from '@std/fs';
import type {
  Problem,
  SupportedLanguage,
  TemplateConfig,
  UserPreferences,
} from '../../types/global.ts';
import { createErrorContext, TemplateError } from '../../utils/errors.ts';

/**
 * Template file kind
 */
export type TemplateKind = 'solution' | 'test' | 'readme';

/**
 * Extra (non-style) template files that some languages emit alongside the
 * standard solution/test/readme set.
 *
 * Files of this kind are rendered from `<lang>/_shared/<file>.tpl`.
 *
 * - `cmakelists` → `CMakeLists.txt`
 * - `input`      → `input.txt`
 * - `expected`   → `expected.txt` (golden output for `at run`)
 */
export type ExtraTemplateKind = 'cmakelists' | 'input' | 'expected';

/**
 * Files copied verbatim from `<lang>/_shared/` (no placeholder substitution).
 *
 * - `harness` → `leetcode.hpp` for cpp
 */
export type SharedAssetKind = 'harness';

/**
 * Per-language scaffolding spec. Drives which template kinds a language emits
 * when scaffolding a problem. Defaults to the original behaviour
 * (solution/test/readme) for languages without an explicit override.
 */
export interface LanguageScaffolding {
  /** Style-specific templates rendered with placeholder substitution */
  templates: TemplateKind[];
  /** Extra placeholder-rendered files from `_shared/` */
  extras: ExtraTemplateKind[];
  /** Files copied verbatim from `_shared/` */
  sharedAssets: SharedAssetKind[];
}

const DEFAULT_SCAFFOLDING: LanguageScaffolding = {
  templates: ['solution', 'test', 'readme'],
  extras: [],
  sharedAssets: [],
};

const CPP_SCAFFOLDING: LanguageScaffolding = {
  templates: ['solution', 'readme'],
  extras: ['cmakelists', 'input', 'expected'],
  sharedAssets: ['harness'],
};

/**
 * Resolve the scaffolding spec for a language.
 *
 * For most languages this is the default solution/test/readme set. C++ uses
 * the leetcode-driver-style harness (no separate test file; per-problem CMake
 * + input.txt + vendored leetcode.hpp).
 */
export function getLanguageScaffolding(
  language: SupportedLanguage,
): LanguageScaffolding {
  switch (language) {
    case 'cpp':
      return CPP_SCAFFOLDING;
    default:
      return DEFAULT_SCAFFOLDING;
  }
}

/**
 * File names for `_shared/` template files.
 */
export const SHARED_TEMPLATE_FILES: Record<ExtraTemplateKind, string> = {
  cmakelists: 'cmakelists.tpl',
  input: 'input.tpl',
  expected: 'expected.tpl',
};

/**
 * File names for `_shared/` raw assets (copied verbatim).
 */
export const SHARED_ASSET_FILES: Record<SharedAssetKind, string> = {
  harness: 'leetcode.hpp',
};

/**
 * Output file names produced by extras and shared assets within a problem
 * directory.
 */
export const EXTRA_OUTPUT_FILES: Record<ExtraTemplateKind, string> = {
  cmakelists: 'CMakeLists.txt',
  input: 'input.txt',
  expected: 'expected.txt',
};

export const SHARED_ASSET_OUTPUT_FILES: Record<SharedAssetKind, string> = {
  harness: 'leetcode.hpp',
};

/**
 * Template context containing all data needed for rendering
 */
export interface TemplateContext {
  /** The problem to render */
  problem: Problem;
  /** Template configuration */
  config: TemplateConfig;
  /** Additional custom placeholders (optional) */
  customPlaceholders?: Record<string, string>;
}

/**
 * Template placeholder values
 */
interface PlaceholderValues {
  PROBLEM_TITLE: string;
  PROBLEM_SLUG: string;
  PROBLEM_ID: string;
  PROBLEM_DIFFICULTY: string;
  PROBLEM_DESCRIPTION: string;
  EXAMPLES: string;
  EXAMPLES_LC_INPUT: string;
  EXAMPLES_LC_OUTPUT: string;
  CONSTRAINTS: string;
  HINTS: string;
  TAGS: string;
  COMPANIES: string;
  LANGUAGE: string;
  TEMPLATE_STYLE: string;
  LEETCODE_URL: string;
  DATE: string;
  FUNCTION_NAME: string;
  CLASS_NAME: string;
  SIGNATURE: string;
  FILE_EXTENSION: string;
}

/**
 * Get the file extension for a given language
 */
function getFileExtension(language: SupportedLanguage): string {
  const extensions: Record<SupportedLanguage, string> = {
    typescript: '.ts',
    javascript: '.js',
    python: '.py',
    java: '.java',
    cpp: '.cpp',
    go: '.go',
    rust: '.rs',
  };
  return extensions[language];
}

/**
 * Get the base templates directory path
 */
function getTemplatesBaseDir(): string {
  // Templates are in src/data/templates
  // From src/core/problem/ we need to go up two levels to src/, then into data/templates
  const moduleDir = new URL('.', import.meta.url).pathname;
  return join(moduleDir, '../../data/templates');
}

/**
 * Resolve a path inside the language's `_shared/` directory.
 *
 * Used for files that are not style-specific (e.g. CMakeLists.txt, input.txt,
 * leetcode.hpp for cpp). Does NOT validate existence — callers handle that.
 */
export function resolveSharedTemplatePath(
  language: SupportedLanguage,
  fileName: string,
): string {
  return join(getTemplatesBaseDir(), language, '_shared', fileName);
}

/**
 * Resolve the template file path for a given language, style, and kind
 *
 * @param language - The programming language
 * @param style - The template style (minimal, documented, comprehensive)
 * @param kind - The template kind (solution, test, readme)
 * @returns The absolute path to the template file
 *
 * @throws {TemplateError} If the template file does not exist
 *
 * @example
 * ```ts
 * const path = await resolveTemplatePath('typescript', 'minimal', 'solution');
 * // Returns: /path/to/src/data/templates/typescript/minimal/solution.tpl
 * ```
 */
export async function resolveTemplatePath(
  language: SupportedLanguage,
  style: UserPreferences['templateStyle'],
  kind: TemplateKind,
): Promise<string> {
  const baseDir = getTemplatesBaseDir();
  const templatePath = join(baseDir, language, style, `${kind}.tpl`);

  if (!(await exists(templatePath))) {
    throw new TemplateError(
      `Template file not found: ${kind}.tpl`,
      createErrorContext('resolveTemplatePath', {
        language,
        style,
        kind,
        expectedPath: templatePath,
      }),
    );
  }

  return templatePath;
}

/**
 * Convert a problem slug to a valid class name (PascalCase)
 *
 * Converts kebab-case slugs to PascalCase class names.
 *
 * @param slug - The problem slug
 * @returns A PascalCase class name
 *
 * @example
 * ```ts
 * slugToClassName('two-sum') // 'TwoSum'
 * slugToClassName('3sum-closest') // 'ThreeSumClosest'
 * ```
 */
export function slugToClassName(slug: string): string {
  return slug
    .split('-')
    .map((word) => {
      const digitWords = [
        'zero',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
      ];

      // Find where digits end
      const digitMatch = word.match(/^\d+/);

      if (digitMatch) {
        const digits = digitMatch[0];
        const remainder = word.slice(digits.length);

        // Convert each digit to a word and capitalize all
        const convertedDigits = digits.split('').map((d) => {
          const digitWord = digitWords[Number.parseInt(d, 10)];
          return digitWord.charAt(0).toUpperCase() + digitWord.slice(1);
        }).join('');

        // Capitalize the first letter of the remainder if it exists
        const capitalizedRemainder = remainder
          ? remainder.charAt(0).toUpperCase() + remainder.slice(1)
          : '';

        return convertedDigits + capitalizedRemainder;
      }

      // No digits, capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/**
 * Convert a problem slug to a valid function name
 *
 * Converts kebab-case to camelCase and removes special characters
 *
 * @param slug - The problem slug
 * @returns A valid function name
 *
 * @example
 * ```ts
 * slugToFunctionName('two-sum') // 'twoSum'
 * slugToFunctionName('3sum-closest') // 'threeSumClosest'
 * ```
 */
export function slugToFunctionName(slug: string): string {
  return slug
    .split('-')
    .map((word, wordIndex) => {
      const digitWords = [
        'zero',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
      ];

      // Find where digits end
      const digitMatch = word.match(/^\d+/);

      if (digitMatch) {
        const digits = digitMatch[0];
        const remainder = word.slice(digits.length);

        // Convert each digit to a word
        const convertedDigits = digits.split('').map((d, digitIndex) => {
          const digitWord = digitWords[parseInt(d, 10)];
          // Capitalize each digit word except the very first one
          const shouldCapitalize = !(wordIndex === 0 && digitIndex === 0);
          return shouldCapitalize
            ? digitWord.charAt(0).toUpperCase() + digitWord.slice(1)
            : digitWord;
        }).join('');

        // Capitalize the first letter of the remainder if it exists
        const capitalizedRemainder = remainder
          ? remainder.charAt(0).toUpperCase() + remainder.slice(1)
          : '';

        return convertedDigits + capitalizedRemainder;
      }

      // No digits, just capitalize first letter if not the first word
      return wordIndex === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/**
 * Format examples for display in templates
 *
 * @param problem - The problem containing examples
 * @returns Formatted examples string
 *
 * @example
 * ```ts
 * const formatted = formatExamples(problem);
 * // Returns:
 * // Example 1:
 * // Input: nums = [2, 7, 11, 15], target = 9
 * // Output: [0, 1]
 * // Explanation: Because nums[0] + nums[1] == 9...
 * ```
 */
export function formatExamples(problem: Problem): string {
  if (!problem.examples || problem.examples.length === 0) {
    return 'No examples provided.';
  }

  return problem.examples
    .map((example, index) => {
      const lines: string[] = [`Example ${index + 1}:`];

      // Format input
      const inputEntries = Object.entries(example.input);
      if (inputEntries.length === 1) {
        const [key, value] = inputEntries[0];
        lines.push(`Input: ${key} = ${JSON.stringify(value)}`);
      } else {
        const inputParts = inputEntries
          .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
          .join(', ');
        lines.push(`Input: ${inputParts}`);
      }

      // Format output
      lines.push(`Output: ${JSON.stringify(example.output)}`);

      // Add explanation if present
      if (example.explanation) {
        lines.push(`Explanation: ${example.explanation}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Format constraints as a bulleted list
 *
 * @param constraints - Array of constraint strings
 * @returns Formatted constraints string
 */
export function formatConstraints(constraints: string[]): string {
  if (!constraints || constraints.length === 0) {
    return 'No constraints specified.';
  }

  return constraints.map((constraint) => `- ${constraint}`).join('\n');
}

/**
 * Format hints as a numbered list
 *
 * @param hints - Array of hint strings
 * @returns Formatted hints string
 */
export function formatHints(hints: string[]): string {
  if (!hints || hints.length === 0) {
    return 'No hints available.';
  }

  return hints.map((hint, index) => `${index + 1}. ${hint}`).join('\n');
}

/**
 * Format tags as a comma-separated list
 *
 * @param tags - Array of tag strings
 * @returns Formatted tags string
 */
export function formatTags(tags: string[]): string {
  if (!tags || tags.length === 0) {
    return 'None';
  }

  return tags.join(', ');
}

/**
 * Format companies as a comma-separated list
 *
 * @param companies - Array of company strings
 * @returns Formatted companies string
 */
export function formatCompanies(companies?: string[]): string {
  if (!companies || companies.length === 0) {
    return 'None';
  }

  return companies.join(', ');
}

/**
 * Format a single value in LeetCode wire format.
 *
 * Used by the leetcode-driver-style harness for parsing stdin/file input.
 * Matches the format documented in the harness:
 *   - arrays  → `[a,b,c]` (no spaces, recursive)
 *   - strings → `"hello"`
 *   - numbers → bare digits
 *   - bools   → `true` / `false`
 *   - null    → `null` (used as placeholder in TreeNode arrays)
 */
export function formatLCValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(formatLCValue).join(',') + ']';
  }
  throw new Error(
    `Cannot format value for LC input (unsupported type ${typeof value}): ${JSON.stringify(value)}`,
  );
}

/**
 * Format all examples as LeetCode wire-format input lines.
 *
 * Each example becomes one whitespace-separated line of values, in the order
 * they appear in `example.input`. This matches what `run(...)` expects to read
 * from stdin or `input.txt`.
 *
 * Example for two-sum:
 *   `[2,7,11,15] 9`
 *   `[3,2,4] 6`
 */
export function formatExamplesAsLCInput(problem: Problem): string {
  if (!problem.examples || problem.examples.length === 0) {
    return '';
  }
  return problem.examples
    .map((ex) => Object.values(ex.input).map(formatLCValue).join(' '))
    .join('\n');
}

/**
 * Format all example outputs as the harness would print them, joined with the
 * `---` separator line.
 *
 * For an N-example problem the harness produces:
 *   `<o1>\n---\n<o2>\n...\n---\n<oN>\n`
 *
 * This formatter returns `<o1>\n---\n<o2>\n---\n<oN>` (no trailing newline);
 * the surrounding template adds the final `\n` so the file matches the binary
 * output byte-for-byte.
 */
export function formatExamplesAsLCOutput(problem: Problem): string {
  if (!problem.examples || problem.examples.length === 0) {
    return '';
  }
  return problem.examples
    .map((ex) => formatLCValue(ex.output))
    .join('\n---\n');
}

/**
 * Resolve the per-language signature for a problem.
 *
 * Returns the curated signature from `problem.signatures[language]` when
 * present. Falls back to a TODO placeholder so the rendered template at
 * least compiles after the user fills in the declaration.
 */
export function resolveSignature(
  problem: Problem,
  language: SupportedLanguage,
): string {
  const sig = problem.signatures?.[language]?.trim();
  if (sig) {
    return sig;
  }
  return `auto ${slugToFunctionName(problem.slug)}(/* TODO: declare params */)`;
}

/**
 * Build placeholder values from template context
 *
 * @param context - The template context
 * @returns Object containing all placeholder values
 */
function buildPlaceholderValues(context: TemplateContext): PlaceholderValues {
  const { problem, config } = context;

  return {
    PROBLEM_TITLE: problem.title,
    PROBLEM_SLUG: problem.slug,
    PROBLEM_ID: problem.id,
    PROBLEM_DIFFICULTY: problem.difficulty,
    PROBLEM_DESCRIPTION: problem.description,
    EXAMPLES: formatExamples(problem),
    EXAMPLES_LC_INPUT: formatExamplesAsLCInput(problem),
    EXAMPLES_LC_OUTPUT: formatExamplesAsLCOutput(problem),
    CONSTRAINTS: formatConstraints(problem.constraints),
    HINTS: formatHints(problem.hints),
    TAGS: formatTags(problem.tags),
    COMPANIES: formatCompanies(problem.companies),
    LANGUAGE: config.language,
    TEMPLATE_STYLE: config.style,
    LEETCODE_URL: problem.leetcodeUrl || 'N/A',
    DATE: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    FUNCTION_NAME: slugToFunctionName(problem.slug),
    CLASS_NAME: slugToClassName(problem.slug),
    SIGNATURE: resolveSignature(problem, config.language),
    FILE_EXTENSION: getFileExtension(config.language),
  };
}

/**
 * Replace placeholders in template content
 *
 * Replaces all occurrences of {{PLACEHOLDER_NAME}} with corresponding values.
 * Unknown placeholders will throw an error by default.
 *
 * @param content - The template content with placeholders
 * @param values - The placeholder values
 * @param allowUnknown - If true, unknown placeholders are left as-is instead of throwing error
 * @returns Content with placeholders replaced
 *
 * @throws {TemplateError} If unknown placeholders are found and allowUnknown is false
 */
export function replacePlaceholders(
  content: string,
  values: Record<string, string>,
  allowUnknown = false,
): string {
  // Find all placeholders in the content
  const placeholderRegex = /\{\{([A-Z_]+)\}\}/g;
  const foundPlaceholders = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    foundPlaceholders.add(match[1]);
  }

  // Check for unknown placeholders
  if (!allowUnknown) {
    const unknownPlaceholders = Array.from(foundPlaceholders).filter(
      (placeholder) => !(placeholder in values),
    );

    if (unknownPlaceholders.length > 0) {
      throw new TemplateError(
        `Unknown placeholders found in template: ${unknownPlaceholders.join(', ')}`,
        createErrorContext('replacePlaceholders', {
          unknownPlaceholders,
          knownPlaceholders: Object.keys(values),
        }),
      );
    }
  }

  // Replace all placeholders
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, value);
  }

  return result;
}

/**
 * Render a template file with problem data
 *
 * Resolves the template path, reads the file, and replaces all placeholders
 * with values from the problem and config.
 *
 * @param context - Template context containing problem and config
 * @param kind - The kind of template to render (solution, test, readme)
 * @returns Rendered template content
 *
 * @throws {TemplateError} If template file is not found or rendering fails
 *
 * @example
 * ```ts
 * const context: TemplateContext = {
 *   problem: myProblem,
 *   config: {
 *     language: 'typescript',
 *     style: 'minimal',
 *     includeImports: true,
 *     includeTypes: true,
 *     includeExample: false,
 *   },
 * };
 *
 * const solutionCode = await renderTemplate(context, 'solution');
 * ```
 */
export async function renderTemplate(
  context: TemplateContext,
  kind: TemplateKind,
): Promise<string> {
  try {
    // Resolve template path
    const templatePath = await resolveTemplatePath(
      context.config.language,
      context.config.style,
      kind,
    );

    // Read template file
    const templateContent = await Deno.readTextFile(templatePath);

    // Build placeholder values
    const placeholderValues = buildPlaceholderValues(context);

    // Merge with custom placeholders if provided
    const allValues = {
      ...placeholderValues,
      ...context.customPlaceholders,
    };

    // Replace placeholders
    const rendered = replacePlaceholders(templateContent, allValues, false);

    return rendered;
  } catch (error) {
    if (error instanceof TemplateError) {
      throw error;
    }

    throw new TemplateError(
      `Failed to render template: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('renderTemplate', {
        language: context.config.language,
        style: context.config.style,
        kind,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Render an extra (shared, non-style) template file with placeholder
 * substitution. Used for cpp's `CMakeLists.txt` and `input.txt`.
 *
 * @throws {TemplateError} If the file is missing or rendering fails.
 */
export async function renderExtraTemplate(
  context: TemplateContext,
  kind: ExtraTemplateKind,
): Promise<string> {
  try {
    const fileName = SHARED_TEMPLATE_FILES[kind];
    const templatePath = resolveSharedTemplatePath(context.config.language, fileName);

    if (!(await exists(templatePath))) {
      throw new TemplateError(
        `Shared template file not found: ${fileName}`,
        createErrorContext('renderExtraTemplate', {
          language: context.config.language,
          kind,
          expectedPath: templatePath,
        }),
      );
    }

    const templateContent = await Deno.readTextFile(templatePath);
    const placeholderValues = buildPlaceholderValues(context);
    const allValues = {
      ...placeholderValues,
      ...context.customPlaceholders,
    };
    return replacePlaceholders(templateContent, allValues, false);
  } catch (error) {
    if (error instanceof TemplateError) {
      throw error;
    }

    throw new TemplateError(
      `Failed to render extra template: ${error instanceof Error ? error.message : String(error)}`,
      createErrorContext('renderExtraTemplate', {
        language: context.config.language,
        kind,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Read a shared asset file verbatim (no placeholder substitution).
 *
 * @throws {TemplateError} If the asset file is missing.
 */
export async function readSharedAsset(
  language: SupportedLanguage,
  kind: SharedAssetKind,
): Promise<string> {
  const fileName = SHARED_ASSET_FILES[kind];
  const assetPath = resolveSharedTemplatePath(language, fileName);

  if (!(await exists(assetPath))) {
    throw new TemplateError(
      `Shared asset not found: ${fileName}`,
      createErrorContext('readSharedAsset', {
        language,
        kind,
        expectedPath: assetPath,
      }),
    );
  }

  return await Deno.readTextFile(assetPath);
}

/**
 * Render all scaffolding template files for a problem.
 *
 * Renders only the kinds listed by the language's scaffolding spec. For most
 * languages this is `solution`, `test`, and `readme`; for cpp it is `solution`
 * and `readme` only (the test slot is replaced by the input.txt + leetcode.hpp
 * harness).
 *
 * @throws {TemplateError} If any template fails to render
 */
export async function renderAllTemplates(
  context: TemplateContext,
): Promise<{
  solution: string;
  test?: string;
  readme: string;
}> {
  const scaffolding = getLanguageScaffolding(context.config.language);

  const renderIfPresent = async (
    kind: TemplateKind,
  ): Promise<string | undefined> => {
    if (!scaffolding.templates.includes(kind)) return undefined;
    return await renderTemplate(context, kind);
  };

  const [solution, test, readme] = await Promise.all([
    renderTemplate(context, 'solution'),
    renderIfPresent('test'),
    renderTemplate(context, 'readme'),
  ]);

  const result: { solution: string; test?: string; readme: string } = {
    solution,
    readme,
  };
  if (test !== undefined) {
    result.test = test;
  }
  return result;
}
