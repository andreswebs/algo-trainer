/**
 * Tests for trigger expression evaluator
 *
 * @module tests/ai/triggers
 */

import { test } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { evaluateTrigger } from '../../src/core/ai/triggers.ts';
import type { TriggerContext } from '../../src/core/ai/types.ts';

// -----------------------------------------------------------------------------
// Test context setup
// -----------------------------------------------------------------------------

const baseContext: TriggerContext = {
  code: 'function twoSum() { for (let i = 0; i < n; i++) {} }',
  stdout: 'Test passed',
  stderr: '',
  passed: false,
  attempts: 3,
};

// -----------------------------------------------------------------------------
// Boolean comparison tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - boolean equality (===)', () => {
  const context = { ...baseContext, passed: true };
  deepStrictEqual(evaluateTrigger('passed === true', context), true);
  deepStrictEqual(evaluateTrigger('passed === false', context), false);
});

test('evaluateTrigger - boolean inequality (!==)', () => {
  const context = { ...baseContext, passed: false };
  deepStrictEqual(evaluateTrigger('passed !== false', context), false);
  deepStrictEqual(evaluateTrigger('passed !== true', context), true);
});

// -----------------------------------------------------------------------------
// Numeric comparison tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - numeric greater than (>)', () => {
  deepStrictEqual(evaluateTrigger('attempts > 2', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts > 3', baseContext), false);
  deepStrictEqual(evaluateTrigger('attempts > 4', baseContext), false);
});

test('evaluateTrigger - numeric less than (<)', () => {
  deepStrictEqual(evaluateTrigger('attempts < 4', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts < 3', baseContext), false);
  deepStrictEqual(evaluateTrigger('attempts < 2', baseContext), false);
});

test('evaluateTrigger - numeric greater than or equal (>=)', () => {
  deepStrictEqual(evaluateTrigger('attempts >= 3', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts >= 2', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts >= 4', baseContext), false);
});

test('evaluateTrigger - numeric less than or equal (<=)', () => {
  deepStrictEqual(evaluateTrigger('attempts <= 3', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts <= 4', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts <= 2', baseContext), false);
});

test('evaluateTrigger - numeric equality', () => {
  deepStrictEqual(evaluateTrigger('attempts === 3', baseContext), true);
  deepStrictEqual(evaluateTrigger('attempts === 2', baseContext), false);
  deepStrictEqual(evaluateTrigger('attempts !== 3', baseContext), false);
  deepStrictEqual(evaluateTrigger('attempts !== 2', baseContext), true);
});

// -----------------------------------------------------------------------------
// Logical operator tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - logical AND (&&)', () => {
  deepStrictEqual(evaluateTrigger('passed === false && attempts > 2', baseContext), true);
  deepStrictEqual(evaluateTrigger('passed === true && attempts > 2', baseContext), false);
  deepStrictEqual(evaluateTrigger('passed === false && attempts > 5', baseContext), false);
});

test('evaluateTrigger - logical OR (||)', () => {
  deepStrictEqual(evaluateTrigger('passed === true || attempts > 2', baseContext), true);
  deepStrictEqual(evaluateTrigger('passed === false || attempts > 5', baseContext), true);
  deepStrictEqual(evaluateTrigger('passed === true || attempts > 5', baseContext), false);
});

test('evaluateTrigger - logical NOT (!)', () => {
  const passedContext = { ...baseContext, passed: true };
  deepStrictEqual(evaluateTrigger('!passed', baseContext), true);
  deepStrictEqual(evaluateTrigger('!passed', passedContext), false);
});

test('evaluateTrigger - complex logical expressions', () => {
  // (false && true) || true = true
  deepStrictEqual(
    evaluateTrigger('passed === true && attempts > 2 || attempts === 3', baseContext),
    true,
  );

  // false && (false || true) = false
  deepStrictEqual(
    evaluateTrigger('passed === true && passed === false || attempts > 5', baseContext),
    false,
  );
});

// -----------------------------------------------------------------------------
// String method tests - includes()
// -----------------------------------------------------------------------------

test('evaluateTrigger - string includes() method', () => {
  deepStrictEqual(evaluateTrigger('code.includes("for")', baseContext), true);
  deepStrictEqual(evaluateTrigger('code.includes("while")', baseContext), false);
  deepStrictEqual(evaluateTrigger('code.includes("function")', baseContext), true);
  deepStrictEqual(evaluateTrigger('stdout.includes("passed")', baseContext), true);
});

