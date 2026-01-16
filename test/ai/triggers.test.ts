/**
 * Tests for trigger expression evaluator
 *
 * @module tests/ai/triggers
 */

import { assertEquals } from '@std/assert';
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

Deno.test('evaluateTrigger - boolean equality (===)', () => {
  const context = { ...baseContext, passed: true };
  assertEquals(evaluateTrigger('passed === true', context), true);
  assertEquals(evaluateTrigger('passed === false', context), false);
});

Deno.test('evaluateTrigger - boolean inequality (!==)', () => {
  const context = { ...baseContext, passed: false };
  assertEquals(evaluateTrigger('passed !== false', context), false);
  assertEquals(evaluateTrigger('passed !== true', context), true);
});

// -----------------------------------------------------------------------------
// Numeric comparison tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - numeric greater than (>)', () => {
  assertEquals(evaluateTrigger('attempts > 2', baseContext), true);
  assertEquals(evaluateTrigger('attempts > 3', baseContext), false);
  assertEquals(evaluateTrigger('attempts > 4', baseContext), false);
});

Deno.test('evaluateTrigger - numeric less than (<)', () => {
  assertEquals(evaluateTrigger('attempts < 4', baseContext), true);
  assertEquals(evaluateTrigger('attempts < 3', baseContext), false);
  assertEquals(evaluateTrigger('attempts < 2', baseContext), false);
});

Deno.test('evaluateTrigger - numeric greater than or equal (>=)', () => {
  assertEquals(evaluateTrigger('attempts >= 3', baseContext), true);
  assertEquals(evaluateTrigger('attempts >= 2', baseContext), true);
  assertEquals(evaluateTrigger('attempts >= 4', baseContext), false);
});

Deno.test('evaluateTrigger - numeric less than or equal (<=)', () => {
  assertEquals(evaluateTrigger('attempts <= 3', baseContext), true);
  assertEquals(evaluateTrigger('attempts <= 4', baseContext), true);
  assertEquals(evaluateTrigger('attempts <= 2', baseContext), false);
});

Deno.test('evaluateTrigger - numeric equality', () => {
  assertEquals(evaluateTrigger('attempts === 3', baseContext), true);
  assertEquals(evaluateTrigger('attempts === 2', baseContext), false);
  assertEquals(evaluateTrigger('attempts !== 3', baseContext), false);
  assertEquals(evaluateTrigger('attempts !== 2', baseContext), true);
});

// -----------------------------------------------------------------------------
// Logical operator tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - logical AND (&&)', () => {
  assertEquals(
    evaluateTrigger('passed === false && attempts > 2', baseContext),
    true,
  );
  assertEquals(
    evaluateTrigger('passed === true && attempts > 2', baseContext),
    false,
  );
  assertEquals(
    evaluateTrigger('passed === false && attempts > 5', baseContext),
    false,
  );
});

Deno.test('evaluateTrigger - logical OR (||)', () => {
  assertEquals(
    evaluateTrigger('passed === true || attempts > 2', baseContext),
    true,
  );
  assertEquals(
    evaluateTrigger('passed === false || attempts > 5', baseContext),
    true,
  );
  assertEquals(
    evaluateTrigger('passed === true || attempts > 5', baseContext),
    false,
  );
});

Deno.test('evaluateTrigger - logical NOT (!)', () => {
  const passedContext = { ...baseContext, passed: true };
  assertEquals(evaluateTrigger('!passed', baseContext), true);
  assertEquals(evaluateTrigger('!passed', passedContext), false);
});

Deno.test('evaluateTrigger - complex logical expressions', () => {
  // (false && true) || true = true
  assertEquals(
    evaluateTrigger('passed === true && attempts > 2 || attempts === 3', baseContext),
    true,
  );
  
  // false && (false || true) = false
  assertEquals(
    evaluateTrigger('passed === true && passed === false || attempts > 5', baseContext),
    false,
  );
});

