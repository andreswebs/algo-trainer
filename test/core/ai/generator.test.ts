/**
 * Tests for AI Teaching Script Generator Types and Templates
 *
 * @module tests/core/ai/generator
 */

import { test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import {
  ADVANCED_TEMPLATE,
  BASIC_TEMPLATE,
  COMPREHENSIVE_TEMPLATE,
  type ScriptGeneratorOptions,
  type ScriptTemplateType,
  selectTemplateForProblem,
  TEMPLATES,
} from '../../../src/core/ai/generator.ts';
import type { Problem } from '../../../src/types/global.ts';

// -----------------------------------------------------------------------------
// Template Type Tests
// -----------------------------------------------------------------------------

test('ScriptTemplateType - has all expected values', () => {
  const types: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  // Verify all template types are valid by checking they exist in TEMPLATES
  for (const type of types) {
    ok(TEMPLATES[type] != null, `Template type "${type}" should exist in TEMPLATES`);
  }
});

// -----------------------------------------------------------------------------
// ScriptGeneratorOptions Tests
// -----------------------------------------------------------------------------

test('ScriptGeneratorOptions - accepts valid options', () => {
  const options: ScriptGeneratorOptions = {
    templateType: 'basic',
    language: 'typescript',
    includeTopicHints: true,
  };

  deepStrictEqual(options.templateType, 'basic');
  deepStrictEqual(options.language, 'typescript');
  deepStrictEqual(options.includeTopicHints, true);
});

test('ScriptGeneratorOptions - supports all template types', () => {
  const templateTypes: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  for (const templateType of templateTypes) {
    const options: ScriptGeneratorOptions = {
      templateType,
      language: 'typescript',
      includeTopicHints: false,
    };
    deepStrictEqual(options.templateType, templateType);
  }
});

test('ScriptGeneratorOptions - supports all languages', () => {
  const languages: Array<ScriptGeneratorOptions['language']> = [
    'typescript',
    'javascript',
    'python',
    'java',
    'cpp',
    'rust',
    'go',
  ];

  for (const language of languages) {
    const options: ScriptGeneratorOptions = {
      templateType: 'basic',
      language,
      includeTopicHints: true,
    };
    deepStrictEqual(options.language, language);
  }
});

// -----------------------------------------------------------------------------
// BASIC_TEMPLATE Tests
// -----------------------------------------------------------------------------

test('BASIC_TEMPLATE - has correct type', () => {
  deepStrictEqual(BASIC_TEMPLATE.type, 'basic');
});

test('BASIC_TEMPLATE - has description', () => {
  ok(BASIC_TEMPLATE.description != null);
  deepStrictEqual(typeof BASIC_TEMPLATE.description, 'string');
  deepStrictEqual(BASIC_TEMPLATE.description.length > 0, true);
});

test('BASIC_TEMPLATE - has steps array', () => {
  ok(BASIC_TEMPLATE.steps != null);
  deepStrictEqual(Array.isArray(BASIC_TEMPLATE.steps), true);
  deepStrictEqual(BASIC_TEMPLATE.steps.length > 0, true);
});

test('BASIC_TEMPLATE - includes essential step types', () => {
  const stepTypes = BASIC_TEMPLATE.steps.map((step) => step.type);

  // Basic template should have intro, pre_prompt, and after_success at minimum
  deepStrictEqual(stepTypes.includes('intro'), true, 'Should include intro step');
  deepStrictEqual(stepTypes.includes('pre_prompt'), true, 'Should include pre_prompt step');
  deepStrictEqual(stepTypes.includes('after_success'), true, 'Should include after_success step');
});

test('BASIC_TEMPLATE - all steps have content', () => {
  for (const step of BASIC_TEMPLATE.steps) {
    ok(step.content != null);
    deepStrictEqual(typeof step.content, 'string');
    deepStrictEqual(
      step.content.length > 0,
      true,
      `Step type "${step.type}" should have non-empty content`,
    );
  }
});

test('BASIC_TEMPLATE - intro step has no trigger', () => {
  const introStep = BASIC_TEMPLATE.steps.find((step) => step.type === 'intro');
  ok(introStep != null);
  deepStrictEqual(introStep.trigger, undefined, 'Intro step should not have a trigger');
});

test('BASIC_TEMPLATE - content includes placeholders', () => {
  const introStep = BASIC_TEMPLATE.steps.find((step) => step.type === 'intro');
  ok(introStep != null);

  // Should include template variables like {{title}} or {{difficulty}}
  const hasPlaceholders = introStep.content.includes('{{') && introStep.content.includes('}}');
  deepStrictEqual(hasPlaceholders, true, 'Intro should include template placeholders');
});

// -----------------------------------------------------------------------------
// COMPREHENSIVE_TEMPLATE Tests
// -----------------------------------------------------------------------------

test('COMPREHENSIVE_TEMPLATE - has correct type', () => {
  deepStrictEqual(COMPREHENSIVE_TEMPLATE.type, 'comprehensive');
});

test('COMPREHENSIVE_TEMPLATE - has description', () => {
  ok(COMPREHENSIVE_TEMPLATE.description != null);
  deepStrictEqual(typeof COMPREHENSIVE_TEMPLATE.description, 'string');
  deepStrictEqual(COMPREHENSIVE_TEMPLATE.description.length > 0, true);
});

test('COMPREHENSIVE_TEMPLATE - has more steps than basic', () => {
  deepStrictEqual(
    COMPREHENSIVE_TEMPLATE.steps.length > BASIC_TEMPLATE.steps.length,
    true,
    'Comprehensive template should have more steps than basic template',
  );
});

test('COMPREHENSIVE_TEMPLATE - includes attempt-based hints', () => {
  const hasAttemptHints = COMPREHENSIVE_TEMPLATE.steps.some((step) =>
    step.trigger?.includes('attempts'),
  );
  deepStrictEqual(hasAttemptHints, true, 'Should include attempt-based hints with triggers');
});

test('COMPREHENSIVE_TEMPLATE - includes on_request steps', () => {
  const hasOnRequest = COMPREHENSIVE_TEMPLATE.steps.some((step) => step.type === 'on_request');
  deepStrictEqual(hasOnRequest, true, 'Should include on_request steps');
});

test('COMPREHENSIVE_TEMPLATE - on_request steps have keywords', () => {
  const onRequestSteps = COMPREHENSIVE_TEMPLATE.steps.filter((step) => step.type === 'on_request');

  for (const step of onRequestSteps) {
    ok(step.keywords != null, 'on_request steps should have keywords');
    deepStrictEqual(Array.isArray(step.keywords), true);
    deepStrictEqual(step.keywords.length > 0, true, 'keywords array should not be empty');
  }
});

test('COMPREHENSIVE_TEMPLATE - includes error handling', () => {
  const hasErrorHandling = COMPREHENSIVE_TEMPLATE.steps.some((step) =>
    step.trigger?.includes('stderr'),
  );
  deepStrictEqual(hasErrorHandling, true, 'Should include error handling with stderr checks');
});

// -----------------------------------------------------------------------------
// ADVANCED_TEMPLATE Tests
// -----------------------------------------------------------------------------

test('ADVANCED_TEMPLATE - has correct type', () => {
  deepStrictEqual(ADVANCED_TEMPLATE.type, 'advanced');
});

test('ADVANCED_TEMPLATE - has description', () => {
  ok(ADVANCED_TEMPLATE.description != null);
  deepStrictEqual(typeof ADVANCED_TEMPLATE.description, 'string');
  deepStrictEqual(ADVANCED_TEMPLATE.description.length > 0, true);
});

test('ADVANCED_TEMPLATE - has most steps', () => {
  deepStrictEqual(
    ADVANCED_TEMPLATE.steps.length >= COMPREHENSIVE_TEMPLATE.steps.length,
    true,
    'Advanced template should have at least as many steps as comprehensive template',
  );
});

test('ADVANCED_TEMPLATE - includes persistence encouragement', () => {
  const hasPersistence = ADVANCED_TEMPLATE.steps.some(
    (step) =>
      step.content.toLowerCase().includes('persist') ||
      step.content.toLowerCase().includes('keep going') ||
      step.content.toLowerCase().includes('take a break'),
  );
  deepStrictEqual(hasPersistence, true, 'Should include persistence encouragement');
});

test('ADVANCED_TEMPLATE - includes optimization hints', () => {
  const hasOptimization = ADVANCED_TEMPLATE.steps.some((step) =>
    step.keywords?.some(
      (k) => k.toLowerCase().includes('optimiz') || k.toLowerCase().includes('complexity'),
    ),
  );
  deepStrictEqual(hasOptimization, true, 'Should include optimization-related keywords');
});

test('ADVANCED_TEMPLATE - includes hint steps', () => {
  const hasHintSteps = ADVANCED_TEMPLATE.steps.some((step) => step.type === 'hint');
  deepStrictEqual(hasHintSteps, true, 'Should include hint type steps');
});

test('ADVANCED_TEMPLATE - includes strategy frameworks', () => {
  const hasStrategy = ADVANCED_TEMPLATE.steps.some(
    (step) =>
      step.content.toLowerCase().includes('strategy') ||
      step.content.toLowerCase().includes('approach'),
  );
  deepStrictEqual(hasStrategy, true, 'Should include strategy/approach guidance');
});

// -----------------------------------------------------------------------------
// TEMPLATES Map Tests
// -----------------------------------------------------------------------------

test('TEMPLATES - contains all template types', () => {
  ok(TEMPLATES.basic != null);
  ok(TEMPLATES.comprehensive != null);
  ok(TEMPLATES.advanced != null);
});

test('TEMPLATES - maps to correct template objects', () => {
  deepStrictEqual(TEMPLATES.basic, BASIC_TEMPLATE);
  deepStrictEqual(TEMPLATES.comprehensive, COMPREHENSIVE_TEMPLATE);
  deepStrictEqual(TEMPLATES.advanced, ADVANCED_TEMPLATE);
});

test('TEMPLATES - all templates have consistent structure', () => {
  const templateTypes: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  for (const type of templateTypes) {
    const template = TEMPLATES[type];

    // Check required properties
    ok(template.type != null);
    ok(template.description != null);
    ok(template.steps != null);

    // Check property types
    deepStrictEqual(typeof template.type, 'string');
    deepStrictEqual(typeof template.description, 'string');
    deepStrictEqual(Array.isArray(template.steps), true);

    // Check template type matches key
    deepStrictEqual(template.type, type);
  }
});

// -----------------------------------------------------------------------------
// selectTemplateForProblem Tests
// -----------------------------------------------------------------------------

test('selectTemplateForProblem - selects basic for easy problems', () => {
  const problem: Problem = {
    id: '1',
    slug: 'easy-problem',
    title: 'Easy Problem',
    difficulty: 'easy',
    description: 'An easy problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const templateType = selectTemplateForProblem(problem);
  deepStrictEqual(templateType, 'basic');
});

test('selectTemplateForProblem - selects comprehensive for medium problems', () => {
  const problem: Problem = {
    id: '2',
    slug: 'medium-problem',
    title: 'Medium Problem',
    difficulty: 'medium',
    description: 'A medium problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const templateType = selectTemplateForProblem(problem);
  deepStrictEqual(templateType, 'comprehensive');
});

test('selectTemplateForProblem - selects advanced for hard problems', () => {
  const problem: Problem = {
    id: '3',
    slug: 'hard-problem',
    title: 'Hard Problem',
    difficulty: 'hard',
    description: 'A hard problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const templateType = selectTemplateForProblem(problem);
  deepStrictEqual(templateType, 'advanced');
});

// -----------------------------------------------------------------------------
// Template Content Quality Tests
// -----------------------------------------------------------------------------

test('Template content - no steps have empty content', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    for (const step of template.steps) {
      deepStrictEqual(
        step.content.trim().length > 0,
        true,
        `Step type "${step.type}" in ${template.type} template should have non-empty content`,
      );
    }
  }
});

test('Template content - steps with triggers have valid trigger syntax', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    for (const step of template.steps) {
      if (step.trigger) {
        // Trigger should be a non-empty string
        deepStrictEqual(typeof step.trigger, 'string');
        deepStrictEqual(step.trigger.length > 0, true);

        // Trigger should not have obvious syntax errors
        deepStrictEqual(
          step.trigger.includes('{{'),
          false,
          'Trigger should not contain template placeholders',
        );
      }
    }
  }
});

