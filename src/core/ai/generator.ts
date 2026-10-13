/**
 * AI Teaching Script Generator
 *
 * Generates teaching scripts from problem metadata: an introduction and
 * pre-coding guidance, with the level of detail chosen by template type.
 *
 * @module core/ai/generator
 */

import { stringify as stringifyYaml } from '@std/yaml';
import type { Problem } from '../../types/global.ts';
import type { TeachingScript, TeachingStep } from './types.ts';

/**
 * Template types determine how detailed the generated guidance is.
 *
 * - `basic`: Short introduction and approach questions. Best for easy problems.
 * - `comprehensive`: More structured guidance. Best for medium problems.
 * - `advanced`: Problem-solving strategies for hard problems.
 */
export type ScriptTemplateType = 'basic' | 'comprehensive' | 'advanced';

/**
 * Options for configuring the teaching script generator.
 */
export interface ScriptGeneratorOptions {
  /**
   * Template type to use for script generation. When omitted, the template is
   * selected from the problem's difficulty (see `selectTemplateForProblem`).
   */
  templateType?: ScriptTemplateType;
}

/**
 * Template structure for teaching scripts.
 */
export interface ScriptTemplate {
  /**
   * Template type identifier
   */
  type: ScriptTemplateType;

  /**
   * Human-readable description of when to use this template
   */
  description: string;

  /**
   * Teaching steps included in this template
   */
  steps: TeachingStep[];
}

/**
 * Base template for simple teaching scripts.
 *
 * **Use for**: Easy problems, experienced users, or minimal guidance preference
 */
export const BASIC_TEMPLATE: ScriptTemplate = {
  type: 'basic',
  description: 'Short introduction and approach questions',
  steps: [
    {
      type: 'intro',
      content: `# {{title}}

Welcome! This is a {{difficulty}} level problem.

Take a moment to read through the problem description and examples carefully.
Understanding the problem thoroughly is the first step to solving it.`,
    },
    {
      type: 'pre_prompt',
      content: `Before you start coding, consider:

1. What are the inputs and outputs?
2. Are there any edge cases to handle?
3. What would be a simple approach to solve this?

Start with a solution that works, then optimize if needed.`,
    },
  ],
};

/**
 * Template for detailed teaching scripts.
 *
 * **Use for**: Medium difficulty problems
 */
export const COMPREHENSIVE_TEMPLATE: ScriptTemplate = {
  type: 'comprehensive',
  description: 'Structured introduction and planning guidance',
  steps: [
    {
      type: 'intro',
      content: `# {{title}}

Welcome! This is a {{difficulty}} level problem.

This problem will help you practice important algorithmic concepts.
Take your time to understand the problem statement and examples.

**Strategy**: Read carefully, think through the approach, then implement.`,
    },
    {
      type: 'pre_prompt',
      content: `Before you start coding, let's break down the problem:

1. **Inputs**: What data are you given?
2. **Outputs**: What should your solution return?
3. **Constraints**: What are the limits? (size, values, time)
4. **Edge cases**: Empty inputs, single elements, large inputs?

**Recommended approach**:
- Start with a brute force solution that works
- Test it with the examples
- Then optimize if needed

Don't worry about perfect code on the first try!`,
    },
  ],
};

/**
 * Template for in-depth teaching scripts.
 *
 * **Use for**: Hard problems
 */
export const ADVANCED_TEMPLATE: ScriptTemplate = {
  type: 'advanced',
  description: 'Introduction and problem-solving strategies for hard problems',
  steps: [
    {
      type: 'intro',
      content: `# {{title}}

Welcome to this {{difficulty}} level problem! 🎯

This is a challenging problem that will test your algorithmic skills.
Don't be discouraged if it takes time - that's expected and valuable!

**Mindset for hard problems**:
- Be patient and systematic
- Break the problem into smaller parts
- It's okay to look for patterns in examples
- Learning happens through struggle

Let's tackle this together!`,
    },
    {
      type: 'pre_prompt',
      content: `Before coding, let's develop a strategy:

**1. Understand deeply**:
   - What exactly is being asked?
   - What are the inputs, outputs, and constraints?
   - Work through examples manually to see patterns

**2. Identify the problem type**:
   - Does it involve searching? → Consider binary search, DFS, BFS
   - Need optimal solution? → Consider dynamic programming, greedy
   - Graph-like relationships? → Consider graph algorithms
   - Sequence/substring problems? → Consider two pointers, sliding window

**3. Choose an approach**:
   - Start with brute force to verify understanding
   - Identify bottlenecks
   - Apply appropriate patterns or techniques

**4. Plan your solution**:
   - Sketch pseudocode
   - Identify helper functions
   - Think through edge cases

Remember: It's better to have a working brute force solution than no solution!`,
    },
  ],
};

/**
 * All templates by type.
 */
export const TEMPLATES: Record<ScriptTemplateType, ScriptTemplate> = {
  basic: BASIC_TEMPLATE,
  comprehensive: COMPREHENSIVE_TEMPLATE,
  advanced: ADVANCED_TEMPLATE,
};

/**
 * Select a template type for a problem from its difficulty.
 *
 * @param problem - The problem to select a template for
 * @returns `basic` for easy, `comprehensive` for medium, `advanced` for hard
 */
export function selectTemplateForProblem(problem: Problem): ScriptTemplateType {
  switch (problem.difficulty) {
    case 'easy':
      return 'basic';
    case 'medium':
      return 'comprehensive';
    case 'hard':
      return 'advanced';
  }
}

/**
 * Teaching script generator for creating teaching scripts from problem metadata.
 *
 * @example
 * ```typescript
 * const generator = new TeachingScriptGenerator({ templateType: 'comprehensive' });
 * const yaml = generator.generateYaml(problem);
 * ```
 */
export class TeachingScriptGenerator {
  private options: ScriptGeneratorOptions;

  /**
   * Creates a new teaching script generator.
   *
   * @param options - Generator options
   */
  constructor(options: ScriptGeneratorOptions = {}) {
    this.options = options;
  }

  /**
   * Generates a teaching script from a problem.
   *
   * @param problem - The problem to generate a script for
   * @returns A teaching script with the template's steps, variables substituted
   */
  generate(problem: Problem): TeachingScript {
    const templateType = this.options.templateType ?? selectTemplateForProblem(problem);
    const template = TEMPLATES[templateType];

    return {
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      steps: template.steps.map((step) => ({
        ...step,
        content: this.substituteVariables(step.content, problem),
      })),
    };
  }

  /**
   * Generates a YAML representation of a teaching script, suitable for saving
   * as a trainer.yaml file.
   *
   * @param problem - The problem to generate a script for
   * @returns YAML string representation of the teaching script
   */
  generateYaml(problem: Problem): string {
    return stringifyYaml(this.generate(problem) as unknown as Record<string, unknown>);
  }

  /**
   * Substitutes the `{{title}}` and `{{difficulty}}` variables.
   */
  private substituteVariables(content: string, problem: Problem): string {
    return content
      .replace(/\{\{title\}\}/g, problem.title)
      .replace(/\{\{difficulty\}\}/g, problem.difficulty);
  }
}
