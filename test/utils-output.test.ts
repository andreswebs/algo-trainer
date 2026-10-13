/**
 * Tests for output utilities and Logger class
 *
 * @module test/utils-output.test
 */

import { afterEach, beforeEach, describe, it } from 'bun:test';
import { deepStrictEqual, match, ok } from 'node:assert/strict';
import { Logger, logger, resetOutputOptions, setOutputOptions } from '../src/utils/output.ts';

// Helper to capture console.error output
class ConsoleErrorCapture {
  private original: typeof console.error;
  public captured: string[] = [];

  constructor() {
    this.original = console.error;
  }

  start(): void {
    this.captured = [];
    console.error = (...args: unknown[]): void => {
      this.captured.push(args.map((arg) => String(arg)).join(' '));
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
      ok(capture.getOutput().includes('✅'));
      ok(capture.getOutput().includes('Test success'));
    });

    it('should log success messages without emoji', () => {
      setOutputOptions({ useEmoji: false, useColors: false });
      logger.success('Test success');
      ok(capture.getOutput().includes('SUCCESS:'));
      ok(capture.getOutput().includes('Test success'));
    });

    it('should log error messages', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.error('Test error');
      ok(capture.getOutput().includes('❌'));
      ok(capture.getOutput().includes('Test error'));
    });

    it('should log error messages with details', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.error('Test error', 'Error details');
      const output = capture.getOutput();
      ok(output.includes('❌'));
      ok(output.includes('Test error'));
      ok(output.includes('Error details'));
    });

    it('should log error objects', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      const error = new Error('Test error object');
      logger.errorObject(error);
      ok(capture.getOutput().includes('Test error object'));
    });

    it('should include stack trace in verbose mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'verbose' });
      const error = new Error('Test error with stack');
      logger.errorObject(error);
      const output = capture.getOutput();
      ok(output.includes('Test error with stack'));
      ok(output.includes('at ')); // Stack trace line
    });

    it('should not include stack trace in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      const error = new Error('Test error without stack');
      logger.errorObject(error);
      const output = capture.getOutput();
      ok(output.includes('Test error without stack'));
      deepStrictEqual(output.includes('at '), false);
    });

    it('should log warning messages', () => {
      setOutputOptions({ useEmoji: true, useColors: false });
      logger.warn('Test warning');
      ok(capture.getOutput().includes('⚠️'));
      ok(capture.getOutput().includes('Test warning'));
    });

    it('should log info messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.info('Test info');
      ok(capture.getOutput().includes('ℹ️'));
      ok(capture.getOutput().includes('Test info'));
    });

    it('should suppress info messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.info('Test info');
      deepStrictEqual(capture.getOutput(), '');
    });

    it('should log debug messages in verbose mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'verbose' });
      logger.debug('Test debug');
      ok(capture.getOutput().includes('🐛'));
      ok(capture.getOutput().includes('Test debug'));
    });

    it('should suppress debug messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.debug('Test debug');
      deepStrictEqual(capture.getOutput(), '');
    });

    it('should suppress debug messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.debug('Test debug');
      deepStrictEqual(capture.getOutput(), '');
    });

    it('should log progress messages in normal mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'normal' });
      logger.progress('Test progress');
      ok(capture.getOutput().includes('🔄'));
      ok(capture.getOutput().includes('Test progress'));
    });

    it('should suppress progress messages in quiet mode', () => {
      setOutputOptions({ useEmoji: true, useColors: false, verbosity: 'quiet' });
      logger.progress('Test progress');
      deepStrictEqual(capture.getOutput(), '');
    });
  });

  describe('plain output methods', () => {
    it('should log plain messages', () => {
      setOutputOptions({ useColors: false });
      logger.log('Plain message');
      deepStrictEqual(capture.getOutput(), 'Plain message');
    });

    it('should log multiple arguments', () => {
      setOutputOptions({ useColors: false });
      logger.log('Message', 123, true);
      deepStrictEqual(capture.getOutput(), 'Message 123 true');
    });

    it('should log objects as JSON', () => {
      setOutputOptions({ useColors: false });
      logger.log({ key: 'value' });
      ok(capture.getOutput().includes('"key"'));
      ok(capture.getOutput().includes('"value"'));
    });

    it('should output newlines', () => {
      setOutputOptions({ useColors: false });
      logger.log('Line 1');
      logger.newline();
      logger.log('Line 2');
      const lines = capture.getLines();
      deepStrictEqual(lines.length, 3);
      deepStrictEqual(lines[0], 'Line 1');
      deepStrictEqual(lines[1], '');
      deepStrictEqual(lines[2], 'Line 2');
    });
  });

  describe('display formatting methods', () => {
    beforeEach(() => {
      setOutputOptions({ useColors: false });
    });

    it('should format key-value pairs with default width', () => {
      logger.keyValue('language', 'typescript');
      const output = capture.getOutput();
      ok(output.includes('language:'));
      ok(output.includes('typescript'));
    });

    it('should format key-value pairs with custom width', () => {
      logger.keyValue('lang', 'ts', 10);
      const output = capture.getOutput();
      ok(output.includes('lang:'));
      ok(output.includes('ts'));
    });

    it('should format non-string values', () => {
      logger.keyValue('count', 42);
      const output = capture.getOutput();
      ok(output.includes('count:'));
      ok(output.includes('42'));
    });

    it('should output section headers', () => {
      logger.section('Test Section');
      deepStrictEqual(capture.getOutput(), 'Test Section:');
    });

    it('should output section headers with indent', () => {
      logger.section('Indented', 2);
      deepStrictEqual(capture.getOutput(), '  Indented:');
    });

    it('should output separator lines', () => {
      logger.separator(10);
      deepStrictEqual(capture.getOutput(), '──────────');
    });

    it('should output separator lines with custom character', () => {
      logger.separator(5, '=');
      deepStrictEqual(capture.getOutput(), '=====');
    });

    it('should output titled boxes', () => {
      logger.box('Title', 'Content line 1\nContent line 2');
      const lines = capture.getLines();
      deepStrictEqual(lines.length >= 5, true); // At least: sep, title, sep, content1, content2, sep
      ok(lines.join('\n').includes('TITLE'));
      ok(lines.join('\n').includes('Content line 1'));
      ok(lines.join('\n').includes('Content line 2'));
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
      ok(output.includes('Name'));
      ok(output.includes('Age'));
      ok(output.includes('Alice'));
      ok(output.includes('Bob'));
      ok(output.includes('30'));
      ok(output.includes('25'));
    });

    it('should output empty tables gracefully', () => {
      logger.table([], {
        columns: [{ key: 'name', label: 'Name' }],
      });
      deepStrictEqual(capture.getOutput(), '');
    });

    it('should align table columns to the right', () => {
      const data = [{ num: '1' }];
      logger.table(data, {
        columns: [{ key: 'num', label: 'Number', width: 10, align: 'right' }],
      });
      const lines = capture.getLines();
      const dataLine = lines.find((line) => line.includes('1'));
      ok(dataLine != null);
      match(dataLine, /\s+1/); // Should have leading spaces
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
      deepStrictEqual(lines[0], 'Before');
      deepStrictEqual(lines[1], 'Group');
      deepStrictEqual(lines[2], '  Inside'); // Indented
      deepStrictEqual(lines[3], 'After');
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
      deepStrictEqual(lines[0], 'Outer');
      deepStrictEqual(lines[1], '  Level 1');
      deepStrictEqual(lines[2], '  Inner');
      deepStrictEqual(lines[3], '    Level 2'); // Double indented
      deepStrictEqual(lines[4], '  Back to level 1');
    });

    it('should support groups without labels', () => {
      logger.log('Before');
      logger.group();
      logger.log('Indented');
      logger.groupEnd();
      logger.log('After');

      const lines = capture.getLines();
      deepStrictEqual(lines[0], 'Before');
      deepStrictEqual(lines[1], '  Indented');
      deepStrictEqual(lines[2], 'After');
    });

    it('should handle extra groupEnd calls gracefully', () => {
      logger.group();
      logger.log('Inside');
      logger.groupEnd();
      logger.groupEnd(); // Extra call
      logger.log('After');

      const lines = capture.getLines();
      deepStrictEqual(lines[0], '  Inside');
      deepStrictEqual(lines[1], 'After');
    });
  });

  describe('singleton logger instance', () => {
    it('should export a singleton logger instance', () => {
      deepStrictEqual(logger instanceof Logger, true);
    });

    it('should use the same instance across calls', () => {
      setOutputOptions({ useColors: false });
      logger.group();
      logger.log('Test');
      logger.groupEnd();

      const lines = capture.getLines();
      deepStrictEqual(lines[0], '  Test'); // Should be indented from group call
    });
  });
});
