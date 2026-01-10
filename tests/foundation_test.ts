/**
 * Tests for Phase 1 foundation
 *
 * Basic validation tests for Phase 1 implementation.
 *
 * @module tests/foundation
 */

// Simple test runner
function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed${msg ? `: ${msg}` : ''}\nExpected: ${expected}\nActual: ${actual}`,
    );
  }
}

function assertNotEquals<T>(actual: T, expected: T, msg?: string): void {
  if (actual === expected) {
    throw new Error(
      `Assertion failed${
        msg ? `: ${msg}` : ''
      }\nExpected NOT to equal: ${expected}\nActual: ${actual}`,
    );
  }
}

async function runTests(): Promise<void> {
  const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];

  // Test type definitions exist
  tests.push({
    name: 'Types are properly defined',
    fn: async () => {
      const { DEFAULT_CONFIG } = await import('../lib/config/types.ts');

      assertEquals(DEFAULT_CONFIG.language, 'typescript');
      assertEquals(DEFAULT_CONFIG.aiEnabled, true);
      assertEquals(DEFAULT_CONFIG.version, '2.0.0');
      console.log('✅ Default config is properly defined');
    },
  });

  // Test output utilities
  tests.push({
    name: 'Output utilities work correctly',
    fn: async () => {
      const { setOutputOptions, getOutputOptions } = await import(
        '../lib/utils/output.ts'
      );

      setOutputOptions({
        useColors: false,
        useEmoji: false,
        verbosity: 'quiet',
      });

      const options = getOutputOptions();
      assertEquals(options.useColors, false);
      assertEquals(options.useEmoji, false);
      assertEquals(options.verbosity, 'quiet');
      console.log('✅ Output utilities work correctly');
    },
  });

  // Test validation utilities
  tests.push({
    name: 'Validation utilities work correctly',
    fn: async () => {
      const { validateString, validateSupportedLanguage } = await import(
        '../lib/utils/validation.ts'
      );

      const stringResult = validateString('test', 'test-field');
      assertEquals(stringResult.valid, true);

      const langResult = validateSupportedLanguage('typescript');
      assertEquals(langResult.valid, true);

      const invalidLangResult = validateSupportedLanguage('invalid');
      assertEquals(invalidLangResult.valid, false);
      console.log('✅ Validation utilities work correctly');
    },
  });

  // Test error utilities
  tests.push({
    name: 'Error utilities work correctly',
    fn: async () => {
      const { ConfigError, formatError } = await import(
        '../lib/utils/errors.ts'
      );

      const error = new ConfigError('Test error', { test: 'context' });
      assertEquals(error.code, 'CONFIG_ERROR');
      assertNotEquals(error.getFormattedMessage(), '');

      const formatted = formatError(error);
      assertNotEquals(formatted, '');
      console.log('✅ Error utilities work correctly');
    },
  });

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${test.name}`);
      console.error(error);
      failed++;
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
}

// Run tests
runTests();