test('Template content - on_request steps have valid keywords', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const onRequestSteps = template.steps.filter((step) => step.type === 'on_request');

    for (const step of onRequestSteps) {
      ok(step.keywords != null, `on_request step in ${template.type} should have keywords`);
      deepStrictEqual(Array.isArray(step.keywords), true);
      deepStrictEqual(step.keywords.length > 0, true);

      // All keywords should be non-empty strings
      for (const keyword of step.keywords) {
        deepStrictEqual(typeof keyword, 'string');
        deepStrictEqual(keyword.length > 0, true);
      }
    }
  }
});

test('Template content - intro and pre_prompt have no triggers', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const introSteps = template.steps.filter((step) => step.type === 'intro');
    const prePromptSteps = template.steps.filter((step) => step.type === 'pre_prompt');

    for (const step of [...introSteps, ...prePromptSteps]) {
      deepStrictEqual(
        step.trigger,
        undefined,
        `${step.type} step in ${template.type} should not have a trigger`,
      );
    }
  }
});

test('Template content - after_success has no trigger', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const successSteps = template.steps.filter((step) => step.type === 'after_success');

    for (const step of successSteps) {
      deepStrictEqual(
        step.trigger,
        undefined,
        `after_success step in ${template.type} should not have a trigger`,
      );
    }
  }
});

