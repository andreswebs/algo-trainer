/**
 * Tests for CLI prompts module
 *
 * @module test/prompts
 */

import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
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
    assertEquals(typeof result, 'boolean');
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
      assertEquals(result, 'test-default');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptText('Test prompt');

    if (!isInteractive()) {
      assertEquals(result, null);
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
      assertEquals(result, 'option2');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const options = ['option1', 'option2', 'option3'];
    const result = await promptSelect('Choose:', options);

    if (!isInteractive()) {
      assertEquals(result, null);
    }
  });

  it('should handle string literal types correctly', async () => {
    const options = ['easy', 'medium', 'hard'] as const;
    const result = await promptSelect('Choose:', [...options], {
      defaultValue: 'medium',
    });

    if (!isInteractive()) {
      assertEquals(result, 'medium');
    }
  });
});

describe('promptConfirm', () => {
  it('should return default value in non-interactive mode', async () => {
    const resultTrue = await promptConfirm('Confirm?', true);
    const resultFalse = await promptConfirm('Confirm?', false);

    if (!isInteractive()) {
      assertEquals(resultTrue, true);
      assertEquals(resultFalse, false);
    }
  });

  it('should default to false when no default specified', async () => {
    const result = await promptConfirm('Confirm?');

    if (!isInteractive()) {
      assertEquals(result, false);
    }
  });
});

describe('promptDifficulty', () => {
  it('should return default difficulty in non-interactive mode', async () => {
    const result = await promptDifficulty('medium');

    if (!isInteractive()) {
      assertEquals(result, 'medium');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptDifficulty();

    if (!isInteractive()) {
      assertEquals(result, null);
    }
  });

  it('should accept valid difficulty values', async () => {
    const easyResult = await promptDifficulty('easy');
    const mediumResult = await promptDifficulty('medium');
    const hardResult = await promptDifficulty('hard');

    if (!isInteractive()) {
      assertEquals(easyResult, 'easy');
      assertEquals(mediumResult, 'medium');
      assertEquals(hardResult, 'hard');
    }
  });
});

describe('promptLanguage', () => {
  it('should return default language in non-interactive mode', async () => {
    const result = await promptLanguage('typescript');

    if (!isInteractive()) {
      assertEquals(result, 'typescript');
    }
  });

  it('should return null when no default in non-interactive mode', async () => {
    const result = await promptLanguage();

    if (!isInteractive()) {
      assertEquals(result, null);
    }
  });

  it('should accept valid language values', async () => {
    const tsResult = await promptLanguage('typescript');
    const pyResult = await promptLanguage('python');
    const javaResult = await promptLanguage('java');

    if (!isInteractive()) {
      assertEquals(tsResult, 'typescript');
      assertEquals(pyResult, 'python');
      assertEquals(javaResult, 'java');
    }
  });
});
