/**
 * Tests for CLI prompts module
 *
 * @module test/prompts
 */

import { describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  isInteractive,
  promptConfirm,
  promptDifficulty,
  promptLanguage,
  promptSelect,
  promptText,
} from '../src/cli/prompts.ts';

describe('isInteractive', () => {
  it('should return boolean indicating if terminal is interactive', () => {
    const result = isInteractive();
    deepStrictEqual(typeof result, 'boolean');
  });
});

describe('promptText', () => {
  it('should return default value in non-interactive mode', async () => {
    // In test environment (usually non-interactive), should return default
    const result = await promptText('Test prompt', {
      defaultValue: 'test-default',
    });

    // In non-interactive mode, should return default value
    if (!isInteractive()) {
      deepStrictEqual(result, 'test-default');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptText('Test prompt');

    if (!isInteractive()) {
      deepStrictEqual(result, null);
    }
  });
});

describe('promptSelect', () => {
  it('should return default value in non-interactive mode', async () => {
    const options = ['option1', 'option2', 'option3'];
    const result = await promptSelect('Choose:', options, {
      defaultValue: 'option2',
    });

    if (!isInteractive()) {
      deepStrictEqual(result, 'option2');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const options = ['option1', 'option2', 'option3'];
    const result = await promptSelect('Choose:', options);

    if (!isInteractive()) {
      deepStrictEqual(result, null);
    }
  });

  it('should handle string literal types correctly', async () => {
    const options = ['easy', 'medium', 'hard'] as const;
    const result = await promptSelect('Choose:', [...options], {
      defaultValue: 'medium',
    });

    if (!isInteractive()) {
      deepStrictEqual(result, 'medium');
    }
  });
});

describe('promptConfirm', () => {
  it('should return default value in non-interactive mode', async () => {
    const resultTrue = await promptConfirm('Confirm?', true);
    const resultFalse = await promptConfirm('Confirm?', false);

    if (!isInteractive()) {
      deepStrictEqual(resultTrue, true);
      deepStrictEqual(resultFalse, false);
    }
  });

  it('should default to false when no default specified', async () => {
    const result = await promptConfirm('Confirm?');

    if (!isInteractive()) {
      deepStrictEqual(result, false);
    }
  });
});

describe('promptDifficulty', () => {
  it('should return default difficulty in non-interactive mode', async () => {
    const result = await promptDifficulty('medium');

    if (!isInteractive()) {
      deepStrictEqual(result, 'medium');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptDifficulty();

    if (!isInteractive()) {
      deepStrictEqual(result, null);
    }
  });

  it('should accept valid difficulty values', async () => {
    const easyResult = await promptDifficulty('easy');
    const mediumResult = await promptDifficulty('medium');
    const hardResult = await promptDifficulty('hard');

    if (!isInteractive()) {
      deepStrictEqual(easyResult, 'easy');
      deepStrictEqual(mediumResult, 'medium');
      deepStrictEqual(hardResult, 'hard');
    }
  });
});

describe('promptLanguage', () => {
  it('should return default language in non-interactive mode', async () => {
    const result = await promptLanguage('typescript');

    if (!isInteractive()) {
      deepStrictEqual(result, 'typescript');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptLanguage();

    if (!isInteractive()) {
      deepStrictEqual(result, null);
    }
  });

  it('should accept valid language values', async () => {
    const tsResult = await promptLanguage('typescript');
    const pyResult = await promptLanguage('python');
    const javaResult = await promptLanguage('java');

    if (!isInteractive()) {
      deepStrictEqual(tsResult, 'typescript');
      deepStrictEqual(pyResult, 'python');
      deepStrictEqual(javaResult, 'java');
    }
  });
});

describe('readLine', () => {
  const script = join(import.meta.dir, 'fixtures', 'read-lines.ts');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('AT_')),
  );

  function readFiveLines(input: string): unknown {
    const { status, stdout } = spawnSync(process.execPath, [script], {
      input,
      env,
      encoding: 'utf8',
    });
    deepStrictEqual(status, 0);
    return JSON.parse(stdout);
  }

  it('returns each piped line, then null after end of input', () => {
    deepStrictEqual(readFiveLines('a\nb\nc\n'), ['a', 'b', 'c', null, null]);
  });

  it('returns null for every read on empty input', () => {
    deepStrictEqual(readFiveLines(''), [null, null, null, null, null]);
  });

  it('strips CRLF and returns an unterminated last line', () => {
    deepStrictEqual(readFiveLines('x\r\ny'), ['x', 'y', null, null, null]);
  });
});