// -----------------------------------------------------------------------------
// Template Progression Tests
// -----------------------------------------------------------------------------

test('Template progression - basic is simplest', () => {
  // Basic should have the fewest steps
  deepStrictEqual(
    BASIC_TEMPLATE.steps.length < COMPREHENSIVE_TEMPLATE.steps.length,
    true,
    'Basic template should have fewer steps than comprehensive',
  );
  deepStrictEqual(
    BASIC_TEMPLATE.steps.length < ADVANCED_TEMPLATE.steps.length,
    true,
    'Basic template should have fewer steps than advanced',
  );
});

test('Template progression - complexity increases with template type', () => {
  // Measure complexity by number of steps with triggers
  const basicTriggered = BASIC_TEMPLATE.steps.filter((s) => s.trigger).length;
  const comprehensiveTriggered = COMPREHENSIVE_TEMPLATE.steps.filter((s) => s.trigger).length;
  const advancedTriggered = ADVANCED_TEMPLATE.steps.filter((s) => s.trigger).length;

  deepStrictEqual(
    basicTriggered <= comprehensiveTriggered,
    true,
    'Comprehensive should have at least as many triggered steps as basic',
  );
  deepStrictEqual(
    comprehensiveTriggered <= advancedTriggered,
    true,
    'Advanced should have at least as many triggered steps as comprehensive',
  );
});

