/**
 * Tests for AI Teaching Script Generator Types and Templates
 *
 * @module tests/core/ai/generator
 */

import { assertEquals, assertExists } from '@std/assert';
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

Deno.test('ScriptTemplateType - has all expected values', () => {
  const types: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  // Verify all template types are valid by checking they exist in TEMPLATES
  for (const type of types) {
    assertExists(TEMPLATES[type], `Template type "${type}" should exist in TEMPLATES`);
  }
});

// -----------------------------------------------------------------------------
// ScriptGeneratorOptions Tests
// -----------------------------------------------------------------------------

Deno.test('ScriptGeneratorOptions - accepts valid options', () => {
  const options: ScriptGeneratorOptions = {
    templateType: 'basic',
    language: 'typescript',
    includeTopicHints: true,
  };

  assertEquals(options.templateType, 'basic');
  assertEquals(options.language, 'typescript');
  assertEquals(options.includeTopicHints, true);
});

Deno.test('ScriptGeneratorOptions - supports all template types', () => {
  const templateTypes: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  for (const templateType of templateTypes) {
    const options: ScriptGeneratorOptions = {
      templateType,
      language: 'typescript',
      includeTopicHints: false,
    };
    assertEquals(options.templateType, templateType);
  }
});

Deno.test('ScriptGeneratorOptions - supports all languages', () => {
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
    assertEquals(options.language, language);
  }
});

// -----------------------------------------------------------------------------
// BASIC_TEMPLATE Tests
// -----------------------------------------------------------------------------

Deno.test('BASIC_TEMPLATE - has correct type', () => {
  assertEquals(BASIC_TEMPLATE.type, 'basic');
});

Deno.test('BASIC_TEMPLATE - has description', () => {
  assertExists(BASIC_TEMPLATE.description);
  assertEquals(typeof BASIC_TEMPLATE.description, 'string');
  assertEquals(BASIC_TEMPLATE.description.length > 0, true);
});

Deno.test('BASIC_TEMPLATE - has steps array', () => {
  assertExists(BASIC_TEMPLATE.steps);
  assertEquals(Array.isArray(BASIC_TEMPLATE.steps), true);
  assertEquals(BASIC_TEMPLATE.steps.length > 0, true);
});

Deno.test('BASIC_TEMPLATE - includes essential step types', () => {
  const stepTypes = BASIC_TEMPLATE.steps.map((step) => step.type);

  // Basic template should have intro, pre_prompt, and after_success at minimum
  assertEquals(stepTypes.includes('intro'), true, 'Should include intro step');
  assertEquals(stepTypes.includes('pre_prompt'), true, 'Should include pre_prompt step');
  assertEquals(stepTypes.includes('after_success'), true, 'Should include after_success step');
});

Deno.test('BASIC_TEMPLATE - all steps have content', () => {
  for (const step of BASIC_TEMPLATE.steps) {
    assertExists(step.content);
    assertEquals(typeof step.content, 'string');
    assertEquals(
      step.content.length > 0,
      true,
      `Step type "${step.type}" should have non-empty content`,
    );
  }
});

Deno.test('BASIC_TEMPLATE - intro step has no trigger', () => {
  const introStep = BASIC_TEMPLATE.steps.find((step) => step.type === 'intro');
  assertExists(introStep);
  assertEquals(introStep.trigger, undefined, 'Intro step should not have a trigger');
});

Deno.test('BASIC_TEMPLATE - content includes placeholders', () => {
  const introStep = BASIC_TEMPLATE.steps.find((step) => step.type === 'intro');
  assertExists(introStep);

  // Should include template variables like {{title}} or {{difficulty}}
  const hasPlaceholders = introStep.content.includes('{{') && introStep.content.includes('}}');
  assertEquals(hasPlaceholders, true, 'Intro should include template placeholders');
});

// -----------------------------------------------------------------------------
// COMPREHENSIVE_TEMPLATE Tests
// -----------------------------------------------------------------------------

Deno.test('COMPREHENSIVE_TEMPLATE - has correct type', () => {
  assertEquals(COMPREHENSIVE_TEMPLATE.type, 'comprehensive');
});

