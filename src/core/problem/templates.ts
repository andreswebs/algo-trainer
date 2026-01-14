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
          const digitWord = digitWords[parseInt(d, 10)];
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
 * Render all template files for a problem
 *
 * Convenience function to render solution, test, and readme templates in one call.
 *
 * @param context - Template context containing problem and config
 * @returns Object containing rendered solution, test, and readme content
 *
 * @throws {TemplateError} If any template fails to render
 *
 * @example
 * ```ts
 * const { solution, test, readme } = await renderAllTemplates(context);
 * ```
 */
export async function renderAllTemplates(
  context: TemplateContext,
): Promise<{
  solution: string;
  test: string;
  readme: string;
}> {
  const [solution, test, readme] = await Promise.all([
    renderTemplate(context, 'solution'),
    renderTemplate(context, 'test'),
    renderTemplate(context, 'readme'),
  ]);

  return { solution, test, readme };
}
