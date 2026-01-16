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
  selectTemplateForProblem,
  TEMPLATES,
  type ScriptGeneratorOptions,
  type ScriptTemplateType,
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
    assertEquals(step.content.length > 0, true, `Step type "${step.type}" should have non-empty content`);
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
    (step) => step.content.toLowerCase().includes('strategy') || step.content.toLowerCase().includes('approach'),
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
        assertEquals(step.trigger.includes('{{'), false, 'Trigger should not contain template placeholders');
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