test('evaluateTrigger - string includes() with quotes', () => {
  deepStrictEqual(evaluateTrigger("code.includes('for')", baseContext), true);
  deepStrictEqual(evaluateTrigger('code.includes("for")', baseContext), true);
});

// -----------------------------------------------------------------------------
// String method tests - startsWith() and endsWith()
// -----------------------------------------------------------------------------

test('evaluateTrigger - string startsWith() method', () => {
  deepStrictEqual(evaluateTrigger('code.startsWith("function")', baseContext), true);
  deepStrictEqual(evaluateTrigger('code.startsWith("for")', baseContext), false);
});

test('evaluateTrigger - string endsWith() method', () => {
  deepStrictEqual(evaluateTrigger('code.endsWith("}")', baseContext), true);
  deepStrictEqual(evaluateTrigger('code.endsWith("for")', baseContext), false);
});

// -----------------------------------------------------------------------------
// String method tests - match()
// -----------------------------------------------------------------------------

test('evaluateTrigger - string match() with regex', () => {
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: undefined is not a function',
  };

  deepStrictEqual(evaluateTrigger('stderr.match(/TypeError|ReferenceError/)', errorContext), true);
  deepStrictEqual(evaluateTrigger('stderr.match(/SyntaxError/)', errorContext), false);
});

test('evaluateTrigger - string match() with string pattern', () => {
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: undefined is not a function',
  };

  deepStrictEqual(evaluateTrigger('stderr.match("TypeError")', errorContext), true);
  deepStrictEqual(evaluateTrigger('stderr.match("SyntaxError")', errorContext), false);
});

// -----------------------------------------------------------------------------
// Property access tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - property access (length)', () => {
  deepStrictEqual(evaluateTrigger('code.length > 10', baseContext), true);
  deepStrictEqual(evaluateTrigger('code.length < 5', baseContext), false);
  deepStrictEqual(evaluateTrigger('code.length > 100', baseContext), false);
});

// -----------------------------------------------------------------------------
// Complex expression tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - complex expressions from spec', () => {
  // Example: code.includes('for') && code.includes('for') && !code.includes('Map')
  deepStrictEqual(
    evaluateTrigger(
      'code.includes("for") && code.includes("for") && !code.includes("Map")',
      baseContext,
    ),
    true,
  );

  // Example: code.includes('for') && !code.includes('Map')
  deepStrictEqual(
    evaluateTrigger('code.includes("for") && !code.includes("Map")', baseContext),
    true,
  );

  // Example with Map included
  const mapContext = {
    ...baseContext,
    code: 'function twoSum() { const map = new Map(); for (let i = 0; i < n; i++) {} }',
  };
  deepStrictEqual(
    evaluateTrigger('code.includes("Map") && !code.includes("has")', mapContext),
    true,
  );
});

test('evaluateTrigger - multiple conditions', () => {
  deepStrictEqual(
    evaluateTrigger('passed === false && attempts > 1 && code.includes("for")', baseContext),
    true,
  );

  deepStrictEqual(
    evaluateTrigger('attempts > 5 || code.includes("for") && passed === false', baseContext),
    true,
  );
});

// -----------------------------------------------------------------------------
// Edge case tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - empty trigger returns false', () => {
  deepStrictEqual(evaluateTrigger('', baseContext), false);
  deepStrictEqual(evaluateTrigger('   ', baseContext), false);
});

test('evaluateTrigger - invalid trigger returns false', () => {
  deepStrictEqual(evaluateTrigger('invalid variable', baseContext), false);
  deepStrictEqual(evaluateTrigger('code.unknownMethod()', baseContext), false);
  deepStrictEqual(evaluateTrigger('unknown === true', baseContext), false);
});

test('evaluateTrigger - null/undefined trigger returns false', () => {
  deepStrictEqual(evaluateTrigger(null as unknown as string, baseContext), false);
  deepStrictEqual(evaluateTrigger(undefined as unknown as string, baseContext), false);
});

test('evaluateTrigger - handles whitespace correctly', () => {
  deepStrictEqual(evaluateTrigger('  attempts   >   2  ', baseContext), true);
  deepStrictEqual(evaluateTrigger('code.includes(  "for"  )', baseContext), true);
});