test('Template progression - all templates have required base steps', () => {
  const requiredTypes = ['intro', 'pre_prompt', 'after_success'];
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const stepTypes = template.steps.map((s) => s.type);

    for (const requiredType of requiredTypes) {
      deepStrictEqual(
        stepTypes.includes(requiredType as (typeof stepTypes)[0]),
        true,
        `${template.type} template should include ${requiredType} step`,
      );
    }
  }
});

// -----------------------------------------------------------------------------
// TeachingScriptGenerator Tests
// -----------------------------------------------------------------------------

import { TeachingScriptGenerator } from '../../../src/core/ai/generator.ts';

test('TeachingScriptGenerator - constructor with defaults', () => {
  const generator = new TeachingScriptGenerator();

  // Should use default options
  const problem: Problem = {
    id: '1',
    slug: 'test-problem',
    title: 'Test Problem',
    difficulty: 'easy',
    description: 'A test problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const script = generator.generate(problem);

  // Should use default language (typescript)
  deepStrictEqual(script.language, 'typescript');
});

test('TeachingScriptGenerator - constructor with custom options', () => {
  const generator = new TeachingScriptGenerator({
    templateType: 'advanced',
    language: 'python',
    includeTopicHints: false,
  });

  const problem: Problem = {
    id: '1',
    slug: 'test-problem',
    title: 'Test Problem',
    difficulty: 'easy',
    description: 'A test problem',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const script = generator.generate(problem);

  deepStrictEqual(script.language, 'python');
  // Should use advanced template even though problem is easy
  deepStrictEqual(script.steps.length >= ADVANCED_TEMPLATE.steps.length, true);
});

test('TeachingScriptGenerator - generate creates complete script', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'two-sum',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Find two numbers that add up to target',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'hash-table'],
  };

  const script = generator.generate(problem);

  // Verify script metadata matches problem
  deepStrictEqual(script.id, 'two-sum');
  deepStrictEqual(script.title, 'Two Sum');
  deepStrictEqual(script.difficulty, 'easy');
  deepStrictEqual(script.tags, ['array', 'hash-table']);

  // Should have steps
  deepStrictEqual(script.steps.length > 0, true);

  // Should have required step types
  const stepTypes = script.steps.map((s) => s.type);
  deepStrictEqual(stepTypes.includes('intro'), true);
  deepStrictEqual(stepTypes.includes('pre_prompt'), true);
  deepStrictEqual(stepTypes.includes('after_success'), true);
});