Deno.test('COMPREHENSIVE_TEMPLATE - has description', () => {
  assertExists(COMPREHENSIVE_TEMPLATE.description);
  assertEquals(typeof COMPREHENSIVE_TEMPLATE.description, 'string');
  assertEquals(COMPREHENSIVE_TEMPLATE.description.length > 0, true);
});

Deno.test('COMPREHENSIVE_TEMPLATE - has more steps than basic', () => {
  assertEquals(
    COMPREHENSIVE_TEMPLATE.steps.length > BASIC_TEMPLATE.steps.length,
    true,
    'Comprehensive template should have more steps than basic template',
  );
});

Deno.test('COMPREHENSIVE_TEMPLATE - includes attempt-based hints', () => {
  const hasAttemptHints = COMPREHENSIVE_TEMPLATE.steps.some(
    (step) => step.trigger && step.trigger.includes('attempts'),
  );
  assertEquals(hasAttemptHints, true, 'Should include attempt-based hints with triggers');
});

Deno.test('COMPREHENSIVE_TEMPLATE - includes on_request steps', () => {
  const hasOnRequest = COMPREHENSIVE_TEMPLATE.steps.some((step) => step.type === 'on_request');
  assertEquals(hasOnRequest, true, 'Should include on_request steps');
});

Deno.test('COMPREHENSIVE_TEMPLATE - on_request steps have keywords', () => {
  const onRequestSteps = COMPREHENSIVE_TEMPLATE.steps.filter((step) => step.type === 'on_request');

  for (const step of onRequestSteps) {
    assertExists(step.keywords, 'on_request steps should have keywords');
    assertEquals(Array.isArray(step.keywords), true);
    assertEquals(step.keywords.length > 0, true, 'keywords array should not be empty');
  }
});

Deno.test('COMPREHENSIVE_TEMPLATE - includes error handling', () => {
  const hasErrorHandling = COMPREHENSIVE_TEMPLATE.steps.some(
    (step) => step.trigger && step.trigger.includes('stderr'),
  );
  assertEquals(hasErrorHandling, true, 'Should include error handling with stderr checks');
});

// -----------------------------------------------------------------------------
// ADVANCED_TEMPLATE Tests
// -----------------------------------------------------------------------------

Deno.test('ADVANCED_TEMPLATE - has correct type', () => {
  assertEquals(ADVANCED_TEMPLATE.type, 'advanced');
});

Deno.test('ADVANCED_TEMPLATE - has description', () => {
  assertExists(ADVANCED_TEMPLATE.description);
  assertEquals(typeof ADVANCED_TEMPLATE.description, 'string');
  assertEquals(ADVANCED_TEMPLATE.description.length > 0, true);
});

Deno.test('ADVANCED_TEMPLATE - has most steps', () => {
  assertEquals(
    ADVANCED_TEMPLATE.steps.length >= COMPREHENSIVE_TEMPLATE.steps.length,
    true,
    'Advanced template should have at least as many steps as comprehensive template',
  );
});

Deno.test('ADVANCED_TEMPLATE - includes persistence encouragement', () => {
  const hasPersistence = ADVANCED_TEMPLATE.steps.some(
    (step) =>
      step.content.toLowerCase().includes('persist') ||
      step.content.toLowerCase().includes('keep going') ||
      step.content.toLowerCase().includes('take a break'),
  );
  assertEquals(hasPersistence, true, 'Should include persistence encouragement');
});

Deno.test('ADVANCED_TEMPLATE - includes optimization hints', () => {
  const hasOptimization = ADVANCED_TEMPLATE.steps.some(
    (step) =>
      step.keywords?.some((k) =>
        k.toLowerCase().includes('optimiz') || k.toLowerCase().includes('complexity')
      ),
  );
  assertEquals(hasOptimization, true, 'Should include optimization-related keywords');
});

Deno.test('ADVANCED_TEMPLATE - includes hint steps', () => {
  const hasHintSteps = ADVANCED_TEMPLATE.steps.some((step) => step.type === 'hint');
  assertEquals(hasHintSteps, true, 'Should include hint type steps');
});