// -----------------------------------------------------------------------------
// String method tests - includes()
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - string includes() method', () => {
  assertEquals(evaluateTrigger('code.includes("for")', baseContext), true);
  assertEquals(evaluateTrigger('code.includes("while")', baseContext), false);
  assertEquals(evaluateTrigger('code.includes("function")', baseContext), true);
  assertEquals(
    evaluateTrigger('stdout.includes("passed")', baseContext),
    true,
  );
});

Deno.test('evaluateTrigger - string includes() with quotes', () => {
  assertEquals(evaluateTrigger("code.includes('for')", baseContext), true);
  assertEquals(evaluateTrigger('code.includes("for")', baseContext), true);
});

// -----------------------------------------------------------------------------
// String method tests - startsWith() and endsWith()
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - string startsWith() method', () => {
  assertEquals(
    evaluateTrigger('code.startsWith("function")', baseContext),
    true,
  );
  assertEquals(evaluateTrigger('code.startsWith("for")', baseContext), false);
});

Deno.test('evaluateTrigger - string endsWith() method', () => {
  assertEquals(evaluateTrigger('code.endsWith("}")', baseContext), true);
  assertEquals(evaluateTrigger('code.endsWith("for")', baseContext), false);
});

// -----------------------------------------------------------------------------
// String method tests - match()
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - string match() with regex', () => {
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: undefined is not a function',
  };
  
  assertEquals(
    evaluateTrigger('stderr.match(/TypeError|ReferenceError/)', errorContext),
    true,
  );
  assertEquals(
    evaluateTrigger('stderr.match(/SyntaxError/)', errorContext),
    false,
  );
});

Deno.test('evaluateTrigger - string match() with string pattern', () => {
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: undefined is not a function',
  };
  
  assertEquals(
    evaluateTrigger('stderr.match("TypeError")', errorContext),
    true,
  );
  assertEquals(
    evaluateTrigger('stderr.match("SyntaxError")', errorContext),
    false,
  );
});

// -----------------------------------------------------------------------------
// Property access tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - property access (length)', () => {
  assertEquals(evaluateTrigger('code.length > 10', baseContext), true);
  assertEquals(evaluateTrigger('code.length < 5', baseContext), false);
  assertEquals(evaluateTrigger('code.length > 100', baseContext), false);
});

// -----------------------------------------------------------------------------
// Complex expression tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - complex expressions from spec', () => {
  // Example: code.includes('for') && code.includes('for') && !code.includes('Map')
  assertEquals(
    evaluateTrigger(
      'code.includes("for") && code.includes("for") && !code.includes("Map")',
      baseContext,
    ),
    true,
  );

  // Example: code.includes('for') && !code.includes('Map')
  assertEquals(
    evaluateTrigger('code.includes("for") && !code.includes("Map")', baseContext),
    true,
  );

  // Example with Map included
  const mapContext = {
    ...baseContext,
    code: 'function twoSum() { const map = new Map(); for (let i = 0; i < n; i++) {} }',
  };
  assertEquals(
    evaluateTrigger('code.includes("Map") && !code.includes("has")', mapContext),
    true,
  );
});

Deno.test('evaluateTrigger - multiple conditions', () => {
  assertEquals(
    evaluateTrigger(
      'passed === false && attempts > 1 && code.includes("for")',
      baseContext,
    ),
    true,
  );

  assertEquals(
    evaluateTrigger(
      'attempts > 5 || code.includes("for") && passed === false',
      baseContext,
    ),
    true,
  );
});

// -----------------------------------------------------------------------------
// Edge case tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - empty trigger returns false', () => {
  assertEquals(evaluateTrigger('', baseContext), false);
  assertEquals(evaluateTrigger('   ', baseContext), false);
});

Deno.test('evaluateTrigger - invalid trigger returns false', () => {
  assertEquals(evaluateTrigger('invalid variable', baseContext), false);
  assertEquals(evaluateTrigger('code.unknownMethod()', baseContext), false);
  assertEquals(evaluateTrigger('unknown === true', baseContext), false);
});

Deno.test('evaluateTrigger - null/undefined trigger returns false', () => {
  assertEquals(evaluateTrigger(null as unknown as string, baseContext), false);
  assertEquals(
    evaluateTrigger(undefined as unknown as string, baseContext),
    false,
  );
});