test('TeachingScriptGenerator - substitutes variables in content', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test-problem',
    title: 'Test Problem',
    difficulty: 'medium',
    description: 'A test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const script = generator.generate(problem);

  // Find intro step and check variable substitution
  const introStep = script.steps.find((s) => s.type === 'intro');
  ok(introStep != null);

  // {{title}} should be replaced with actual title
  deepStrictEqual(introStep.content.includes('Test Problem'), true);
  deepStrictEqual(introStep.content.includes('{{title}}'), false);

  // {{difficulty}} should be replaced with actual difficulty
  deepStrictEqual(introStep.content.includes('medium'), true);
  deepStrictEqual(introStep.content.includes('{{difficulty}}'), false);

  // {{attempts}} should remain for runtime substitution
  const attemptsSteps = script.steps.filter((s) => s.content.includes('{{attempts}}'));
  // Some templates may have {{attempts}}, others may not
  for (const step of attemptsSteps) {
    deepStrictEqual(step.content.includes('{{attempts}}'), true);
  }
});

test('TeachingScriptGenerator - auto-selects template based on difficulty', () => {
  const generator = new TeachingScriptGenerator();

  const easyProblem: Problem = {
    id: '1',
    slug: 'easy',
    title: 'Easy',
    difficulty: 'easy',
    description: 'Easy',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const mediumProblem: Problem = {
    id: '2',
    slug: 'medium',
    title: 'Medium',
    difficulty: 'medium',
    description: 'Medium',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const hardProblem: Problem = {
    id: '3',
    slug: 'hard',
    title: 'Hard',
    difficulty: 'hard',
    description: 'Hard',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const easyScript = generator.generate(easyProblem);
  const mediumScript = generator.generate(mediumProblem);
  const hardScript = generator.generate(hardProblem);

  // Easy should have fewer steps than medium
  deepStrictEqual(easyScript.steps.length <= mediumScript.steps.length, true);

  // Medium should have fewer or equal steps than hard
  deepStrictEqual(mediumScript.steps.length <= hardScript.steps.length, true);
});

test('TeachingScriptGenerator - generateYaml produces valid YAML', () => {
  const generator = new TeachingScriptGenerator({
    templateType: 'basic',
    language: 'typescript',
  });

  const problem: Problem = {
    id: 'test-yaml',
    slug: 'test-yaml',
    title: 'Test YAML',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array'],
  };

  const yaml = generator.generateYaml(problem);

  // Should be a non-empty string
  deepStrictEqual(typeof yaml, 'string');
  deepStrictEqual(yaml.length > 0, true);

  // Should contain key metadata fields
  deepStrictEqual(yaml.includes('id: test-yaml'), true);
  deepStrictEqual(yaml.includes('title: Test YAML'), true);
  deepStrictEqual(yaml.includes('difficulty: easy'), true);
  deepStrictEqual(yaml.includes('language: typescript'), true);

  // Should contain tags
  deepStrictEqual(yaml.includes('tags:'), true);
  deepStrictEqual(yaml.includes('- array'), true);

  // Should contain steps
  deepStrictEqual(yaml.includes('steps:'), true);
  deepStrictEqual(yaml.includes('type: intro'), true);
  deepStrictEqual(yaml.includes('content:'), true);
});

test('TeachingScriptGenerator - generateYaml handles multiline content', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const yaml = generator.generateYaml(problem);

  // Multiline content should use | syntax
  // Most steps have multiline content, so this should be present
  deepStrictEqual(yaml.includes('content: |'), true);
});

test('TeachingScriptGenerator - generateYaml includes triggers', () => {
  const generator = new TeachingScriptGenerator({
    templateType: 'comprehensive',
  });

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const yaml = generator.generateYaml(problem);

  // Comprehensive template has triggers
  deepStrictEqual(yaml.includes('trigger:'), true);
});

test('TeachingScriptGenerator - generateYaml includes keywords', () => {
  const generator = new TeachingScriptGenerator({
    templateType: 'comprehensive',
  });

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const yaml = generator.generateYaml(problem);

  // Comprehensive template has on_request steps with keywords
  deepStrictEqual(yaml.includes('keywords:'), true);
});

test('TeachingScriptGenerator - preserves step properties', () => {
  const generator = new TeachingScriptGenerator({
    templateType: 'basic',
  });

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [],
  };

  const script = generator.generate(problem);

  // Each step should preserve its original properties except substituted content
  for (const step of script.steps) {
    // All steps must have a type
    ok(step.type != null);
    deepStrictEqual(typeof step.type, 'string');

    // All steps must have content
    ok(step.content != null);
    deepStrictEqual(typeof step.content, 'string');
    deepStrictEqual(step.content.length > 0, true);

    // If original step had trigger, it should be preserved
    // (checking this by verifying on_run steps have triggers in comprehensive template)
  }
});

test('TeachingScriptGenerator - handles problems with empty tags', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: [], // Empty tags
  };

  const script = generator.generate(problem);
  const yaml = generator.generateYaml(problem);

  // Should handle empty tags gracefully
  deepStrictEqual(script.tags, []);
  deepStrictEqual(yaml.includes('tags: []'), true);
});

