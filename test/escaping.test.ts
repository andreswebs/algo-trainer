/**
 * Tests for template escaping utilities
 *
 * @module tests/escaping
 */

import { assertEquals } from '@std/assert';
import {
  detectDangerousPatterns,
  escapeForAllContexts,
  escapeForBlockComment,
  escapeForContext,
  escapeForDoubleQuotedString,
  escapeForSingleLineComment,
  escapeForSingleQuotedString,
  escapeForTemplateLiteral,
  isSafeForAllContexts,
} from '../src/core/problem/escaping.ts';

Deno.test('escapeForBlockComment - should escape */ sequences', () => {
  assertEquals(escapeForBlockComment('Two Sum'), 'Two Sum');
  assertEquals(escapeForBlockComment('Sum */'), 'Sum * /');
  assertEquals(escapeForBlockComment('A */ B */ C'), 'A * / B * / C');
  assertEquals(escapeForBlockComment('*/'), '* /');
});

Deno.test('escapeForBlockComment - should handle injection attack', () => {
  const malicious = 'Two Sum */ alert("hacked"); /*';
  const escaped = escapeForBlockComment(malicious);
  assertEquals(escaped, 'Two Sum * / alert("hacked"); /*');
});

Deno.test('escapeForSingleLineComment - should escape newlines', () => {
  assertEquals(escapeForSingleLineComment('Two Sum'), 'Two Sum');
  assertEquals(escapeForSingleLineComment('Line1\nLine2'), 'Line1 Line2');
  assertEquals(escapeForSingleLineComment('A\r\nB'), 'A B');
  assertEquals(escapeForSingleLineComment('A\n\n\nB'), 'A B');
});

Deno.test('escapeForSingleQuotedString - should escape single quotes', () => {
  assertEquals(escapeForSingleQuotedString('Two Sum'), 'Two Sum');
  assertEquals(escapeForSingleQuotedString("It's"), "It\\'s");
  assertEquals(escapeForSingleQuotedString("'test'"), "\\'test\\'");
});

Deno.test('escapeForSingleQuotedString - should escape backslashes', () => {
  assertEquals(escapeForSingleQuotedString('path\\to\\file'), 'path\\\\to\\\\file');
  assertEquals(escapeForSingleQuotedString("test\\'"), "test\\\\\\'");
});

Deno.test('escapeForSingleQuotedString - should handle injection attack', () => {
  const malicious = "Two Sum', () => { evil() }); describe('X";
  const escaped = escapeForSingleQuotedString(malicious);
  assertEquals(escaped, "Two Sum\\', () => { evil() }); describe(\\'X");
});

Deno.test('escapeForDoubleQuotedString - should escape double quotes', () => {
  assertEquals(escapeForDoubleQuotedString('Two Sum'), 'Two Sum');
  assertEquals(escapeForDoubleQuotedString('Say "hello"'), 'Say \\"hello\\"');
});

Deno.test('escapeForDoubleQuotedString - should escape backslashes', () => {
  assertEquals(escapeForDoubleQuotedString('path\\to\\file'), 'path\\\\to\\\\file');
});

Deno.test('escapeForTemplateLiteral - should escape backticks', () => {
  assertEquals(escapeForTemplateLiteral('Two Sum'), 'Two Sum');
  assertEquals(escapeForTemplateLiteral('`code`'), '\\`code\\`');
});

Deno.test('escapeForTemplateLiteral - should escape template expressions', () => {
  assertEquals(escapeForTemplateLiteral('Result: ${value}'), 'Result: \\${value}');
  assertEquals(escapeForTemplateLiteral('${evil()}'), '\\${evil()}');
});

Deno.test('escapeForTemplateLiteral - should escape backslashes', () => {
  assertEquals(escapeForTemplateLiteral('\\n'), '\\\\n');
});

Deno.test('escapeForContext - should route to correct escape function', () => {
  const input = "Two Sum */ '";

  assertEquals(escapeForContext(input, 'block-comment'), "Two Sum * / '");
  assertEquals(escapeForContext(input, 'single-quoted-string'), "Two Sum */ \\'");
  assertEquals(escapeForContext(input, 'none'), input);
});

Deno.test('escapeForContext - should handle all context types', () => {
  const input = 'test';

  assertEquals(escapeForContext(input, 'block-comment'), 'test');
  assertEquals(escapeForContext(input, 'single-line-comment'), 'test');
  assertEquals(escapeForContext(input, 'single-quoted-string'), 'test');
  assertEquals(escapeForContext(input, 'double-quoted-string'), 'test');
  assertEquals(escapeForContext(input, 'template-literal'), 'test');
  assertEquals(escapeForContext(input, 'markdown'), 'test');
  assertEquals(escapeForContext(input, 'none'), 'test');
});

Deno.test('escapeForAllContexts - should escape for all dangerous contexts', () => {
  const malicious = "Two Sum */ 'evil'\ninjected";
  const escaped = escapeForAllContexts(malicious);

  assertEquals(escaped.includes('*/'), false);
  assertEquals(escaped.includes('\n'), false);
  assertEquals(escaped.includes("\\'"), true);
});

Deno.test('detectDangerousPatterns - should detect all dangerous patterns', () => {
  const patterns = detectDangerousPatterns('test */ \' " ` \n ${x}');

  assertEquals(patterns.hasBlockCommentBreaker, true);
  assertEquals(patterns.hasSingleQuote, true);
  assertEquals(patterns.hasDoubleQuote, true);
  assertEquals(patterns.hasBacktick, true);
  assertEquals(patterns.hasNewline, true);
  assertEquals(patterns.hasTemplateExpression, true);
});

Deno.test('detectDangerousPatterns - should return false for safe strings', () => {
  const patterns = detectDangerousPatterns('Two Sum');

  assertEquals(patterns.hasBlockCommentBreaker, false);
  assertEquals(patterns.hasSingleQuote, false);
  assertEquals(patterns.hasDoubleQuote, false);
  assertEquals(patterns.hasBacktick, false);
  assertEquals(patterns.hasNewline, false);
  assertEquals(patterns.hasTemplateExpression, false);
});

Deno.test('isSafeForAllContexts - should return true for safe strings', () => {
  assertEquals(isSafeForAllContexts('Two Sum'), true);
  assertEquals(isSafeForAllContexts('Valid Problem Title'), true);
  assertEquals(isSafeForAllContexts('123-abc'), true);
});

Deno.test('isSafeForAllContexts - should return false for dangerous strings', () => {
  assertEquals(isSafeForAllContexts("It's dangerous"), false);
  assertEquals(isSafeForAllContexts('Break out */'), false);
  assertEquals(isSafeForAllContexts('New\nLine'), false);
  assertEquals(isSafeForAllContexts('${injection}'), false);
});

Deno.test('escaping - should handle empty strings', () => {
  assertEquals(escapeForBlockComment(''), '');
  assertEquals(escapeForSingleLineComment(''), '');
  assertEquals(escapeForSingleQuotedString(''), '');
  assertEquals(escapeForDoubleQuotedString(''), '');
  assertEquals(escapeForTemplateLiteral(''), '');
});

Deno.test('escaping - should preserve safe unicode characters', () => {
  const unicode = '二和 (Two Sum) 🎯';
  assertEquals(escapeForBlockComment(unicode), unicode);
  assertEquals(escapeForSingleQuotedString(unicode), unicode);
});