Deno.test('evaluateTrigger - handles whitespace correctly', () => {
  assertEquals(
    evaluateTrigger('  attempts   >   2  ', baseContext),
    true,
  );
  assertEquals(
    evaluateTrigger('code.includes(  "for"  )', baseContext),
    true,
  );
});

// -----------------------------------------------------------------------------
// Security tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - prevents code injection attempts', () => {
  // These should all fail safely and return false
  const maliciousInputs = [
    'eval("malicious code")',
    'Function("return process")()',
    'this.constructor.constructor("return process")()',
    'code.constructor("return process")()',
    '__proto__',
    'constructor.constructor',
  ];

  for (const input of maliciousInputs) {
    assertEquals(
      evaluateTrigger(input, baseContext),
      false,
      `Should safely reject: ${input}`,
    );
  }
});

Deno.test('evaluateTrigger - prevents access to undefined variables', () => {
  assertEquals(evaluateTrigger('unknownVar === true', baseContext), false);
  assertEquals(evaluateTrigger('process.env.SECRET', baseContext), false);
});

// -----------------------------------------------------------------------------
// Performance tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - performance is acceptable', () => {
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
  assertEquals(avgTime < 1, true, `Average time: ${avgTime.toFixed(3)}ms`);
});

// -----------------------------------------------------------------------------
// Real-world example tests from specification
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - specification examples', () => {
  // Example: passed === true
  const passedContext = { ...baseContext, passed: true };
  assertEquals(evaluateTrigger('passed === true', passedContext), true);

  // Example: attempts > 2
  assertEquals(evaluateTrigger('attempts > 2', baseContext), true);

  // Example: passed === false && attempts > 1
  assertEquals(
    evaluateTrigger('passed === false && attempts > 1', baseContext),
    true,
  );

  // Example: code.includes('for')
  assertEquals(evaluateTrigger('code.includes("for")', baseContext), true);

  // Example: stderr.match(/TypeError|undefined/)
  const errorContext = {
    ...baseContext,
    stderr: 'TypeError: Cannot read property of undefined',
  };
  assertEquals(
    evaluateTrigger('stderr.match(/TypeError|undefined/)', errorContext),
    true,
  );

  // Example: code.includes('Map') && !code.includes('has')
  const mapContext = {
    ...baseContext,
    code: 'const map = new Map();',
  };
  assertEquals(
    evaluateTrigger('code.includes("Map") && !code.includes("has")', mapContext),
    true,
  );

  // Example: code.length < 50
  const shortContext = { ...baseContext, code: 'function test() {}' };
  assertEquals(evaluateTrigger('code.length < 50', shortContext), true);
});

// -----------------------------------------------------------------------------
// Context variable tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - all context variables accessible', () => {
  const context: TriggerContext = {
    code: 'test code',
    stdout: 'output',
    stderr: 'error',
    passed: true,
    attempts: 5,
  };

  assertEquals(evaluateTrigger('code.includes("test")', context), true);
  assertEquals(evaluateTrigger('stdout.includes("output")', context), true);
  assertEquals(evaluateTrigger('stderr.includes("error")', context), true);
  assertEquals(evaluateTrigger('passed === true', context), true);
  assertEquals(evaluateTrigger('attempts === 5', context), true);
});

// -----------------------------------------------------------------------------
// Error handling tests
// -----------------------------------------------------------------------------

Deno.test('evaluateTrigger - invalid method calls fail safely', () => {
  assertEquals(evaluateTrigger('code.invalidMethod()', baseContext), false);
  assertEquals(evaluateTrigger('attempts.includes("test")', baseContext), false);
  assertEquals(evaluateTrigger('passed.length', baseContext), false);
});

Deno.test('evaluateTrigger - malformed expressions fail safely', () => {
  const malformed = [
    'code.includes(',
    'attempts > ',
    '&& code.includes("for")',
    'code.includes("for") &&',
    'code..includes("for")',
    'code.includes()',
  ];

  for (const expr of malformed) {
    assertEquals(
      evaluateTrigger(expr, baseContext),
      false,
      `Should safely handle: ${expr}`,
    );
  }
});