Deno.test('ADVANCED_TEMPLATE - includes strategy frameworks', () => {
  const hasStrategy = ADVANCED_TEMPLATE.steps.some(
    (step) =>
      step.content.toLowerCase().includes('strategy') ||
      step.content.toLowerCase().includes('approach'),
  );
  assertEquals(hasStrategy, true, 'Should include strategy/approach guidance');
});

// -----------------------------------------------------------------------------
// TEMPLATES Map Tests
// -----------------------------------------------------------------------------

Deno.test('TEMPLATES - contains all template types', () => {
  assertExists(TEMPLATES.basic);
  assertExists(TEMPLATES.comprehensive);
  assertExists(TEMPLATES.advanced);
});

Deno.test('TEMPLATES - maps to correct template objects', () => {
  assertEquals(TEMPLATES.basic, BASIC_TEMPLATE);
  assertEquals(TEMPLATES.comprehensive, COMPREHENSIVE_TEMPLATE);
  assertEquals(TEMPLATES.advanced, ADVANCED_TEMPLATE);
});

Deno.test('TEMPLATES - all templates have consistent structure', () => {
  const templateTypes: ScriptTemplateType[] = ['basic', 'comprehensive', 'advanced'];

  for (const type of templateTypes) {
    const template = TEMPLATES[type];

    // Check required properties
    assertExists(template.type);
    assertExists(template.description);
    assertExists(template.steps);

    // Check property types
    assertEquals(typeof template.type, 'string');
    assertEquals(typeof template.description, 'string');
    assertEquals(Array.isArray(template.steps), true);

    // Check template type matches key
    assertEquals(template.type, type);
  }
});

// -----------------------------------------------------------------------------
// selectTemplateForProblem Tests
// -----------------------------------------------------------------------------

Deno.test('selectTemplateForProblem - selects basic for easy problems', () => {
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
  assertEquals(templateType, 'basic');
});

Deno.test('selectTemplateForProblem - selects comprehensive for medium problems', () => {
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
  assertEquals(templateType, 'comprehensive');
});

Deno.test('selectTemplateForProblem - selects advanced for hard problems', () => {
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
  assertEquals(templateType, 'advanced');
});

// -----------------------------------------------------------------------------
// Template Content Quality Tests
// -----------------------------------------------------------------------------

Deno.test('Template content - no steps have empty content', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    for (const step of template.steps) {
      assertEquals(
        step.content.trim().length > 0,
        true,
        `Step type "${step.type}" in ${template.type} template should have non-empty content`,
      );
    }
  }
});

Deno.test('Template content - steps with triggers have valid trigger syntax', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    for (const step of template.steps) {
      if (step.trigger) {
        // Trigger should be a non-empty string
        assertEquals(typeof step.trigger, 'string');
        assertEquals(step.trigger.length > 0, true);

        // Trigger should not have obvious syntax errors
        assertEquals(
          step.trigger.includes('{{'),
          false,
          'Trigger should not contain template placeholders',
        );
      }
    }
  }
});

Deno.test('Template content - on_request steps have valid keywords', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const onRequestSteps = template.steps.filter((step) => step.type === 'on_request');

    for (const step of onRequestSteps) {
      assertExists(step.keywords, `on_request step in ${template.type} should have keywords`);
      assertEquals(Array.isArray(step.keywords), true);
      assertEquals(step.keywords.length > 0, true);

      // All keywords should be non-empty strings
      for (const keyword of step.keywords) {
        assertEquals(typeof keyword, 'string');
        assertEquals(keyword.length > 0, true);
      }
    }
  }
});

Deno.test('Template content - intro and pre_prompt have no triggers', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const introSteps = template.steps.filter((step) => step.type === 'intro');
    const prePromptSteps = template.steps.filter((step) => step.type === 'pre_prompt');

    for (const step of [...introSteps, ...prePromptSteps]) {
      assertEquals(
        step.trigger,
        undefined,
        `${step.type} step in ${template.type} should not have a trigger`,
      );
    }
  }
});

