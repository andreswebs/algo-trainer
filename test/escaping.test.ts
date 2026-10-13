/**
 * Tests for template escaping utilities
 *
 * @module tests/escaping
 */

import { test } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
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

test('escapeForBlockComment - should escape */ sequences', () => {
  deepStrictEqual(escapeForBlockComment('Two Sum'), 'Two Sum');
  deepStrictEqual(escapeForBlockComment('Sum */'), 'Sum * /');
  deepStrictEqual(escapeForBlockComment('A */ B */ C'), 'A * / B * / C');
  deepStrictEqual(escapeForBlockComment('*/'), '* /');
});

test('escapeForBlockComment - should handle injection attack', () => {
  const malicious = 'Two Sum */ alert("hacked"); /*';
  const escaped = escapeForBlockComment(malicious);
  deepStrictEqual(escaped, 'Two Sum * / alert("hacked"); /*');
});

test('escapeForSingleLineComment - should escape newlines', () => {
  deepStrictEqual(escapeForSingleLineComment('Two Sum'), 'Two Sum');
  deepStrictEqual(escapeForSingleLineComment('Line1\nLine2'), 'Line1 Line2');
  deepStrictEqual(escapeForSingleLineComment('A\r\nB'), 'A B');
  deepStrictEqual(escapeForSingleLineComment('A\n\n\nB'), 'A B');
});

test('escapeForSingleQuotedString - should escape single quotes', () => {
  deepStrictEqual(escapeForSingleQuotedString('Two Sum'), 'Two Sum');
  deepStrictEqual(escapeForSingleQuotedString("It's"), "It\\'s");
  deepStrictEqual(escapeForSingleQuotedString("'test'"), "\\'test\\'");
});

test('escapeForSingleQuotedString - should escape backslashes', () => {
  deepStrictEqual(escapeForSingleQuotedString('path\\to\\file'), 'path\\\\to\\\\file');
  deepStrictEqual(escapeForSingleQuotedString("test\\'"), "test\\\\\\'");
});

test('escapeForSingleQuotedString - should handle injection attack', () => {
  const malicious = "Two Sum', () => { evil() }); describe('X";
  const escaped = escapeForSingleQuotedString(malicious);
  deepStrictEqual(escaped, "Two Sum\\', () => { evil() }); describe(\\'X");
});

test('escapeForDoubleQuotedString - should escape double quotes', () => {
  deepStrictEqual(escapeForDoubleQuotedString('Two Sum'), 'Two Sum');
  deepStrictEqual(escapeForDoubleQuotedString('Say "hello"'), 'Say \\"hello\\"');
});

test('escapeForDoubleQuotedString - should escape backslashes', () => {
  deepStrictEqual(escapeForDoubleQuotedString('path\\to\\file'), 'path\\\\to\\\\file');
});

test('escapeForTemplateLiteral - should escape backticks', () => {
  deepStrictEqual(escapeForTemplateLiteral('Two Sum'), 'Two Sum');
  deepStrictEqual(escapeForTemplateLiteral('`code`'), '\\`code\\`');
});

test('escapeForTemplateLiteral - should escape template expressions', () => {
  deepStrictEqual(escapeForTemplateLiteral('Result: ${value}'), 'Result: \\${value}');
  deepStrictEqual(escapeForTemplateLiteral('${evil()}'), '\\${evil()}');
});

test('escapeForTemplateLiteral - should escape backslashes', () => {
  deepStrictEqual(escapeForTemplateLiteral('\\n'), '\\\\n');
});

test('escapeForContext - should route to correct escape function', () => {
  const input = "Two Sum */ '";

  deepStrictEqual(escapeForContext(input, 'block-comment'), "Two Sum * / '");
  deepStrictEqual(escapeForContext(input, 'single-quoted-string'), "Two Sum */ \\'");
  deepStrictEqual(escapeForContext(input, 'none'), input);
});

test('escapeForContext - should handle all context types', () => {
  const input = 'test';

  deepStrictEqual(escapeForContext(input, 'block-comment'), 'test');
  deepStrictEqual(escapeForContext(input, 'single-line-comment'), 'test');
  deepStrictEqual(escapeForContext(input, 'single-quoted-string'), 'test');
  deepStrictEqual(escapeForContext(input, 'double-quoted-string'), 'test');
  deepStrictEqual(escapeForContext(input, 'template-literal'), 'test');
  deepStrictEqual(escapeForContext(input, 'markdown'), 'test');
  deepStrictEqual(escapeForContext(input, 'none'), 'test');
});

test('escapeForAllContexts - should escape for all dangerous contexts', () => {
  const malicious = "Two Sum */ 'evil'\ninjected";
  const escaped = escapeForAllContexts(malicious);

  deepStrictEqual(escaped.includes('*/'), false);
  deepStrictEqual(escaped.includes('\n'), false);
  deepStrictEqual(escaped.includes("\\'"), true);
});

test('detectDangerousPatterns - should detect all dangerous patterns', () => {
  const patterns = detectDangerousPatterns('test */ \' " ` \n ${x}');

  deepStrictEqual(patterns.hasBlockCommentBreaker, true);
  deepStrictEqual(patterns.hasSingleQuote, true);
  deepStrictEqual(patterns.hasDoubleQuote, true);
  deepStrictEqual(patterns.hasBacktick, true);
  deepStrictEqual(patterns.hasNewline, true);
  deepStrictEqual(patterns.hasTemplateExpression, true);
});

test('detectDangerousPatterns - should return false for safe strings', () => {
  const patterns = detectDangerousPatterns('Two Sum');

  deepStrictEqual(patterns.hasBlockCommentBreaker, false);
  deepStrictEqual(patterns.hasSingleQuote, false);
  deepStrictEqual(patterns.hasDoubleQuote, false);
  deepStrictEqual(patterns.hasBacktick, false);
  deepStrictEqual(patterns.hasNewline, false);
  deepStrictEqual(patterns.hasTemplateExpression, false);
});

test('isSafeForAllContexts - should return true for safe strings', () => {
  deepStrictEqual(isSafeForAllContexts('Two Sum'), true);
  deepStrictEqual(isSafeForAllContexts('Valid Problem Title'), true);
  deepStrictEqual(isSafeForAllContexts('123-abc'), true);
});

test('isSafeForAllContexts - should return false for dangerous strings', () => {
  deepStrictEqual(isSafeForAllContexts("It's dangerous"), false);
  deepStrictEqual(isSafeForAllContexts('Break out */'), false);
  deepStrictEqual(isSafeForAllContexts('New\nLine'), false);
  deepStrictEqual(isSafeForAllContexts('${injection}'), false);
});

test('escaping - should handle empty strings', () => {
  deepStrictEqual(escapeForBlockComment(''), '');
  deepStrictEqual(escapeForSingleLineComment(''), '');
  deepStrictEqual(escapeForSingleQuotedString(''), '');
  deepStrictEqual(escapeForDoubleQuotedString(''), '');
  deepStrictEqual(escapeForTemplateLiteral(''), '');
});

test('escaping - should preserve safe unicode characters', () => {
  const unicode = '二和 (Two Sum) 🎯';
  deepStrictEqual(escapeForBlockComment(unicode), unicode);
  deepStrictEqual(escapeForSingleQuotedString(unicode), unicode);
});
