/**
 * Tests for output utilities and Logger class
 *
 * @module test/utils-output.test
 */

import { assertEquals, assertMatch, assertStringIncludes } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { logger, Logger, resetOutputOptions, setOutputOptions } from '../src/utils/output.ts';

// Helper to capture console.error output
class ConsoleErrorCapture {
  private original: typeof console.error;
  public captured: string[] = [];

  constructor() {
    this.original = console.error;
  }

  start(): void {
    this.captured = [];
    console.error = (...args: unknown[]) => {
      this.captured.push(args.map(arg => String(arg)).join(' '));
    };
  }

  stop(): void {
    console.error = this.original;
  }

  getOutput(): string {
    return this.captured.join('\n');
  }

  getLines(): string[] {
    return this.captured;
  }
}

describe('Logger class', () => {
  let capture: ConsoleErrorCapture;

  beforeEach(() => {
    capture = new ConsoleErrorCapture();
    capture.start();
    resetOutputOptions();
  });

  afterEach(() => {
    capture.stop();
    resetOutputOptions();
  });

  describe('core logging methods', () => {
    it('should log success messages with emoji', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.success('Test success');
      assertStringIncludes(capture.getOutput(), '✅');
      assertStringIncludes(capture.getOutput(), 'Test success');
    });

    it('should log success messages without emoji', () => {
      setOutputOptions({ useEmoji: false, useColors: false });
      logger.success('Test success');
      assertStringIncludes(capture.getOutput(), 'SUCCESS:');
      assertStringIncludes(capture.getOutput(), 'Test success');
    });

    it('should log error messages', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.error('Test error');
      assertStringIncludes(capture.getOutput(), '❌');
      assertStringIncludes(capture.getOutput(), 'Test error');
    });

    it('should log error messages with details', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.error('Test error', 'Error details');
      const output = capture.getOutput();
      assertStringIncludes(output, '❌');
      assertStringIncludes(output, 'Test error');
      assertStringIncludes(output, 'Error details');
    });

    it('should log error objects', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      const error = new Error('Test error object');
      logger.errorObject(error);
      assertStringIncludes(capture.getOutput(), 'Test error object');
    });

    it('should include stack trace in verbose mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'verbose' });
      const error = new Error('Test error with stack');
      logger.errorObject(error);
      const output = capture.getOutput();
      assertStringIncludes(output, 'Test error with stack');
      assertStringIncludes(output, 'at '); // Stack trace line
    });

    it('should not include stack trace in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      const error = new Error('Test error without stack');
      logger.errorObject(error);
      const output = capture.getOutput();
      assertStringIncludes(output, 'Test error without stack');
      assertEquals(output.includes('at '), false);
    });

    it('should log warning messages', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.warn('Test warning');
      assertStringIncludes(capture.getOutput(), '⚠️');
      assertStringIncludes(capture.getOutput(), 'Test warning');
    });

    it('should log info messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.info('Test info');
      assertStringIncludes(capture.getOutput(), 'ℹ️');
      assertStringIncludes(capture.getOutput(), 'Test info');
    });

    it('should suppress info messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.info('Test info');
      assertEquals(capture.getOutput(), '');
    });

    it('should log debug messages in verbose mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'verbose' });
      logger.debug('Test debug');
      assertStringIncludes(capture.getOutput(), '🐛');
      assertStringIncludes(capture.getOutput(), 'Test debug');
    });

    it('should suppress debug messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.debug('Test debug');
      assertEquals(capture.getOutput(), '');
    });

    it('should suppress debug messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.debug('Test debug');
      assertEquals(capture.getOutput(), '');
    });

    it('should log progress messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.progress('Test progress');
      assertStringIncludes(capture.getOutput(), '🔄');
      assertStringIncludes(capture.getOutput(), 'Test progress');
    });

    it('should suppress progress messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.progress('Test progress');
      assertEquals(capture.getOutput(), '');
    });
  });

  describe('plain output methods', () => {
    it('should log plain messages', () => {
      setOutputOptions({ useColors: false });
      logger.log('Plain message');
      assertEquals(capture.getOutput(), 'Plain message');
    });

    it('should log multiple arguments', () => {
      setOutputOptions({ useColors: false });
      logger.log('Message', 123, true);
      assertEquals(capture.getOutput(), 'Message 123 true');
    });

    it('should log objects as JSON', () => {
      setOutputOptions({ useColors: false });
      logger.log({ key: 'value' });
      assertStringIncludes(capture.getOutput(), '"key"');
      assertStringIncludes(capture.getOutput(), '"value"');
    });

    it('should output newlines', () => {
      setOutputOptions({ useColors: false });
      logger.log('Line 1');
      logger.newline();
      logger.log('Line 2');
      const lines = capture.getLines();
      assertEquals(lines.length, 3);
      assertEquals(lines[0], 'Line 1');
      assertEquals(lines[1], '');
      assertEquals(lines[2], 'Line 2');
    });
  });

  describe('display formatting methods', () => {
    beforeEach(() => {
      setOutputOptions({ useColors: false });
    });

    it('should format key-value pairs with default width', () => {
      logger.keyValue('language', 'typescript');
      const output = capture.getOutput();
      assertStringIncludes(output, 'language:');
      assertStringIncludes(output, 'typescript');
    });

    it('should format key-value pairs with custom width', () => {
      logger.keyValue('lang', 'ts', 10);
      const output = capture.getOutput();
      assertStringIncludes(output, 'lang:');
      assertStringIncludes(output, 'ts');
    });

    it('should format non-string values', () => {
      logger.keyValue('count', 42);
      const output = capture.getOutput();
      assertStringIncludes(output, 'count:');
      assertStringIncludes(output, '42');
    });

    it('should output section headers', () => {
      logger.section('Test Section');
      assertEquals(capture.getOutput(), 'Test Section:');
    });

    it('should output section headers with indent', () => {
      logger.section('Indented', 2);
      assertEquals(capture.getOutput(), '  Indented:');
    });

    it('should output separator lines', () => {
      logger.separator(10);
      assertEquals(capture.getOutput(), '──────────');
    });

    it('should output separator lines with custom character', () => {
      logger.separator(5, '=');
      assertEquals(capture.getOutput(), '=====');
    });

    it('should output titled boxes', () => {
      logger.box('Title', 'Content line 1\nContent line 2');
      const lines = capture.getLines();
      assertEquals(lines.length >= 5, true); // At least: sep, title, sep, content1, content2, sep
      assertStringIncludes(lines.join('\n'), 'TITLE');
      assertStringIncludes(lines.join('\n'), 'Content line 1');
      assertStringIncludes(lines.join('\n'), 'Content line 2');
    });

    it('should output tables with basic columns', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      logger.table(data, {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'age', label: 'Age' },
        ],
      });
      const output = capture.getOutput();
      assertStringIncludes(output, 'Name');
      assertStringIncludes(output, 'Age');
      assertStringIncludes(output, 'Alice');
      assertStringIncludes(output, 'Bob');
      assertStringIncludes(output, '30');
      assertStringIncludes(output, '25');
    });

    it('should output empty tables gracefully', () => {
      logger.table([], {
        columns: [
          { key: 'name', label: 'Name' },
        ],
      });
      assertEquals(capture.getOutput(), '');
    });

    it('should align table columns to the right', () => {
      const data = [{ num: '1' }];
      logger.table(data, {
        columns: [
          { key: 'num', label: 'Number', width: 10, align: 'right' },
        ],
      });
      const lines = capture.getLines();
      const dataLine = lines.find(line => line.includes('1'));
      assertEquals(dataLine !== undefined, true);
      assertMatch(dataLine!, /\s+1/); // Should have leading spaces
    });
  });

  describe('grouping methods', () => {
    beforeEach(() => {
      setOutputOptions({ useColors: false });
    });

    it('should indent content within groups', () => {
      logger.log('Before');
      logger.group('Group');
      logger.log('Inside');
      logger.groupEnd();
      logger.log('After');

      const lines = capture.getLines();
      assertEquals(lines[0], 'Before');
      assertEquals(lines[1], 'Group');
      assertEquals(lines[2], '  Inside'); // Indented
      assertEquals(lines[3], 'After');
    });

    it('should support nested groups', () => {
      logger.group('Outer');
      logger.log('Level 1');
      logger.group('Inner');
      logger.log('Level 2');
      logger.groupEnd();
      logger.log('Back to level 1');
      logger.groupEnd();

      const lines = capture.getLines();
      assertEquals(lines[0], 'Outer');
      assertEquals(lines[1], '  Level 1');
      assertEquals(lines[2], '  Inner');
      assertEquals(lines[3], '    Level 2'); // Double indented
      assertEquals(lines[4], '  Back to level 1');
    });

    it('should support groups without labels', () => {
      logger.log('Before');
      logger.group();
      logger.log('Indented');
      logger.groupEnd();
      logger.log('After');

      const lines = capture.getLines();
      assertEquals(lines[0], 'Before');
      assertEquals(lines[1], '  Indented');
      assertEquals(lines[2], 'After');
    });

    it('should handle extra groupEnd calls gracefully', () => {
      logger.group();
      logger.log('Inside');
      logger.groupEnd();
      logger.groupEnd(); // Extra call
      logger.log('After');

      const lines = capture.getLines();
      assertEquals(lines[0], '  Inside');
      assertEquals(lines[1], 'After');
    });
  });

  describe('singleton logger instance', () => {
    it('should export a singleton logger instance', () => {
      assertEquals(logger instanceof Logger, true);
    });

    it('should use the same instance across calls', () => {
      setOutputOptions({ useColors: false });
      logger.group();
      logger.log('Test');
      logger.groupEnd();

      const lines = capture.getLines();
      assertEquals(lines[0], '  Test'); // Should be indented from group call
    });
  });
});