// -----------------------------------------------------------------------------
// Security tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - prevents code injection attempts', () => {
  // These should all fail safely and return false
  const maliciousInputs = [
    'eval("malicious code")',
    'Function("return process")()',
    'this.constructor.constructor("return process")()',
    'code.constructor("return process")()',
    '__proto__',
    'constructor.constructor',
    'constructor',
    'toString',
    'hasOwnProperty',
  ];

  for (const input of maliciousInputs) {
    deepStrictEqual(evaluateTrigger(input, baseContext), false, `Should safely reject: ${input}`);
  }
});

test('evaluateTrigger - prevents access to undefined variables', () => {
  deepStrictEqual(evaluateTrigger('unknownVar === true', baseContext), false);
  deepStrictEqual(evaluateTrigger('process.env.SECRET', baseContext), false);
});

// -----------------------------------------------------------------------------
// Performance tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - performance is acceptable', () => {
  const iterations = 1000;
  const expressions = [
    'attempts > 2',
    'code.includes("for")',
    'passed === false && attempts > 1',
    'code.includes("for") && !code.includes("Map")',
    'stderr.match(/TypeError|undefined/)',
  ];

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const expr of expressions) {
      evaluateTrigger(expr, baseContext);
    }
  }
  const end = performance.now();
  const avgTime = (end - start) / (iterations * expressions.length);

  // Should be well under 1ms per evaluation
  deepStrictEqual(avgTime < 1, true, `Average time: ${avgTime.toFixed(3)}ms`);
});

// -----------------------------------------------------------------------------
// Real-world example tests from specification
// -----------------------------------------------------------------------------

test('evaluateTrigger - specification examples', () => {
  // Example: passed === true
  const passedContext = { ...baseContext, passed: true };
  deepStrictEqual(evaluateTrigger('passed === true', passedContext), true);

  // Example: attempts > 2
  deepStrictEqual(evaluateTrigger('attempts > 2', baseContext), true);

  // Example: passed === false && attempts > 1
  deepStrictEqual(evaluateTrigger('passed === false && attempts > 1', baseContext), true);

  // Example: code.includes('for')
  deepStrictEqual(evaluateTrigger('code.includes("for")', baseContext), true);

  // Example: stderr.match(/TypeError|undefined/)
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: Cannot read property of undefined',
  };
  deepStrictEqual(evaluateTrigger('stderr.match(/TypeError|undefined/)', errorContext), true);

  // Example: code.includes('Map') && !code.includes('has')
  const mapContext = {
    ...baseContext,
    code: 'const map = new Map();',
  };
  deepStrictEqual(
    evaluateTrigger('code.includes("Map") && !code.includes("has")', mapContext),
    true,
  );

  // Example: code.length < 50
  const shortContext = { ...baseContext, code: 'function test() {}' };
  deepStrictEqual(evaluateTrigger('code.length < 50', shortContext), true);
});

// -----------------------------------------------------------------------------
// Context variable tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - all context variables accessible', () => {
  const context: TriggerContext = {
    code: 'test code',
    stdout: 'output',
    stderr: 'error',
    passed: true,
    attempts: 5,
  };

  deepStrictEqual(evaluateTrigger('code.includes("test")', context), true);
  deepStrictEqual(evaluateTrigger('stdout.includes("output")', context), true);
  deepStrictEqual(evaluateTrigger('stderr.includes("error")', context), true);
  deepStrictEqual(evaluateTrigger('passed === true', context), true);
  deepStrictEqual(evaluateTrigger('attempts === 5', context), true);
});

// -----------------------------------------------------------------------------
// Error handling tests
// -----------------------------------------------------------------------------

test('evaluateTrigger - invalid method calls fail safely', () => {
  deepStrictEqual(evaluateTrigger('code.invalidMethod()', baseContext), false);
  deepStrictEqual(evaluateTrigger('attempts.includes("test")', baseContext), false);
  deepStrictEqual(evaluateTrigger('passed.length', baseContext), false);
});

test('evaluateTrigger - malformed expressions fail safely', () => {
  const malformed = [
    'code.includes(',
    'attempts > ',
    '&& code.includes("for")',
    'code.includes("for") &&',
    'code..includes("for")',
    'code.includes()',
  ];

  for (const expr of malformed) {
    deepStrictEqual(evaluateTrigger(expr, baseContext), false, `Should safely handle: ${expr}`);
  }
});
