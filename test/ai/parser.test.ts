/**
 * Tests for teaching script YAML parser
 *
 * @module tests/ai/parser
 */

import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { join } from '@std/path';
import {
  findScriptPath,
  loadAndValidateScript,
  loadTeachingScript,
  parseTeachingScript,
} from '../../src/core/ai/parser.ts';
import { ScriptError } from '../../src/utils/errors.ts';

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

Deno.test('parseTeachingScript', async (t) => {
  await t.step('should parse valid YAML with all fields', () => {
    const script = parseTeachingScript(VALID_SCRIPT_YAML);

    assertEquals(script.id, 'two-sum');
    assertEquals(script.title, 'Two Sum');
    assertEquals(script.difficulty, 'easy');
    assertEquals(script.tags, ['array', 'hash-table']);
    assertEquals(script.language, 'typescript');
    assertEquals(script.steps.length, 6);

    // Verify step types
    assertEquals(script.steps[0].type, 'intro');
    assertEquals(script.steps[1].type, 'pre_prompt');
    assertEquals(script.steps[2].type, 'on_run');
    assertEquals(script.steps[3].type, 'hint');
    assertEquals(script.steps[4].type, 'after_success');
    assertEquals(script.steps[5].type, 'on_request');

    // Verify step content
    assertEquals(
      script.steps[0].content.trim(),
      'Welcome to Two Sum! This is a classic problem.',
    );

    // Verify optional fields
    assertEquals(script.steps[2].trigger, 'passed === false && attempts > 1');
    assertEquals(script.steps[3].trigger, "code.includes('for') && !code.includes('Map')");
    assertEquals(script.steps[5].keywords, ['optimization', 'faster', 'improve']);
  });

  await t.step('should parse minimal valid YAML', () => {
    const script = parseTeachingScript(MINIMAL_SCRIPT_YAML);

    assertEquals(script.id, 'minimal');
    assertEquals(script.title, 'Minimal Problem');
    assertEquals(script.difficulty, 'medium');
    assertEquals(script.tags, []); // Should default to empty array
    assertEquals(script.language, 'python');
    assertEquals(script.steps.length, 1);
    assertEquals(script.steps[0].type, 'intro');
    assertEquals(script.steps[0].content, 'Hello world');
    assertEquals(script.steps[0].trigger, undefined);
    assertEquals(script.steps[0].keywords, undefined);
  });

  await t.step('should normalize tags array', () => {
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
    assertEquals(script.tags, ['valid-tag', 'another-tag']);
  });

  await t.step('should handle missing tags gracefully', () => {
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
    assertEquals(script.tags, []);
  });

  await t.step('should handle steps with optional fields', () => {
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
    assertEquals(script.steps[0].trigger, undefined);
    assertEquals(script.steps[0].keywords, undefined);
    assertEquals(script.steps[1].trigger, 'attempts > 2');
    assertEquals(script.steps[1].keywords, undefined);
    assertEquals(script.steps[2].trigger, undefined);
    assertEquals(script.steps[2].keywords, ['help', 'hint']);
  });

  await t.step('should throw ScriptError on missing required field (id)', () => {
    assertThrows(
      () => {
        parseTeachingScript(MISSING_ID_YAML);
      },
      ScriptError,
      'Missing or invalid required field: id',
    );
  });

  await t.step('should throw ScriptError on invalid YAML', () => {
    assertThrows(
      () => {
        parseTeachingScript(INVALID_YAML);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  await t.step('should throw ScriptError on invalid steps type', () => {
    assertThrows(
      () => {
        parseTeachingScript(INVALID_STEPS_YAML);
      },
      ScriptError,
      'Missing or invalid required field: steps',
    );
  });

  await t.step('should throw ScriptError on invalid step object', () => {
    const yamlWithInvalidStep = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - not_an_object
`;
    assertThrows(
      () => {
        parseTeachingScript(yamlWithInvalidStep);
      },
      ScriptError,
      'Invalid step at index 0',
    );
  });

  await t.step('should throw ScriptError on missing step type', () => {
    const yamlWithMissingType = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - content: Test
`;
    assertThrows(
      () => {
        parseTeachingScript(yamlWithMissingType);
      },
      ScriptError,
      'missing or invalid type',
    );
  });

  await t.step('should throw ScriptError on missing step content', () => {
    const yamlWithMissingContent = `
id: test
title: Test
difficulty: easy
language: typescript
steps:
  - type: intro
`;
    assertThrows(
      () => {
        parseTeachingScript(yamlWithMissingContent);
      },
      ScriptError,
      'missing or invalid content',
    );
  });
});

Deno.test('loadTeachingScript', async (t) => {
  const tempDir = await Deno.makeTempDir();

  await t.step('should load and parse valid YAML file', async () => {
    const filePath = join(tempDir, 'valid.yaml');
    await Deno.writeTextFile(filePath, VALID_SCRIPT_YAML);

    const script = await loadTeachingScript(filePath);

    assertEquals(script !== null, true);
    assertEquals(script?.id, 'two-sum');
    assertEquals(script?.title, 'Two Sum');
    assertEquals(script?.difficulty, 'easy');
  });

  await t.step('should return null for non-existent file', async () => {
    const filePath = join(tempDir, 'does-not-exist.yaml');
    const script = await loadTeachingScript(filePath);

    assertEquals(script, null);
  });

  await t.step('should throw ScriptError on invalid YAML file', async () => {
    const filePath = join(tempDir, 'invalid.yaml');
    await Deno.writeTextFile(filePath, INVALID_YAML);

    await assertRejects(
      async () => {
        await loadTeachingScript(filePath);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  await t.step('should throw ScriptError on file with missing required fields', async () => {
    const filePath = join(tempDir, 'missing-fields.yaml');
    await Deno.writeTextFile(filePath, MISSING_ID_YAML);

    await assertRejects(
      async () => {
        await loadTeachingScript(filePath);
      },
      ScriptError,
      'Missing or invalid required field: id',
    );
  });

  await t.step('should include file path in error context', async () => {
    const filePath = join(tempDir, 'error-context.yaml');
    await Deno.writeTextFile(filePath, INVALID_YAML);

    try {
      await loadTeachingScript(filePath);
    } catch (error) {
      if (error instanceof ScriptError) {
        assertEquals(typeof error.context?.filePath, 'string');
      }
    }
  });

  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('loadAndValidateScript', async (t) => {
  const tempDir = await Deno.makeTempDir();

  await t.step('should load and validate valid script', async () => {
    const filePath = join(tempDir, 'valid.yaml');
    await Deno.writeTextFile(filePath, VALID_SCRIPT_YAML);

    const script = await loadAndValidateScript(filePath);

    assertEquals(script !== null, true);
    assertEquals(script?.id, 'two-sum');
    assertEquals(script?.title, 'Two Sum');
    assertEquals(script?.difficulty, 'easy');
  });

  await t.step('should return null for non-existent file', async () => {
    const filePath = join(tempDir, 'does-not-exist.yaml');
    const script = await loadAndValidateScript(filePath);

    assertEquals(script, null);
  });

  await t.step('should throw ScriptError on invalid YAML', async () => {
    const filePath = join(tempDir, 'invalid.yaml');
    await Deno.writeTextFile(filePath, INVALID_YAML);

    await assertRejects(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Failed to parse YAML content',
    );
  });

  await t.step('should throw ScriptError on validation failure', async () => {
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
    await Deno.writeTextFile(filePath, invalidScript);

    await assertRejects(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  await t.step('should throw ScriptError on step constraint violation', async () => {
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
    await Deno.writeTextFile(filePath, invalidScript);

    await assertRejects(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  await t.step('should include validation errors in error context', async () => {
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
    await Deno.writeTextFile(filePath, invalidScript);

    try {
      await loadAndValidateScript(filePath);
    } catch (error) {
      if (error instanceof ScriptError) {
        assertEquals(typeof error.context?.errors, 'object');
        assertEquals(Array.isArray(error.context?.errors), true);
      }
    }
  });

  await t.step('should validate hint steps require triggers', async () => {
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
    await Deno.writeTextFile(filePath, invalidScript);

    await assertRejects(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  await t.step('should validate on_request steps require keywords', async () => {
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
    await Deno.writeTextFile(filePath, invalidScript);

    await assertRejects(
      async () => {
        await loadAndValidateScript(filePath);
      },
      ScriptError,
      'Teaching script validation failed',
    );
  });

  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('findScriptPath', async (t) => {
  const tempDir = await Deno.makeTempDir();

  await t.step('should find trainer.yaml in problem directory', async () => {
    const problemDir = join(tempDir, 'two-sum');
    await Deno.mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await Deno.writeTextFile(trainerPath, VALID_SCRIPT_YAML);

    const foundPath = await findScriptPath(problemDir);

    assertEquals(foundPath, trainerPath);
  });

  await t.step('should return null if trainer.yaml does not exist', async () => {
    const problemDir = join(tempDir, 'no-trainer');
    await Deno.mkdir(problemDir);

    const foundPath = await findScriptPath(problemDir);

    assertEquals(foundPath, null);
  });

  await t.step('should return null for non-existent directory', async () => {
    const problemDir = join(tempDir, 'does-not-exist');

    const foundPath = await findScriptPath(problemDir);

    assertEquals(foundPath, null);
  });

  await t.step('should work with relative paths', async () => {
    const problemDir = join(tempDir, 'relative-test');
    await Deno.mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await Deno.writeTextFile(trainerPath, VALID_SCRIPT_YAML);

    const foundPath = await findScriptPath(problemDir);

    assertEquals(foundPath !== null, true);
    assertEquals(foundPath?.endsWith('trainer.yaml'), true);
  });

  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('Integration: findScriptPath + loadAndValidateScript', async (t) => {
  const tempDir = await Deno.makeTempDir();

  await t.step('should discover and load valid teaching script', async () => {
    const problemDir = join(tempDir, 'two-sum');
    await Deno.mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await Deno.writeTextFile(trainerPath, VALID_SCRIPT_YAML);

    const scriptPath = await findScriptPath(problemDir);
    assertEquals(scriptPath !== null, true);

    const script = scriptPath ? await loadAndValidateScript(scriptPath) : null;

    assertEquals(script !== null, true);
    assertEquals(script?.id, 'two-sum');
    assertEquals(script?.title, 'Two Sum');
  });

  await t.step('should return null for problem without trainer.yaml', async () => {
    const problemDir = join(tempDir, 'no-trainer');
    await Deno.mkdir(problemDir);

    const scriptPath = await findScriptPath(problemDir);
    assertEquals(scriptPath, null);

    const script = scriptPath ? await loadAndValidateScript(scriptPath) : null;
    assertEquals(script, null);
  });

  await t.step('should reject invalid script even if found', async () => {
    const problemDir = join(tempDir, 'invalid-problem');
    await Deno.mkdir(problemDir);
    const trainerPath = join(problemDir, 'trainer.yaml');
    await Deno.writeTextFile(trainerPath, INVALID_YAML);

    const scriptPath = await findScriptPath(problemDir);
    assertEquals(scriptPath !== null, true);

    await assertRejects(
      async () => {
        if (scriptPath) {
          await loadAndValidateScript(scriptPath);
        }
      },
      ScriptError,
    );
  });

  // Cleanup
  await Deno.remove(tempDir, { recursive: true });
});
