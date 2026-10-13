/**
 * Tests for the teaching script generator
 *
 * @module tests/core/ai/generator
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import {
  ADVANCED_TEMPLATE,
  BASIC_TEMPLATE,
  COMPREHENSIVE_TEMPLATE,
  type ScriptTemplateType,
  selectTemplateForProblem,
  TEMPLATES,
  TeachingScriptGenerator,
} from '../../../src/core/ai/generator.ts';
import { parseTeachingScript } from '../../../src/core/ai/parser.ts';
import { validateTeachingScript } from '../../../src/core/ai/validator.ts';
import type { Difficulty, Problem } from '../../../src/types/global.ts';

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 'two-sum',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Find two numbers that add up to target',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'hash-table'],
    ...overrides,
  };
}

const templateTypes: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

test('TEMPLATES - maps each template type to its template', () => {
  deepStrictEqual(TEMPLATES.basic, BASIC_TEMPLATE);
  deepStrictEqual(TEMPLATES.comprehensive, COMPREHENSIVE_TEMPLATE);
  deepStrictEqual(TEMPLATES.advanced, ADVANCED_TEMPLATE);
});

for (const type of templateTypes) {
  test(`${type} template - has a description and one intro and one pre_prompt step`, () => {
    const template = TEMPLATES[type];

    deepStrictEqual(template.type, type);
    ok(template.description.length > 0);
    deepStrictEqual(
      template.steps.map((step) => step.type),
      ['intro', 'pre_prompt'],
    );
    for (const step of template.steps) {
      ok(step.content.trim().length > 0);
    }
  });
}

test('selectTemplateForProblem - selects a template by difficulty', () => {
  const expected: Record<Difficulty, ScriptTemplateType> = {
    easy: 'basic',
    medium: 'comprehensive',
    hard: 'advanced',
  };

  for (const [difficulty, type] of Object.entries(expected)) {
    deepStrictEqual(
      selectTemplateForProblem(makeProblem({ difficulty: difficulty as Difficulty })),
      type,
    );
  }
});

test('TeachingScriptGenerator - uses the comprehensive template by default', () => {
  const script = new TeachingScriptGenerator().generate(makeProblem());

  deepStrictEqual(script.steps.length, COMPREHENSIVE_TEMPLATE.steps.length);
});

test('TeachingScriptGenerator - copies problem metadata into the script', () => {
  const script = new TeachingScriptGenerator({ templateType: 'basic' }).generate(makeProblem());

  deepStrictEqual(script.id, 'two-sum');
  deepStrictEqual(script.title, 'Two Sum');
  deepStrictEqual(script.difficulty, 'easy');
  deepStrictEqual(script.tags, ['array', 'hash-table']);
  deepStrictEqual(
    script.steps.map((step) => step.type),
    ['intro', 'pre_prompt'],
  );
});

test('TeachingScriptGenerator - substitutes title and difficulty', () => {
  const problem = makeProblem({ title: 'Test Problem', difficulty: 'medium' });

  for (const templateType of templateTypes) {
    const script = new TeachingScriptGenerator({ templateType }).generate(problem);
    const intro = script.steps.find((step) => step.type === 'intro');

    ok(intro != null);
    ok(intro.content.includes('Test Problem'), templateType);
    for (const step of script.steps) {
      ok(!step.content.includes('{{title}}'));
      ok(!step.content.includes('{{difficulty}}'));
    }
  }
});

test('TeachingScriptGenerator - generateYaml round-trips through the parser and validator', () => {
  for (const templateType of templateTypes) {
    const generator = new TeachingScriptGenerator({ templateType });
    const yaml = generator.generateYaml(makeProblem({ tags: [] }));

    deepStrictEqual(parseTeachingScript(yaml), generator.generate(makeProblem({ tags: [] })));
    const result = validateTeachingScript(Bun.YAML.parse(yaml));
    deepStrictEqual(result.errors, []);
    deepStrictEqual(result.warnings, []);
    ok(!yaml.includes('language:'));
  }
});