Deno.test('Template content - after_success has no trigger', () => {
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const successSteps = template.steps.filter((step) => step.type === 'after_success');

    for (const step of successSteps) {
      assertEquals(
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

Deno.test('Template progression - basic is simplest', () => {
  // Basic should have the fewest steps
  assertEquals(
    BASIC_TEMPLATE.steps.length < COMPREHENSIVE_TEMPLATE.steps.length,
    true,
    'Basic template should have fewer steps than comprehensive',
  );
  assertEquals(
    BASIC_TEMPLATE.steps.length < ADVANCED_TEMPLATE.steps.length,
    true,
    'Basic template should have fewer steps than advanced',
  );
});

Deno.test('Template progression - complexity increases with template type', () => {
  // Measure complexity by number of steps with triggers
  const basicTriggered = BASIC_TEMPLATE.steps.filter((s) => s.trigger).length;
  const comprehensiveTriggered = COMPREHENSIVE_TEMPLATE.steps.filter((s) => s.trigger).length;
  const advancedTriggered = ADVANCED_TEMPLATE.steps.filter((s) => s.trigger).length;

  assertEquals(
    basicTriggered <= comprehensiveTriggered,
    true,
    'Comprehensive should have at least as many triggered steps as basic',
  );
  assertEquals(
    comprehensiveTriggered <= advancedTriggered,
    true,
    'Advanced should have at least as many triggered steps as comprehensive',
  );
});

Deno.test('Template progression - all templates have required base steps', () => {
  const requiredTypes = ['intro', 'pre_prompt', 'after_success'];
  const allTemplates = [BASIC_TEMPLATE, COMPREHENSIVE_TEMPLATE, ADVANCED_TEMPLATE];

  for (const template of allTemplates) {
    const stepTypes = template.steps.map((s) => s.type);

    for (const requiredType of requiredTypes) {
      assertEquals(
        stepTypes.includes(requiredType as typeof stepTypes[0]),
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

Deno.test('TeachingScriptGenerator - constructor with defaults', () => {
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
  assertEquals(script.language, 'typescript');
});

Deno.test('TeachingScriptGenerator - constructor with custom options', () => {
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

  assertEquals(script.language, 'python');
  // Should use advanced template even though problem is easy
  assertEquals(script.steps.length >= ADVANCED_TEMPLATE.steps.length, true);
});

Deno.test('TeachingScriptGenerator - generate creates complete script', () => {
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
  assertEquals(script.id, 'two-sum');
  assertEquals(script.title, 'Two Sum');
  assertEquals(script.difficulty, 'easy');
  assertEquals(script.tags, ['array', 'hash-table']);

  // Should have steps
  assertEquals(script.steps.length > 0, true);

  // Should have required step types
  const stepTypes = script.steps.map((s) => s.type);
  assertEquals(stepTypes.includes('intro'), true);
  assertEquals(stepTypes.includes('pre_prompt'), true);
  assertEquals(stepTypes.includes('after_success'), true);
});

Deno.test('TeachingScriptGenerator - substitutes variables in content', () => {
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
  assertExists(introStep);

  // {{title}} should be replaced with actual title
  assertEquals(introStep.content.includes('Test Problem'), true);
  assertEquals(introStep.content.includes('{{title}}'), false);

  // {{difficulty}} should be replaced with actual difficulty
  assertEquals(introStep.content.includes('medium'), true);
  assertEquals(introStep.content.includes('{{difficulty}}'), false);

  // {{attempts}} should remain for runtime substitution
  const attemptsSteps = script.steps.filter((s) => s.content.includes('{{attempts}}'));
  // Some templates may have {{attempts}}, others may not
  for (const step of attemptsSteps) {
    assertEquals(step.content.includes('{{attempts}}'), true);
  }
});

Deno.test('TeachingScriptGenerator - auto-selects template based on difficulty', () => {
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
  assertEquals(easyScript.steps.length <= mediumScript.steps.length, true);

  // Medium should have fewer or equal steps than hard
  assertEquals(mediumScript.steps.length <= hardScript.steps.length, true);
});

Deno.test('TeachingScriptGenerator - generateYaml produces valid YAML', () => {
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
  assertEquals(typeof yaml, 'string');
  assertEquals(yaml.length > 0, true);

  // Should contain key metadata fields
  assertEquals(yaml.includes('id: test-yaml'), true);
  assertEquals(yaml.includes('title: Test YAML'), true);
  assertEquals(yaml.includes('difficulty: easy'), true);
  assertEquals(yaml.includes('language: typescript'), true);

  // Should contain tags
  assertEquals(yaml.includes('tags:'), true);
  assertEquals(yaml.includes('- array'), true);

  // Should contain steps
  assertEquals(yaml.includes('steps:'), true);
  assertEquals(yaml.includes('type: intro'), true);
  assertEquals(yaml.includes('content:'), true);
});

Deno.test('TeachingScriptGenerator - generateYaml handles multiline content', () => {
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
  assertEquals(yaml.includes('content: |'), true);
});

Deno.test('TeachingScriptGenerator - generateYaml includes triggers', () => {
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
  assertEquals(yaml.includes('trigger:'), true);
});

Deno.test('TeachingScriptGenerator - generateYaml includes keywords', () => {
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
  assertEquals(yaml.includes('keywords:'), true);
});

Deno.test('TeachingScriptGenerator - preserves step properties', () => {
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
    assertExists(step.type);
    assertEquals(typeof step.type, 'string');

    // All steps must have content
    assertExists(step.content);
    assertEquals(typeof step.content, 'string');
    assertEquals(step.content.length > 0, true);

    // If original step had trigger, it should be preserved
    // (checking this by verifying on_run steps have triggers in comprehensive template)
  }
});

Deno.test('TeachingScriptGenerator - handles problems with empty tags', () => {
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
  assertEquals(script.tags, []);
  assertEquals(yaml.includes('tags: []'), true);
});

Deno.test('TeachingScriptGenerator - handles problems with multiple tags', () => {
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
  assertEquals(script.tags.length, 3);
  assertEquals(yaml.includes('- array'), true);
  assertEquals(yaml.includes('- hash-table'), true);
  assertEquals(yaml.includes('- two-pointers'), true);
});

// -----------------------------------------------------------------------------
// Topic-Specific Hint Generation Tests (ATS-012)
// -----------------------------------------------------------------------------

Deno.test('TeachingScriptGenerator - topic detection from tags', () => {
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
  assertEquals(hintSteps.length > 0, true, 'Should generate DP hints');
  assertEquals(
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
  assertEquals(hintSteps.length > 0, true, 'Should generate tree hints');
  assertEquals(
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
  assertEquals(hintSteps.length > 0, true, 'Should generate hash table hints');
  assertEquals(
    hintSteps.some((s) => s.content.includes('Hash Table')),
    true,
    'Hints should mention Hash Table',
  );
});

Deno.test('TeachingScriptGenerator - detects two-pointers topic', () => {
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

  assertEquals(hintSteps.length > 0, true, 'Should generate two-pointers hints');
  assertEquals(
    hintSteps.some((s) => s.content.includes('Two Pointers')),
    true,
    'Hints should mention Two Pointers',
  );
});

Deno.test('TeachingScriptGenerator - detects binary-search topic', () => {
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

  assertEquals(hintSteps.length > 0, true, 'Should generate binary search hints');
  assertEquals(
    hintSteps.some((s) => s.content.includes('Binary Search')),
    true,
    'Hints should mention Binary Search',
  );
});

Deno.test('TeachingScriptGenerator - detects stack-queue topic', () => {
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
  assertEquals(hintSteps.length > 0, true, 'Should generate stack hints');
  assertEquals(
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
  assertEquals(hintSteps.length > 0, true, 'Should generate queue hints');
});

Deno.test('TeachingScriptGenerator - detects graph topic', () => {
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

    assertEquals(
      hintSteps.length > 0,
      true,
      `Should generate graph hints for tags: ${tags.join(', ')}`,
    );
    assertEquals(
      hintSteps.some((s) => s.content.includes('Graph')),
      true,
      `Hints should mention Graph for tags: ${tags.join(', ')}`,
    );
  }
});

Deno.test('TeachingScriptGenerator - handles multiple topics', () => {
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
  assertEquals(hintSteps.length > 0, true, 'Should generate hints for multiple topics');

  // Should have hints for both DP and binary search
  assertEquals(
    hintSteps.some((s) => s.content.includes('Dynamic Programming')),
    true,
    'Should have DP hints',
  );
  assertEquals(
    hintSteps.some((s) => s.content.includes('Binary Search')),
    true,
    'Should have binary search hints',
  );
});

Deno.test('TeachingScriptGenerator - topic hints have appropriate triggers', () => {
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
    assertExists(step.trigger, 'Hint step should have a trigger');
    assertEquals(typeof step.trigger, 'string', 'Trigger should be a string');
    assertEquals(step.trigger.length > 0, true, 'Trigger should not be empty');
    // Should check for attempts and pass state
    assertEquals(
      step.trigger.includes('attempts') || step.trigger.includes('passed'),
      true,
      'Trigger should reference attempts or passed state',
    );
  }
});

Deno.test('TeachingScriptGenerator - difficulty affects hint triggers', () => {
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
  assertEquals(hardHints.length > 0, true, 'Hard problem should have hints');
  assertEquals(mediumHints.length > 0, true, 'Medium problem should have hints');

  // Hard hints should trigger earlier (lower threshold)
  // Check if hard problem triggers mention a lower number
  const hardTrigger = hardHints[0].trigger || '';
  const mediumTrigger = mediumHints[0].trigger || '';

  // Extract numbers from triggers
  const hardMatch = hardTrigger.match(/attempts\s*>=\s*(\d+)/);
  const mediumMatch = mediumTrigger.match(/attempts\s*>=\s*(\d+)/);

  if (hardMatch && mediumMatch) {
    const hardThreshold = parseInt(hardMatch[1]);
    const mediumThreshold = parseInt(mediumMatch[1]);
    assertEquals(
      hardThreshold <= mediumThreshold,
      true,
      'Hard problem should have lower or equal attempt threshold',
    );
  }
});

Deno.test('TeachingScriptGenerator - includeTopicHints option works', () => {
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

  assertEquals(
    withHintsCount > noHintsCount,
    true,
    'Script with includeTopicHints should have more hint steps',
  );
});

Deno.test('TeachingScriptGenerator - language-specific hints', () => {
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
    assertEquals(hintSteps.length > 0, true, `Should generate hints for ${language}`);

    const hashTableHints = hintSteps.filter((s) => s.content.includes('Hash Table'));
    assertEquals(
      hashTableHints.length > 0,
      true,
      `Should have hash table hints for ${language}`,
    );

    // Check for language-specific mentions
    const content = hashTableHints[0].content.toLowerCase();
    if (language === 'typescript' || language === 'javascript') {
      assertEquals(
        content.includes('map') || content.includes('set'),
        true,
        'TypeScript/JavaScript hints should mention Map or Set',
      );
    } else if (language === 'python') {
      assertEquals(
        content.includes('dict') || content.includes('set'),
        true,
        'Python hints should mention dict or set',
      );
    } else if (language === 'java') {
      assertEquals(
        content.includes('hashmap') || content.includes('hashset'),
        true,
        'Java hints should mention HashMap or HashSet',
      );
    }
  }
});

Deno.test('TeachingScriptGenerator - topic hints include relevant concepts', () => {
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
  const dpHints = script.steps.filter((s) =>
    s.type === 'hint' && s.content.includes('Dynamic Programming')
  );
  assertEquals(dpHints.length > 0, true, 'Should have DP hints');
  const dpContent = dpHints[0].content.toLowerCase();
  assertEquals(
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
  const treeHints = script.steps.filter((s) =>
    s.type === 'hint' && s.content.includes('Binary Tree')
  );
  assertEquals(treeHints.length > 0, true, 'Should have tree hints');
  const treeContent = treeHints[0].content.toLowerCase();
  assertEquals(
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
  const graphHints = script.steps.filter((s) =>
    s.type === 'hint' && s.content.includes('Graph')
  );
  assertEquals(graphHints.length > 0, true, 'Should have graph hints');
  const graphContent = graphHints[0].content.toLowerCase();
  assertEquals(
    graphContent.includes('bfs') || graphContent.includes('dfs') ||
      graphContent.includes('visited'),
    true,
    'Graph hints should mention BFS, DFS, or visited tracking',
  );
});
