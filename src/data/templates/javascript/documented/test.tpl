/**
 * Tests for {{PROBLEM_TITLE}}
 *
 * @date {{DATE}}
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { {{FUNCTION_NAME}} } from './solution{{FILE_EXTENSION}}';

describe({{PROBLEM_TITLE_LITERAL}}, () => {
  /**
   * Examples from the problem description
   */
  describe('examples', () => {
    {{EXAMPLES_AS_COMMENTS}}
  });

  /**
   * Edge cases
   */
  describe('edge cases', () => {
    it.skip('should handle edge case', () => {
      // TODO: Add edge case tests
    });
  });
});
