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
steps:
  - type: intro
    content: |
      Welcome to Two Sum! This is a classic problem.
  - type: pre_prompt
    content: Think about using a hash table.
`;

/**
 * Minimal valid script (only required fields)
 */
const MINIMAL_SCRIPT_YAML = `
id: minimal
title: Minimal Problem
difficulty: medium
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
    deepStrictEqual(script.steps.length, 2);
    deepStrictEqual(script.steps[0].type, 'intro');
    deepStrictEqual(script.steps[1].type, 'pre_prompt');

    // Verify step content
    deepStrictEqual(
      script.steps[0].content.trim(),
      'Welcome to Two Sum! This is a classic problem.',
    );
  });

  test('should parse minimal valid YAML', () => {
    const script = parseTeachingScript(MINIMAL_SCRIPT_YAML);

    deepStrictEqual(script.id, 'minimal');
    deepStrictEqual(script.title, 'Minimal Problem');
    deepStrictEqual(script.difficulty, 'medium');
    deepStrictEqual(script.tags, []); // Should default to empty array
    deepStrictEqual(script.steps.length, 1);
    deepStrictEqual(script.steps[0].type, 'intro');
    deepStrictEqual(script.steps[0].content, 'Hello world');
  });

  test('should normalize tags array', () => {
    const yamlWithMixedTags = `
id: test
title: Test
difficulty: easy
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
steps:
  - type: intro
    content: Test
`;
    const script = parseTeachingScript(yamlWithoutTags);
    deepStrictEqual(script.tags, []);
  });

  test('should skip retired step types and fields and accept a script without language', () => {
    const script = parseTeachingScript(`
id: two-sum
title: Two Sum
difficulty: easy
tags: [array]
steps:
  - type: intro
    content: Welcome.
  - type: hint
    trigger: code.includes('for')
    content: Avoid nested loops.
  - type: pre_prompt
    content: Think first.
  - type: on_run
    trigger: '!passed'
    content: Try again.
  - type: after_success
    content: Well done.
  - type: on_request
    keywords: [help]
    content: Here is help.
`);

    deepStrictEqual(script.steps, [
      { type: 'intro', content: 'Welcome.' },
      { type: 'pre_prompt', content: 'Think first.' },
    ]);
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

  test('should throw ScriptError on an unknown step type', async () => {
    const filePath = join(tempDir, 'unknown-step-type.yaml');
    await writeFile(
      filePath,
      'id: test\ntitle: Test\ndifficulty: easy\ntags: [test]\nsteps:\n  - type: outro\n    content: Bye\n',
    );

    await assertRejectsWith(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'steps[0].type must be one of: intro, pre_prompt',
    );
  });

  test('should include validation errors in error context', async () => {
    const invalidScript = `
id: test
title: Test
difficulty: invalid-difficulty
tags: [test]
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

  test('should load a script whose steps are all retired as a script without steps', async () => {
    const filePath = join(tempDir, 'only-retired-steps.yaml');
    await writeFile(
      filePath,
      'id: test\ntitle: Test\ndifficulty: easy\ntags: [test]\nsteps:\n  - type: hint\n    content: Old hint\n',
    );

    const script = await loadAndValidateScript(filePath);
    deepStrictEqual(script?.steps, []);
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