test('TeachingScriptGenerator - handles problems with multiple tags', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'hash-table', 'two-pointers'],
  };

  const script = generator.generate(problem);
  const yaml = generator.generateYaml(problem);

  // Should include all tags
  deepStrictEqual(script.tags.length, 3);
  deepStrictEqual(yaml.includes('- array'), true);
  deepStrictEqual(yaml.includes('- hash-table'), true);
  deepStrictEqual(yaml.includes('- two-pointers'), true);
});

// -----------------------------------------------------------------------------
// Topic-Specific Hint Generation Tests (ATS-012)
// -----------------------------------------------------------------------------

test('TeachingScriptGenerator - topic detection from tags', () => {
  const generator = new TeachingScriptGenerator();

  // Test Dynamic Programming detection
  const dpProblem: Problem = {
    id: 'dp-test',
    slug: 'dp-test',
    title: 'DP Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['dynamic-programming'],
  };
  let script = generator.generate(dpProblem);
  let hintSteps = script.steps.filter((s) => s.type === 'hint');
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate DP hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Dynamic Programming')),
    true,
    'Hints should mention Dynamic Programming',
  );

  // Test Binary Tree detection
  const treeProblem: Problem = {
    id: 'tree-test',
    slug: 'tree-test',
    title: 'Tree Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['tree', 'binary-tree'],
  };
  script = generator.generate(treeProblem);
  hintSteps = script.steps.filter((s) => s.type === 'hint');
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate tree hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Binary Tree')),
    true,
    'Hints should mention Binary Tree',
  );

  // Test Hash Table detection
  const hashProblem: Problem = {
    id: 'hash-test',
    slug: 'hash-test',
    title: 'Hash Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'hash-table'],
  };
  script = generator.generate(hashProblem);
  hintSteps = script.steps.filter((s) => s.type === 'hint');
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate hash table hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Hash Table')),
    true,
    'Hints should mention Hash Table',
  );
});

test('TeachingScriptGenerator - detects two-pointers topic', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'two-pointers'],
  };

  const script = generator.generate(problem);
  const hintSteps = script.steps.filter((s) => s.type === 'hint');

  deepStrictEqual(hintSteps.length > 0, true, 'Should generate two-pointers hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Two Pointers')),
    true,
    'Hints should mention Two Pointers',
  );
});

test('TeachingScriptGenerator - detects binary-search topic', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'hard',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'binary-search'],
  };

  const script = generator.generate(problem);
  const hintSteps = script.steps.filter((s) => s.type === 'hint');

  deepStrictEqual(hintSteps.length > 0, true, 'Should generate binary search hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Binary Search')),
    true,
    'Hints should mention Binary Search',
  );
});

test('TeachingScriptGenerator - detects stack-queue topic', () => {
  const generator = new TeachingScriptGenerator();

  // Test stack detection
  let problem: Problem = {
    id: 'stack-test',
    slug: 'stack-test',
    title: 'Stack Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['stack'],
  };
  let script = generator.generate(problem);
  let hintSteps = script.steps.filter((s) => s.type === 'hint');
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate stack hints');
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Stack/Queue')),
    true,
    'Hints should mention Stack/Queue',
  );

  // Test queue detection
  problem = {
    id: 'queue-test',
    slug: 'queue-test',
    title: 'Queue Test',
    difficulty: 'easy',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['queue'],
  };
  script = generator.generate(problem);
  hintSteps = script.steps.filter((s) => s.type === 'hint');
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate queue hints');
});

