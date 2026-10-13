/**
 * Teaching Script Validator Tests
 *
 * Comprehensive tests for teaching script validation covering:
 * - Valid scripts acceptance
 * - Invalid metadata rejection
 * - Step type constraint enforcement
 * - Edge cases and error aggregation
 */

import { describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import type { TeachingScript } from '../../src/core/ai/types.ts';
import { isValidTeachingScript, validateTeachingScript } from '../../src/core/ai/validator.ts';

describe('validateTeachingScript', () => {
  describe('valid scripts', () => {
    it('should accept a minimal valid script', () => {
      const script = {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        tags: ['array', 'hash-table'],
        steps: [
          {
            type: 'intro',
            content: 'Welcome to Two Sum!',
          },
        ],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, true);
      deepStrictEqual(result.errors.length, 0);
    });

    it('should accept a comprehensive valid script', () => {
      const script: TeachingScript = {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        tags: ['array', 'hash-table'],
        steps: [
          {
            type: 'intro',
            content: 'Welcome to Two Sum!',
          },
          {
            type: 'pre_prompt',
            content: 'Think about using a hash map.',
          },
        ],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, true);
      deepStrictEqual(result.errors.length, 0);
    });

    it('should accept all difficulty levels', () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const script = {
          id: 'test',
          title: 'Test',
          difficulty,
          tags: ['test'],
          steps: [{ type: 'intro', content: 'Test' }],
        };

        const result = validateTeachingScript(script);
        deepStrictEqual(result.valid, true, `Difficulty ${difficulty} should be valid`);
      }
    });

    it('should accept all valid step types', () => {
      for (const type of ['intro', 'pre_prompt']) {
        const step = { type, content: 'Test content' };

        const script = {
          id: 'test',
          title: 'Test',
          difficulty: 'easy',
          tags: ['test'],
          steps: [step],
        };

        const result = validateTeachingScript(script);
        deepStrictEqual(result.valid, true, `Step type ${type} should be valid`);
      }
    });
  });

  describe('metadata validation', () => {
    it('should reject scripts without id', () => {
      const script = {
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('id')),
        true,
      );
    });

    it('should reject scripts with empty id', () => {
      const script = {
        id: '',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('id')),
        true,
      );
    });

    it('should reject scripts without title', () => {
      const script = {
        id: 'test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('title')),
        true,
      );
    });

    it('should reject scripts with empty title', () => {
      const script = {
        id: 'test',
        title: '',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('title')),
        true,
      );
    });

    it('should reject scripts without difficulty', () => {
      const script = {
        id: 'test',
        title: 'Test',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('difficulty')),
        true,
      );
    });

    it('should reject scripts with invalid difficulty', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'super-hard',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('difficulty')),
        true,
      );
    });

    it('should reject scripts without tags', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('tags')),
        true,
      );
    });

    it('should reject scripts with non-array tags', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: 'array',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('tags')),
        true,
      );
    });

    it('should reject scripts with empty tag strings', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['array', ''],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('tag')),
        true,
      );
    });
  });

  describe('steps validation', () => {
    it('should reject scripts without steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('steps')),
        true,
      );
    });

    it('should reject scripts with non-array steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: 'not an array',
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('steps')),
        true,
      );
    });

    it('should reject scripts with empty steps array', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('steps')),
        true,
      );
    });

    it('should reject steps without type', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('type')),
        true,
      );
    });

    it('should reject steps with invalid type', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'invalid', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('type')),
        true,
      );
    });

    it('should reject steps without content', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('content')),
        true,
      );
    });

    it('should reject steps with empty content', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: '' }],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('content')),
        true,
      );
    });
  });

  describe('error aggregation', () => {
    it('should return all validation errors at once', () => {
      const script = {
        id: '',
        // missing title
        difficulty: 'invalid',
        tags: 'not-an-array',
        steps: [
          {
            // missing type
            content: '',
          },
          {
            type: 'pre_prompt',
            // missing content
          },
        ],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      // Should have multiple errors (at least 6+)
      deepStrictEqual(result.errors.length > 5, true);
    });

    it('should aggregate errors from multiple steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [
          { type: 'outro', content: 'Test' },
          { type: 'intro' },
          { type: 'pre_prompt', content: '' },
        ],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(result.errors.length, 3);
    });
  });

  describe('edge cases', () => {
    it('should reject null script', () => {
      const result = validateTeachingScript(null);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('object')),
        true,
      );
    });

    it('should reject undefined script', () => {
      const result = validateTeachingScript(undefined);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('object')),
        true,
      );
    });

    it('should reject non-object script', () => {
      const result = validateTeachingScript('not an object');
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('object')),
        true,
      );
    });

    it('should reject array script', () => {
      const result = validateTeachingScript([]);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('object')),
        true,
      );
    });

    it('should reject steps with non-object items', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: ['not an object'],
      };

      const result = validateTeachingScript(script);
      deepStrictEqual(result.valid, false);
      deepStrictEqual(
        result.errors.some((e) => e.includes('object')),
        true,
      );
    });
  });

  describe('isValidTeachingScript type guard', () => {
    it('should return true for valid scripts', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      deepStrictEqual(isValidTeachingScript(script), true);
    });

    it('should return false for invalid scripts', () => {
      const script = {
        id: 'test',
        // missing required fields
      };

      deepStrictEqual(isValidTeachingScript(script), false);
    });

    it('should narrow type when true', () => {
      const script: unknown = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      if (isValidTeachingScript(script)) {
        // TypeScript should recognize script as TeachingScript here
        const id: string = script.id;
        deepStrictEqual(typeof id, 'string');
      }
    });
  });
});

describe('retired DSL features', () => {
  const base = { id: 'two-sum', title: 'Two Sum', difficulty: 'easy', tags: ['array'] };

  it('accepts retired step types and fields with a warning for each', () => {
    const result = validateTeachingScript({
      ...base,
      steps: [
        { type: 'intro', content: 'Welcome.', trigger: 'attempts > 1' },
        { type: 'hint', content: 'Use a map.', trigger: "code.includes('for')" },
        { type: 'on_request', content: 'Help.', keywords: ['help'] },
      ],
    });

    deepStrictEqual(result.valid, true);
    deepStrictEqual(result.errors, []);
    deepStrictEqual(result.warnings, [
      'steps[0].trigger is no longer supported and is ignored',
      "steps[1]: 'hint' steps are no longer supported and are ignored",
      "steps[2]: 'on_request' steps are no longer supported and are ignored",
    ]);
  });

  it('still rejects unknown step types', () => {
    const result = validateTeachingScript({
      ...base,
      steps: [{ type: 'outro', content: 'Bye.' }],
    });

    deepStrictEqual(result.valid, false);
    deepStrictEqual(result.errors, ['steps[0].type must be one of: intro, pre_prompt']);
  });

  it('does not require a language', () => {
    const result = validateTeachingScript({ ...base, steps: [{ type: 'intro', content: 'Hi.' }] });

    deepStrictEqual(result.valid, true);
    deepStrictEqual(result.warnings, []);
  });
});
