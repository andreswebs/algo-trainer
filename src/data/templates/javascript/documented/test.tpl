/**
 * Tests for {{PROBLEM_TITLE}}
 *
 * @date {{DATE}}
 */

import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { {{FUNCTION_NAME}} } from './solution{{FILE_EXTENSION}}';

describe('{{PROBLEM_TITLE}}', () => {
  /**
   * Examples from the problem description
   */
  describe('examples', () => {
{{EXAMPLES}}
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