test('TeachingScriptGenerator - detects graph topic', () => {
  const generator = new TeachingScriptGenerator();

  // Test various graph-related tags
  const graphTags = [
    ['graph'],
    ['graph', 'bfs'],
    ['graph', 'dfs'],
    ['breadth-first-search'],
    ['depth-first-search'],
  ];

  for (const tags of graphTags) {
    const problem: Problem = {
      id: 'graph-test',
      slug: 'graph-test',
      title: 'Graph Test',
      difficulty: 'medium',
      description: 'Test',
      examples: [],
      constraints: [],
      hints: [],
      tags,
    };

    const script = generator.generate(problem);
    const hintSteps = script.steps.filter((s) => s.type === 'hint');

    deepStrictEqual(
      hintSteps.length > 0,
      true,
      `Should generate graph hints for tags: ${tags.join(', ')}`,
    );
    deepStrictEqual(
      hintSteps.some((s) => s.content.includes('Graph')),
      true,
      `Hints should mention Graph for tags: ${tags.join(', ')}`,
    );
  }
});

test('TeachingScriptGenerator - handles multiple topics', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'multi-topic',
    slug: 'multi-topic',
    title: 'Multi Topic Test',
    difficulty: 'hard',
    description: 'A complex problem with multiple topics',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['array', 'dynamic-programming', 'binary-search'],
  };

  const script = generator.generate(problem);
  const hintSteps = script.steps.filter((s) => s.type === 'hint');

  // Should generate hints for both detected topics
  deepStrictEqual(hintSteps.length > 0, true, 'Should generate hints for multiple topics');

  // Should have hints for both DP and binary search
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Dynamic Programming')),
    true,
    'Should have DP hints',
  );
  deepStrictEqual(
    hintSteps.some((s) => s.content.includes('Binary Search')),
    true,
    'Should have binary search hints',
  );
});

test('TeachingScriptGenerator - topic hints have appropriate triggers', () => {
  const generator = new TeachingScriptGenerator();

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['hash-table'],
  };

  const script = generator.generate(problem);
  const hintSteps = script.steps.filter((s) => s.type === 'hint');

  // All hint steps should have triggers
  for (const step of hintSteps) {
    ok(step.trigger != null, 'Hint step should have a trigger');
    deepStrictEqual(typeof step.trigger, 'string', 'Trigger should be a string');
    deepStrictEqual(step.trigger.length > 0, true, 'Trigger should not be empty');
    // Should check for attempts and pass state
    deepStrictEqual(
      step.trigger.includes('attempts') || step.trigger.includes('passed'),
      true,
      'Trigger should reference attempts or passed state',
    );
  }
});

test('TeachingScriptGenerator - difficulty affects hint triggers', () => {
  const generator = new TeachingScriptGenerator();

  // Hard problem should have lower attempt threshold
  const hardProblem: Problem = {
    id: 'hard-test',
    slug: 'hard-test',
    title: 'Hard Test',
    difficulty: 'hard',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['dynamic-programming'],
  };

  const hardScript = generator.generate(hardProblem);
  const hardHints = hardScript.steps.filter((s) => s.type === 'hint');

  // Medium/easy problem should have higher attempt threshold
  const mediumProblem: Problem = {
    id: 'medium-test',
    slug: 'medium-test',
    title: 'Medium Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['dynamic-programming'],
  };

  const mediumScript = generator.generate(mediumProblem);
  const mediumHints = mediumScript.steps.filter((s) => s.type === 'hint');

  // Both should have hints
  deepStrictEqual(hardHints.length > 0, true, 'Hard problem should have hints');
  deepStrictEqual(mediumHints.length > 0, true, 'Medium problem should have hints');

  // Hard hints should trigger earlier (lower threshold)
  // Check if hard problem triggers mention a lower number
  const hardTrigger = hardHints[0].trigger || '';
  const mediumTrigger = mediumHints[0].trigger || '';

  // Extract numbers from triggers
  const hardMatch = hardTrigger.match(/attempts\s*>=\s*(\d+)/);
  const mediumMatch = mediumTrigger.match(/attempts\s*>=\s*(\d+)/);

  if (hardMatch && mediumMatch) {
    const hardThreshold = parseInt(hardMatch[1], 10);
    const mediumThreshold = parseInt(mediumMatch[1], 10);
    deepStrictEqual(
      hardThreshold <= mediumThreshold,
      true,
      'Hard problem should have lower or equal attempt threshold',
    );
  }
});

