/**
 * Teaching Script Validator Tests
 *
 * Comprehensive tests for teaching script validation covering:
 * - Valid scripts acceptance
 * - Invalid metadata rejection
 * - Step type constraint enforcement
 * - Edge cases and error aggregation
 */

import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { validateTeachingScript, isValidTeachingScript } from '../../src/core/ai/validator.ts';
import type { TeachingScript } from '../../src/core/ai/types.ts';

describe('validateTeachingScript', () => {
  describe('valid scripts', () => {
    it('should accept a minimal valid script', () => {
      const script = {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        tags: ['array', 'hash-table'],
        language: 'typescript',
        steps: [
          {
            type: 'intro',
            content: 'Welcome to Two Sum!',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });

    it('should accept a comprehensive valid script', () => {
      const script: TeachingScript = {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'easy',
        tags: ['array', 'hash-table'],
        language: 'typescript',
        steps: [
          {
            type: 'intro',
            content: 'Welcome to Two Sum!',
          },
          {
            type: 'pre_prompt',
            content: 'Think about using a hash map.',
          },
          {
            type: 'on_run',
            content: 'Your solution is slow.',
            trigger: 'passed === false && attempts > 2',
          },
          {
            type: 'hint',
            content: 'Try using a Map for O(1) lookups.',
            trigger: 'code.includes("for") && !code.includes("Map")',
          },
          {
            type: 'on_request',
            content: 'Here is how to optimize...',
            keywords: ['optimization', 'faster', 'time complexity'],
          },
          {
            type: 'after_success',
            content: 'Great job!',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });

    it('should accept on_run steps without triggers', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'on_run',
            content: 'Generic feedback after run.',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });

    it('should accept all supported languages', () => {
      const languages = ['typescript', 'javascript', 'python', 'java', 'cpp', 'rust', 'go'];

      for (const language of languages) {
        const script = {
          id: 'test',
          title: 'Test',
          difficulty: 'easy',
          tags: ['test'],
          language,
          steps: [{ type: 'intro', content: 'Test' }],
        };

        const result = validateTeachingScript(script);
        assertEquals(result.valid, true, `Language ${language} should be valid`);
      }
    });

    it('should accept all difficulty levels', () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const script = {
          id: 'test',
          title: 'Test',
          difficulty,
          tags: ['test'],
          language: 'typescript',
          steps: [{ type: 'intro', content: 'Test' }],
        };

        const result = validateTeachingScript(script);
        assertEquals(result.valid, true, `Difficulty ${difficulty} should be valid`);
      }
    });

    it('should accept all valid step types', () => {
      const stepTypes = ['intro', 'pre_prompt', 'on_run', 'after_success', 'on_request', 'hint'];

      for (const type of stepTypes) {
        const step: Record<string, unknown> = {
          type,
          content: 'Test content',
        };

        // Add required fields based on type
        if (type === 'hint') {
          step.trigger = 'code.includes("test")';
        } else if (type === 'on_request') {
          step.keywords = ['test'];
        }

        const script = {
          id: 'test',
          title: 'Test',
          difficulty: 'easy',
          tags: ['test'],
          language: 'typescript',
          steps: [step],
        };

        const result = validateTeachingScript(script);
        assertEquals(result.valid, true, `Step type ${type} should be valid`);
      }
    });
  });

  describe('metadata validation', () => {
    it('should reject scripts without id', () => {
      const script = {
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('id')), true);
    });

    it('should reject scripts with empty id', () => {
      const script = {
        id: '',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('id')), true);
    });

    it('should reject scripts without title', () => {
      const script = {
        id: 'test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('title')), true);
    });

    it('should reject scripts with empty title', () => {
      const script = {
        id: 'test',
        title: '',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('title')), true);
    });

    it('should reject scripts without difficulty', () => {
      const script = {
        id: 'test',
        title: 'Test',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('difficulty')), true);
    });

    it('should reject scripts with invalid difficulty', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'super-hard',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('difficulty')), true);
    });

    it('should reject scripts without tags', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('tags')), true);
    });

    it('should reject scripts with non-array tags', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: 'array',
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('tags')), true);
    });

    it('should reject scripts with empty tag strings', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['array', ''],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('tag')), true);
    });

    it('should reject scripts without language', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('language')), true);
    });

    it('should reject scripts with invalid language', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'haskell',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('language')), true);
    });
  });

  describe('steps validation', () => {
    it('should reject scripts without steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('steps')), true);
    });

    it('should reject scripts with non-array steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: 'not an array',
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('steps')), true);
    });

    it('should reject scripts with empty steps array', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('steps')), true);
    });

    it('should reject steps without type', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('type')), true);
    });

    it('should reject steps with invalid type', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'invalid', content: 'Test' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('type')), true);
    });

    it('should reject steps without content', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('content')), true);
    });

    it('should reject steps with empty content', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: '' }],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('content')), true);
    });
  });

  describe('step type constraints', () => {
    it('should reject intro steps with triggers', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'intro',
            content: 'Test',
            trigger: 'passed === true',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.includes('intro') && e.includes('trigger')),
        true,
      );
    });

    it('should reject pre_prompt steps with triggers', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'pre_prompt',
            content: 'Test',
            trigger: 'attempts > 1',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.includes('pre_prompt') && e.includes('trigger')),
        true,
      );
    });

    it('should reject after_success steps with triggers', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'after_success',
            content: 'Test',
            trigger: 'passed === true',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.includes('after_success') && e.includes('trigger')),
        true,
      );
    });

    it('should reject hint steps without triggers', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'hint',
            content: 'Test',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.includes('hint') && e.includes('trigger')),
        true,
      );
    });

    it('should reject on_request steps without keywords', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'on_request',
            content: 'Test',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.includes('on_request') && e.includes('keywords')),
        true,
      );
    });

    it('should reject non-on_request steps with keywords', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'intro',
            content: 'Test',
            keywords: ['test'],
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('keywords')), true);
    });

    it('should reject on_request steps with non-array keywords', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'on_request',
            content: 'Test',
            keywords: 'not-an-array',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('keywords')), true);
    });

    it('should reject on_request steps with empty keyword strings', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'on_request',
            content: 'Test',
            keywords: ['valid', ''],
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('keyword')), true);
    });

    it('should reject steps with empty trigger strings', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'on_run',
            content: 'Test',
            trigger: '',
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('trigger')), true);
    });
  });

  describe('error aggregation', () => {
    it('should return all validation errors at once', () => {
      const script = {
        id: '',
        // missing title
        difficulty: 'invalid',
        tags: 'not-an-array',
        // missing language
        steps: [
          {
            // missing type
            content: '',
          },
          {
            type: 'hint',
            // missing content and trigger
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      // Should have multiple errors (at least 6+)
      assertEquals(result.errors.length > 5, true);
    });

    it('should aggregate errors from multiple steps', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [
          {
            type: 'intro',
            content: 'Test',
            trigger: 'should-not-have',
          },
          {
            type: 'hint',
            content: 'Test',
            // missing trigger
          },
          {
            type: 'on_request',
            content: 'Test',
            // missing keywords
          },
        ],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      // Should have errors for all three steps
      assertEquals(result.errors.length >= 3, true);
    });
  });

  describe('edge cases', () => {
    it('should reject null script', () => {
      const result = validateTeachingScript(null);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('object')), true);
    });

    it('should reject undefined script', () => {
      const result = validateTeachingScript(undefined);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('object')), true);
    });

    it('should reject non-object script', () => {
      const result = validateTeachingScript('not an object');
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('object')), true);
    });

    it('should reject array script', () => {
      const result = validateTeachingScript([]);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('object')), true);
    });

    it('should reject steps with non-object items', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: ['not an object'],
      };

      const result = validateTeachingScript(script);
      assertEquals(result.valid, false);
      assertEquals(result.errors.some((e) => e.includes('object')), true);
    });
  });

  describe('isValidTeachingScript type guard', () => {
    it('should return true for valid scripts', () => {
      const script = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      assertEquals(isValidTeachingScript(script), true);
    });

    it('should return false for invalid scripts', () => {
      const script = {
        id: 'test',
        // missing required fields
      };

      assertEquals(isValidTeachingScript(script), false);
    });

    it('should narrow type when true', () => {
      const script: unknown = {
        id: 'test',
        title: 'Test',
        difficulty: 'easy',
        tags: ['test'],
        language: 'typescript',
        steps: [{ type: 'intro', content: 'Test' }],
      };

      if (isValidTeachingScript(script)) {
        // TypeScript should recognize script as TeachingScript here
        const id: string = script.id;
        assertEquals(typeof id, 'string');
      }
    });
  });
});
