/**
 * Tests for teaching script YAML parser
 *
 * @module tests/ai/parser
 */

import { afterAll, beforeAll, describe, test } from 'bun:test';
import { deepStrictEqual, rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findScriptPath,
  loadAndValidateScript,
  loadTeachingScript,
  parseTeachingScript,
} from '../../src/core/ai/parser.ts';
import { ScriptError } from '../../src/utils/errors.ts';
import { assertRejectsWith, assertThrowsWith } from '../helpers/assert.ts';

/**
 * Valid teaching script YAML
 */
const VALID_SCRIPT_YAML = `
id: two-sum
title: Two Sum
difficulty: easy
tags:
  - array
  - hash-table
language: typescript
steps:
  - type: intro
    content: |
      Welcome to Two Sum! This is a classic problem.
  - type: pre_prompt
    content: Think about using a hash table.
  - type: on_run
    content: Great attempt! Try again.
    trigger: passed === false && attempts > 1
  - type: hint
    content: Consider using a Map to store seen numbers.
    trigger: code.includes('for') && !code.includes('Map')
  - type: after_success
    content: Congratulations! You solved it!
  - type: on_request
    content: For optimization, use a hash table instead of nested loops.
    keywords:
      - optimization
      - faster
      - improve
`;

/**
 * Minimal valid script (only required fields)
 */
const MINIMAL_SCRIPT_YAML = `
id: minimal
title: Minimal Problem
difficulty: medium
language: python
steps:
  - type: intro
    content: Hello world
`;

/**
 * Script with missing required field (id)
 */
const MISSING_ID_YAML = `
title: Missing ID
difficulty: easy
language: typescript
steps:
  - type: intro
    content: Test
`;

/**
 * Script with invalid steps (not an array)
 */
const INVALID_STEPS_YAML = `
id: invalid-steps
title: Invalid Steps
difficulty: easy
language: typescript
steps: not_an_array
`;

/**
 * Invalid YAML syntax
 */
const INVALID_YAML = `
id: broken
title: [unclosed
`;

