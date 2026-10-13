import assert from 'node:assert/strict';
import { test } from 'node:test';
import { {{FUNCTION_NAME}} } from './solution{{FILE_EXTENSION}}';

// {{PROBLEM_TITLE}} tests
{{EXAMPLES_AS_COMMENTS}}

test('{{PROBLEM_TITLE}}', () => {
  assert.equal(typeof {{FUNCTION_NAME}}, 'function');
});