test('TeachingScriptGenerator - includeTopicHints option works', () => {
  // Generator with topic hints disabled
  const generatorNoHints = new TeachingScriptGenerator({
    includeTopicHints: false,
  });

  // Generator with topic hints enabled (default)
  const generatorWithHints = new TeachingScriptGenerator({
    includeTopicHints: true,
  });

  const problem: Problem = {
    id: 'test',
    slug: 'test',
    title: 'Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['hash-table', 'dynamic-programming'],
  };

  const scriptNoHints = generatorNoHints.generate(problem);
  const scriptWithHints = generatorWithHints.generate(problem);

  // Script without topic hints should have fewer or no topic-specific hints
  const noHintsCount = scriptNoHints.steps.filter((s) => s.type === 'hint').length;
  const withHintsCount = scriptWithHints.steps.filter((s) => s.type === 'hint').length;

  deepStrictEqual(
    withHintsCount > noHintsCount,
    true,
    'Script with includeTopicHints should have more hint steps',
  );
});

test('TeachingScriptGenerator - language-specific hints', () => {
  const languages: Array<'typescript' | 'javascript' | 'python' | 'java'> = [
    'typescript',
    'javascript',
    'python',
    'java',
  ];

  for (const language of languages) {
    const generator = new TeachingScriptGenerator({
      language,
      includeTopicHints: true,
    });

    const problem: Problem = {
      id: 'test',
      slug: 'test',
      title: 'Test',
      difficulty: 'easy',
      description: 'Test',
      examples: [],
      constraints: [],
      hints: [],
      tags: ['hash-table'],
    };

    const script = generator.generate(problem);
    const hintSteps = script.steps.filter((s) => s.type === 'hint');

    // Hash table hints should mention language-specific data structures
    deepStrictEqual(hintSteps.length > 0, true, `Should generate hints for ${language}`);

    const hashTableHints = hintSteps.filter((s) => s.content.includes('Hash Table'));
    deepStrictEqual(
      hashTableHints.length > 0,
      true,
      `Should have hash table hints for ${language}`,
    );

    // Check for language-specific mentions
    const content = hashTableHints[0].content.toLowerCase();
    if (language === 'typescript' || language === 'javascript') {
      deepStrictEqual(
        content.includes('map') || content.includes('set'),
        true,
        'TypeScript/JavaScript hints should mention Map or Set',
      );
    } else if (language === 'python') {
      deepStrictEqual(
        content.includes('dict') || content.includes('set'),
        true,
        'Python hints should mention dict or set',
      );
    } else if (language === 'java') {
      deepStrictEqual(
        content.includes('hashmap') || content.includes('hashset'),
        true,
        'Java hints should mention HashMap or HashSet',
      );
    }
  }
});

test('TeachingScriptGenerator - topic hints include relevant concepts', () => {
  const generator = new TeachingScriptGenerator();

  // Test DP hints include key concepts
  let problem: Problem = {
    id: 'dp-test',
    slug: 'dp-test',
    title: 'DP Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['dynamic-programming'],
  };
  let script = generator.generate(problem);
  const dpHints = script.steps.filter(
    (s) => s.type === 'hint' && s.content.includes('Dynamic Programming'),
  );
  deepStrictEqual(dpHints.length > 0, true, 'Should have DP hints');
  const dpContent = dpHints[0].content.toLowerCase();
  deepStrictEqual(
    dpContent.includes('subproblem') || dpContent.includes('recurrence'),
    true,
    'DP hints should mention subproblems or recurrence',
  );

  // Test tree hints include key concepts
  problem = {
    id: 'tree-test',
    slug: 'tree-test',
    title: 'Tree Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['binary-tree'],
  };
  script = generator.generate(problem);
  const treeHints = script.steps.filter(
    (s) => s.type === 'hint' && s.content.includes('Binary Tree'),
  );
  deepStrictEqual(treeHints.length > 0, true, 'Should have tree hints');
  const treeContent = treeHints[0].content.toLowerCase();
  deepStrictEqual(
    treeContent.includes('recursion') || treeContent.includes('traversal'),
    true,
    'Tree hints should mention recursion or traversal',
  );

  // Test graph hints include key concepts
  problem = {
    id: 'graph-test',
    slug: 'graph-test',
    title: 'Graph Test',
    difficulty: 'medium',
    description: 'Test',
    examples: [],
    constraints: [],
    hints: [],
    tags: ['graph', 'bfs'],
  };
  script = generator.generate(problem);
  const graphHints = script.steps.filter((s) => s.type === 'hint' && s.content.includes('Graph'));
  deepStrictEqual(graphHints.length > 0, true, 'Should have graph hints');
  const graphContent = graphHints[0].content.toLowerCase();
  deepStrictEqual(
    graphContent.includes('bfs') ||
      graphContent.includes('dfs') ||
      graphContent.includes('visited'),
    true,
    'Graph hints should mention BFS, DFS, or visited tracking',
  );
});
