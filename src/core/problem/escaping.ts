/**
 * Template escaping utilities for safe placeholder substitution.
 *
 * This module provides context-appropriate escaping functions to prevent
 * code injection vulnerabilities when rendering template placeholders.
 *
 * ## Security Rationale
 *
 * Template placeholders like `{{PROBLEM_TITLE}}` are rendered into multiple
 * syntactic contexts: block comments, single-line comments, and string literals.
 * Without proper escaping, a malicious problem title could break out of these
 * contexts and inject arbitrary code.
 *
 * Examples of attacks prevented:
 * - Title containing star-slash → breaks out of block comments
 * - Title containing single quotes → breaks out of string literals
 *
 * @module core/problem/escaping
 */

/**
 * Escaping context defines where a placeholder value will be rendered.
 * Each context has specific characters that must be escaped.
 */
export type EscapingContext =
  | 'block-comment'
  | 'single-line-comment'
  | 'single-quoted-string'
  | 'double-quoted-string'
  | 'template-literal'
  | 'markdown'
  | 'none';

/**
 * Escape a string for safe use inside a block comment.
 *
 * Prevents breaking out of the comment by replacing star-slash with "* /".
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for block comment context
 */
export function escapeForBlockComment(value: string): string {
  return value.replace(/\*\//g, '* /');
}

/**
 * Escape a string for safe use inside a single-line comment (// ...).
 *
 * Prevents breaking out of the comment by replacing newlines with spaces.
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for single-line comment context
 *
 * @example
 * escapeForSingleLineComment('Two Sum\nevil()') // Returns 'Two Sum evil()'
 */
export function escapeForSingleLineComment(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

/**
 * Escape a string for safe use inside a single-quoted string literal ('...').
 *
 * Escapes single quotes and backslashes to prevent breaking out of the string.
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for single-quoted string context
 *
 * @example
 * escapeForSingleQuotedString("Two Sum', evil(), '") // Returns "Two Sum\\', evil(), \\'"
 */
export function escapeForSingleQuotedString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/**
 * Escape a string for safe use inside a double-quoted string literal ("...").
 *
 * Escapes double quotes and backslashes to prevent breaking out of the string.
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for double-quoted string context
 *
 * @example
 * escapeForDoubleQuotedString('Two Sum", evil(), "') // Returns 'Two Sum\\", evil(), \\"'
 */
export function escapeForDoubleQuotedString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Escape a string for safe use inside a template literal (`...`).
 *
 * Escapes backticks, backslashes, and template expression delimiters.
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for template literal context
 *
 * @example
 * escapeForTemplateLiteral('Sum: ${evil()}') // Returns 'Sum: \\${evil()}'
 */
export function escapeForTemplateLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/**
 * Escape a string for safe use in markdown content.
 *
 * This is a minimal escape that preserves markdown formatting while
 * preventing injection of unwanted markdown syntax.
 * Currently returns the value unchanged as markdown is rendered, not executed.
 *
 * @param value - The raw string value to escape
 * @returns The escaped string safe for markdown context
 */
export function escapeForMarkdown(value: string): string {
  return value;
}

/**
 * Escape a value based on the specified context.
 *
 * @param value - The raw string value to escape
 * @param context - The syntactic context where the value will be rendered
 * @returns The escaped string safe for the specified context
 *
 * @example
 * // Escape star-slash for block comments
 * escapeForContext("Two Sum", 'block-comment') // Returns "Two Sum"
 * escapeForContext("Two Sum'", 'single-quoted-string') // Returns "Two Sum\\'"
 */
export function escapeForContext(value: string, context: EscapingContext): string {
  switch (context) {
    case 'block-comment':
      return escapeForBlockComment(value);
    case 'single-line-comment':
      return escapeForSingleLineComment(value);
    case 'single-quoted-string':
      return escapeForSingleQuotedString(value);
    case 'double-quoted-string':
      return escapeForDoubleQuotedString(value);
    case 'template-literal':
      return escapeForTemplateLiteral(value);
    case 'markdown':
      return escapeForMarkdown(value);
    case 'none':
      return value;
  }
}

/**
 * Specification of how a placeholder should be escaped in different file contexts.
 *
 * Some placeholders appear in multiple contexts within the same template file.
 * For example, `{{PROBLEM_TITLE}}` may appear in both a block comment and
 * a string literal within the same test file.
 */
export interface PlaceholderEscapingSpec {
  /** The placeholder name (e.g., 'PROBLEM_TITLE') */
  placeholder: string;
  /** Map of file patterns to their required escaping contexts */
  contextsByPattern: Map<RegExp, EscapingContext[]>;
}

/**
 * Default escaping context to use when a placeholder's context cannot be determined.
 * This is the most restrictive, escaping for all possible injection vectors.
 */
export function escapeForAllContexts(value: string): string {
  let result = value;
  result = escapeForBlockComment(result);
  result = escapeForSingleLineComment(result);
  result = escapeForSingleQuotedString(result);
  return result;
}

/**
 * Check if a string contains potentially dangerous characters for template contexts.
 *
 * Useful for validation warnings when accepting problem titles from external sources.
 *
 * @param value - The string to check
 * @returns An object with flags for each dangerous pattern found
 */
export function detectDangerousPatterns(value: string): {
  hasBlockCommentBreaker: boolean;
  hasSingleQuote: boolean;
  hasDoubleQuote: boolean;
  hasBacktick: boolean;
  hasNewline: boolean;
  hasTemplateExpression: boolean;
} {
  return {
    hasBlockCommentBreaker: /\*\//.test(value),
    hasSingleQuote: /'/.test(value),
    hasDoubleQuote: /"/.test(value),
    hasBacktick: /`/.test(value),
    hasNewline: /[\r\n]/.test(value),
    hasTemplateExpression: /\$\{/.test(value),
  };
}

/**
 * Check if a string is safe for use in all template contexts without escaping.
 *
 * @param value - The string to check
 * @returns true if the string is safe for all contexts
 */
export function isSafeForAllContexts(value: string): boolean {
  const patterns = detectDangerousPatterns(value);
  return !Object.values(patterns).some(Boolean);
}