describe('parseTeachingScript', () => {
  test('should parse valid YAML with all fields', () => {
    const script = parseTeachingScript(VALID_SCRIPT_YAML);

    deepStrictEqual(script.id, 'two-sum');
    deepStrictEqual(script.title, 'Two Sum');
    deepStrictEqual(script.difficulty, 'easy');
    deepStrictEqual(script.tags, ['array', 'hash-table']);
    deepStrictEqual(script.language, 'typescript');
    deepStrictEqual(script.steps.length, 6);

    // Verify step types
    deepStrictEqual(script.steps[0].type, 'intro');
    deepStrictEqual(script.steps[1].type, 'pre_prompt');
    deepStrictEqual(script.steps[2].type, 'on_run');
    deepStrictEqual(script.steps[3].type, 'hint');
    deepStrictEqual(script.steps[4].type, 'after_success');
    deepStrictEqual(script.steps[5].type, 'on_request');

    // Verify step content
    deepStrictEqual(
      script.steps[0].content.trim(),
      'Welcome to Two Sum! This is a classic problem.',
    );

    // Verify optional fields
    deepStrictEqual(script.steps[2].trigger, 'passed === false && attempts > 1');
    deepStrictEqual(script.steps[3].trigger, "code.includes('for') && !code.includes('Map')");
    deepStrictEqual(script.steps[5].keywords, ['optimization', 'faster', 'improve']);
  });

  test('should parse minimal valid YAML', () => {
    const script = parseTeachingScript(MINIMAL_SCRIPT_YAML);

    deepStrictEqual(script.id, 'minimal');
    deepStrictEqual(script.title, 'Minimal Problem');
    deepStrictEqual(script.difficulty, 'medium');
    deepStrictEqual(script.tags, []); // Should default to empty array
    deepStrictEqual(script.language, 'python');
    deepStrictEqual(script.steps.length, 1);
    deepStrictEqual(script.steps[0].type, 'intro');
    deepStrictEqual(script.steps[0].content, 'Hello world');
    deepStrictEqual(script.steps[0].trigger, undefined);
    deepStrictEqual(script.steps[0].keywords, undefined);
  });

  test('should normalize tags array', () => {
    const yamlWithMixedTags = `
id: test
title: Test
difficulty: easy
language: typescript
tags:
  - valid-tag
  - 123
  - another-tag
steps:
  - type: intro
    content: Test
`;
    const script = parseTeachingScript(yamlWithMixedTags);
    // Non-string tags should be filtered out
    deepStrictEqual(script.tags, ['valid-tag', 'another-tag']);
  });

  test('should handle missing tags gracefully', () => {
    const yamlWithoutTags = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - type: intro
    content: Test
`;
    const script = parseTeachingScript(yamlWithoutTags);
    deepStrictEqual(script.tags, []);
  });

  test('should handle steps with optional fields', () => {
    const yamlWithOptionalFields = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - type: intro
    content: Test
  - type: hint
    content: Hint
    trigger: attempts > 2
  - type: on_request
    content: Help
    keywords:
      - help
      - hint
`;
    const script = parseTeachingScript(yamlWithOptionalFields);
    deepStrictEqual(script.steps[0].trigger, undefined);
    deepStrictEqual(script.steps[0].keywords, undefined);
    deepStrictEqual(script.steps[1].trigger, 'attempts > 2');
    deepStrictEqual(script.steps[1].keywords, undefined);
    deepStrictEqual(script.steps[2].trigger, undefined);
    deepStrictEqual(script.steps[2].keywords, ['help', 'hint']);
  });

  test('should throw ScriptError on missing required field (id)', () => {
    assertThrowsWith(
      () => {
        parseTeachingScript(MISSING_ID_YAML);
      },
      ScriptError,
      'Missing or invalid required field: id',
    );
  });

  test('should throw ScriptError on invalid YAML', () => {
    assertThrowsWith(
      () => {
        parseTeachingScript(INVALID_YAML);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  test('should throw ScriptError on invalid steps type', () => {
    assertThrowsWith(
      () => {
        parseTeachingScript(INVALID_STEPS_YAML);
      },
      ScriptError,
      'Missing or invalid required field: steps',
    );
  });

  test('should throw ScriptError on invalid step object', () => {
    const yamlWithInvalidStep = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - not_an_object
`;
    assertThrowsWith(
      () => {
        parseTeachingScript(yamlWithInvalidStep);
      },
      ScriptError,
      'Invalid step at index 0',
    );
  });

  test('should throw ScriptError on missing step type', () => {
    const yamlWithMissingType = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - content: Test
`;
    assertThrowsWith(
      () => {
        parseTeachingScript(yamlWithMissingType);
      },
      ScriptError,
      'missing or invalid type',
    );
  });

  test('should throw ScriptError on missing step content', () => {
    const yamlWithMissingContent = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - type: intro
`;
    assertThrowsWith(
      () => {
        parseTeachingScript(yamlWithMissingContent);
      },
      ScriptError,
      'missing or invalid content',
    );
  });
});

describe('loadTeachingScript', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should load and parse valid YAML file', async () => {
    const filePath = join(tempDir, 'valid.yaml');
    await writeFile(filePath, VALID_SCRIPT_YAML);

    const script = await loadTeachingScript(filePath);

    deepStrictEqual(script !== null, true);
    deepStrictEqual(script?.id, 'two-sum');
    deepStrictEqual(script?.title, 'Two Sum');
    deepStrictEqual(script?.difficulty, 'easy');
  });

  test('should return null for non-existent file', async () => {
    const filePath = join(tempDir, 'does-not-exist.yaml');
    const script = await loadTeachingScript(filePath);

    deepStrictEqual(script, null);
  });

  test('should throw ScriptError on invalid YAML file', async () => {
    const filePath = join(tempDir, 'invalid.yaml');
    await writeFile(filePath, INVALID_YAML);

    await assertRejectsWith(
      async () => {
        await loadTeachingScript(filePath);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  test('should throw ScriptError on file with missing required fields', async () => {
    const filePath = join(tempDir, 'missing-fields.yaml');
    await writeFile(filePath, MISSING_ID_YAML);

    await assertRejectsWith(
      async () => {
        await loadTeachingScript(filePath);
      },
      ScriptError,
      'Missing or invalid required field: id',
    );
  });

  test('should include file path in error context', async () => {
    const filePath = join(tempDir, 'error-context.yaml');
    await writeFile(filePath, INVALID_YAML);

    try {
      await loadTeachingScript(filePath);
    } catch (error) {
      if (error instanceof ScriptError) {
        deepStrictEqual(typeof error.context?.filePath, 'string');
      }
    }
  });
});

describe('loadAndValidateScript', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should load and validate valid script', async () => {
    const filePath = join(tempDir, 'valid.yaml');
    await writeFile(filePath, VALID_SCRIPT_YAML);

    const script = await loadAndValidateScript(filePath);

    deepStrictEqual(script !== null, true);
    deepStrictEqual(script?.id, 'two-sum');
    deepStrictEqual(script?.title, 'Two Sum');
    deepStrictEqual(script?.difficulty, 'easy');
  });

  test('should return null for non-existent file', async () => {
    const filePath = join(tempDir, 'does-not-exist.yaml');
    const script = await loadAndValidateScript(filePath);

    deepStrictEqual(script, null);
  });

  test('should throw ScriptError on invalid YAML', async () => {
    const filePath = join(tempDir, 'invalid.yaml');
    await writeFile(filePath, INVALID_YAML);

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  test('should throw ScriptError on validation failure', async () => {
    // Script with invalid difficulty
    const invalidScript = `
id: test
title: Test
difficulty: super-hard
tags: [test]
language: typescript
steps:
  - type: intro
    content: Test
`;
    const filePath = join(tempDir, 'invalid-difficulty.yaml');
    await writeFile(filePath, invalidScript);

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  test('should throw ScriptError on step constraint violation', async () => {
    // intro step should not have triggers
    const invalidScript = `
id: test
title: Test
difficulty: easy
tags: [test]
language: typescript
steps:
  - type: intro
    content: Test
    trigger: passed === true
`;
    const filePath = join(tempDir, 'invalid-constraint.yaml');
    await writeFile(filePath, invalidScript);

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  test('should include validation errors in error context', async () => {
    const invalidScript = `
id: test
title: Test
difficulty: invalid-difficulty
tags: [test]
language: typescript
steps:
  - type: intro
    content: Test
`;
    const filePath = join(tempDir, 'validation-context.yaml');
    await writeFile(filePath, invalidScript);

    try {
      await loadAndValidateScript(filePath);
    } catch (error) {
      if (error instanceof ScriptError) {
        deepStrictEqual(typeof error.context?.errors, 'object');
        deepStrictEqual(Array.isArray(error.context?.errors), true);
      }
    }
  });

  test('should validate hint steps require triggers', async () => {
    const invalidScript = `
id: test
title: Test
difficulty: easy
tags: [test]
language: typescript
steps:
  - type: hint
    content: Test hint without trigger
`;
    const filePath = join(tempDir, 'hint-without-trigger.yaml');
    await writeFile(filePath, invalidScript);

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  test('should validate on_request steps require keywords', async () => {
    const invalidScript = `
id: test
title: Test
difficulty: easy
tags: [test]
language: typescript
steps:
  - type: on_request
    content: Test request without keywords
`;
    const filePath = join(tempDir, 'request-without-keywords.yaml');
    await writeFile(filePath, invalidScript);

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });
});

describe('findScriptPath', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should find trainer.yaml in problem directory', async () => {
    const problemDir = join(tempDir, 'two-sum');
    await mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await writeFile(trainerPath, VALID_SCRIPT_YAML);

    const foundPath = await findScriptPath(problemDir);

    deepStrictEqual(foundPath, trainerPath);
  });

  test('should return null if trainer.yaml does not exist', async () => {
    const problemDir = join(tempDir, 'no-trainer');
    await mkdir(problemDir);

    const foundPath = await findScriptPath(problemDir);

    deepStrictEqual(foundPath, null);
  });

  test('should return null for non-existent directory', async () => {
    const problemDir = join(tempDir, 'does-not-exist');

    const foundPath = await findScriptPath(problemDir);

    deepStrictEqual(foundPath, null);
  });

  test('should work with relative paths', async () => {
    const problemDir = join(tempDir, 'relative-test');
    await mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await writeFile(trainerPath, VALID_SCRIPT_YAML);

    const foundPath = await findScriptPath(problemDir);

    deepStrictEqual(foundPath !== null, true);
    deepStrictEqual(foundPath?.endsWith('trainer.yaml'), true);
  });
});

describe('Integration: findScriptPath + loadAndValidateScript', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'algo-trainer-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should discover and load valid teaching script', async () => {
    const problemDir = join(tempDir, 'two-sum');
    await mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await writeFile(trainerPath, VALID_SCRIPT_YAML);

    const scriptPath = await findScriptPath(problemDir);
    deepStrictEqual(scriptPath !== null, true);

    const script = scriptPath ? await loadAndValidateScript(scriptPath) : null;

    deepStrictEqual(script !== null, true);
    deepStrictEqual(script?.id, 'two-sum');
    deepStrictEqual(script?.title, 'Two Sum');
  });

  test('should return null for problem without trainer.yaml', async () => {
    const problemDir = join(tempDir, 'no-trainer');
    await mkdir(problemDir);

    const scriptPath = await findScriptPath(problemDir);
    deepStrictEqual(scriptPath, null);

    const script = scriptPath ? await loadAndValidateScript(scriptPath) : null;
    deepStrictEqual(script, null);
  });

  test('should reject invalid script even if found', async () => {
    const problemDir = join(tempDir, 'invalid-problem');
    await mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await writeFile(trainerPath, INVALID_YAML);

    const scriptPath = await findScriptPath(problemDir);
    deepStrictEqual(scriptPath !== null, true);

    await rejects(async () => {
      if (scriptPath) {
        await loadAndValidateScript(scriptPath);
      }
    }, ScriptError);
  });
});
