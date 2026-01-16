/**
 * AI Teaching Script Generator
 *
 * This module provides types and templates for generating teaching scripts from
 * problem metadata. Generators can create scripts with varying levels of detail
 * and topic-specific guidance.
 *
 * @module core/ai/generator
 */

import type { Problem, SupportedLanguage } from '../../types/global.ts';
import type { TeachingScript, TeachingStep } from './types.ts';

/**
 * Template types determine the comprehensiveness of generated teaching scripts.
 *
 * - `basic`: Simple intro, pre_prompt, error handling, and success message.
 *   Best for easy problems or users who prefer minimal guidance.
 *
 * - `comprehensive`: Adds multiple attempt hints, debugging help, and more
 *   detailed guidance. Best for medium difficulty problems.
 *
 * - `advanced`: Includes complex problem-solving strategies, persistence
 *   encouragement, and advanced debugging tips. Best for hard problems.
 */
export type ScriptTemplateType = 'basic' | 'comprehensive' | 'advanced';

/**
 * Options for configuring the teaching script generator.
 *
 * These options control what type of script is generated and what additional
 * features are included.
 */
export interface ScriptGeneratorOptions {
  /**
   * Template type to use for script generation.
   *
   * If not specified, will be auto-selected based on problem difficulty:
   * - easy → basic
   * - medium → comprehensive
   * - hard → advanced
   */
  templateType: ScriptTemplateType;

  /**
   * Target programming language for the script.
   *
   * Language-specific guidance (e.g., syntax hints, common patterns) will be
   * included based on this setting.
   */
  language: SupportedLanguage;

  /**
   * Whether to include topic-specific hints based on problem tags.
   *
   * When enabled, the generator will add specialized hints for recognized
   * topics like dynamic programming, binary trees, hash tables, etc.
   *
   * @default true
   */
  includeTopicHints: boolean;
}

/**
 * Base template structure for teaching scripts.
 *
 * Each template type has a predefined structure with specific teaching steps
 * that guide users through the problem-solving process.
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
   * Base teaching steps included in this template
   *
   * These steps form the foundation of the generated script. Additional
   * topic-specific hints may be added based on generator options.
   */
  steps: TeachingStep[];
}

/**
 * Base template for simple teaching scripts.
 *
 * The basic template provides essential guidance without overwhelming the user.
 * It includes:
 * - Welcome message introducing the problem
 * - Pre-coding guidance on approach
 * - Common error detection
 * - Success celebration
 *
 * **Use for**: Easy problems, experienced users, or minimal guidance preference
 *
 * **Does not include**: Multiple attempt hints, detailed debugging, persistence encouragement
 */
export const BASIC_TEMPLATE: ScriptTemplate = {
  type: 'basic',
  description: 'Simple guidance with intro, approach hints, error detection, and success message',
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
    {
      type: 'on_run',
      trigger: 'stderr.length > 0 && !passed',
      content: `It looks like there was an error in your code. Check the error message above
for details about what went wrong.

Common issues to check:
- Syntax errors
- Undefined variables
- Type mismatches`,
    },
    {
      type: 'after_success',
      content: `🎉 Excellent work! You've solved the problem!

Take a moment to:
- Review your solution
- Consider the time and space complexity
- Think about whether there are alternative approaches`,
    },
  ],
};

/**
 * Comprehensive template for detailed teaching scripts.
 *
 * The comprehensive template provides balanced guidance with additional support
 * for users who may struggle. It includes everything from the basic template plus:
 * - Multiple attempt encouragement
 * - Specific error pattern detection
 * - Debugging strategies
 * - Hints after repeated failures
 *
 * **Use for**: Medium difficulty problems, learning users, standard guidance preference
 *
 * **Extends basic with**: Attempt-based hints, error pattern matching, debugging help
 */
export const COMPREHENSIVE_TEMPLATE: ScriptTemplate = {
  type: 'comprehensive',
  description: 'Balanced guidance with attempt-based hints, error detection, and debugging help',
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
    {
      type: 'on_run',
      trigger: 'stderr.length > 0 && !passed',
      content: `Your code encountered an error. Let's debug:

1. **Read the error message** carefully - it tells you what went wrong
2. **Check the line number** where the error occurred
3. **Common issues**:
   - Syntax errors (missing brackets, semicolons)
   - Undefined variables or functions
   - Type errors (wrong data types)
   - Index out of bounds

Add console.log statements to track variable values if you're unsure where the issue is.`,
    },
    {
      type: 'on_run',
      trigger: '!passed && attempts > 1',
      content: `You've made {{attempts}} attempts. Keep going! Debugging is a normal part of coding.

**Debugging tips**:
- Check your logic step by step
- Test with simple examples first
- Print intermediate values
- Compare expected vs actual output`,
    },
    {
      type: 'on_run',
      trigger: '!passed && attempts > 3',
      content: `Still working on this? That's completely normal for a {{difficulty}} problem!

**Try these strategies**:
1. Go back to the problem description - are you solving the right thing?
2. Test your code with the provided examples manually
3. Break down your solution into smaller functions
4. Use the hint command if you're stuck

Remember: Struggling is how you learn. Every attempt makes you better! 💪`,
    },
    {
      type: 'on_request',
      keywords: ['hint', 'help', 'stuck', 'approach'],
      content: `When you're stuck, try:

1. **Trace through an example** by hand to understand the pattern
2. **Simplify**: What would you do with the smallest possible input?
3. **Look for patterns**: Does this remind you of other problems?
4. **Consider data structures**: Would a hash map, set, or array help?

Sometimes stepping away and coming back helps too!`,
    },
    {
      type: 'after_success',
      content: `🎉 Fantastic! You solved it after {{attempts}} attempt(s)!

**Reflection**:
- What was your approach?
- What's the time complexity? Space complexity?
- Could you solve it differently?
- What did you learn?

Great job working through this {{difficulty}} problem! 🚀`,
    },
  ],
};

/**
 * Advanced template for complex problem guidance.
 *
 * The advanced template provides comprehensive support for challenging problems.
 * It includes everything from the comprehensive template plus:
 * - Problem-solving strategy frameworks
 * - Pattern recognition hints
 * - Advanced optimization suggestions
 * - Strong persistence encouragement
 * - Structured debugging approaches
 *
 * **Use for**: Hard difficulty problems, complex algorithms, maximum guidance preference
 *
 * **Extends comprehensive with**: Strategy frameworks, pattern recognition, optimization hints
 */
export const ADVANCED_TEMPLATE: ScriptTemplate = {
  type: 'advanced',
  description:
    'Comprehensive guidance with strategy frameworks, pattern recognition, and optimization hints',
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
    {
      type: 'on_run',
      trigger: 'stderr.length > 0 && !passed',
      content: `Error detected. Let's debug systematically:

**Step 1: Understand the error**
- Read the full error message
- Identify the error type (syntax, runtime, logic)
- Note the line number

**Step 2: Isolate the issue**
- Can you reproduce it with a simple test case?
- Add logging to trace execution flow
- Check variable states at key points

**Step 3: Common error patterns**:
- **Off-by-one errors**: Check loop bounds and array indices
- **Null/undefined**: Verify variables are initialized
- **Type mismatches**: Ensure operations match data types
- **Infinite loops**: Verify loop exit conditions

You've got this! 🔍`,
    },
    {
      type: 'on_run',
      trigger: '!passed && attempts > 2',
      content:
        `{{attempts}} attempts in - you're making progress! This is a {{difficulty}} problem, so persistence is key.

**Debugging strategies for complex problems**:
1. **Divide and conquer**: Test each part of your solution separately
2. **Work backwards**: Start with expected output, trace back to inputs
3. **Compare with examples**: Manually walk through provided test cases
4. **Check assumptions**: Are you certain about input format and constraints?

Every attempt teaches you something valuable. Keep going! 💪`,
    },
    {
      type: 'on_run',
      trigger: '!passed && attempts > 4',
      content:
        `Still working on this? That shows great persistence! Hard problems require multiple attempts.

**When you're deeply stuck**:
1. **Take a break**: Sometimes the solution comes when you step away
2. **Simplify the problem**: Can you solve a smaller version first?
3. **Review fundamentals**: Does this problem use a pattern you've seen?
4. **Use the hint system**: Type \`hint\` for contextual guidance
5. **Pseudocode first**: Write out steps in plain language before coding

**Remember**: The best developers aren't those who solve problems instantly,
but those who persist through challenges. You're building crucial problem-solving skills! 🧠`,
    },
    {
      type: 'hint',
      trigger: 'attempts > 3 && !passed',
      content: `After {{attempts}} attempts, here are some things to consider:

**Strategy check**:
- Have you identified the correct algorithmic pattern?
- Is your approach optimal, or just correct?
- Are you handling all edge cases?

**Common pitfalls in {{difficulty}} problems**:
- Overlooking constraint implications
- Choosing suboptimal data structures
- Missing optimization opportunities
- Incomplete edge case handling

Try explaining your approach out loud - it often reveals gaps in logic!`,
    },
    {
      type: 'on_request',
      keywords: ['hint', 'help', 'stuck', 'approach', 'strategy'],
      content: `Here's a structured approach to get unstuck:

**1. Problem clarification**:
   - Reread the problem statement carefully
   - Ensure you understand all constraints
   - Work through examples by hand

**2. Pattern recognition**:
   - What similar problems have you solved?
   - What data structures are commonly used for this type of problem?
   - Is there a well-known algorithm that applies?

**3. Solution development**:
   - Start with a naive solution that works
   - Identify the bottleneck
   - Apply optimization techniques

**4. Verification**:
   - Test with simple cases
   - Test edge cases
   - Verify time/space complexity

Use the hint system for more specific guidance!`,
    },
    {
      type: 'on_request',
      keywords: ['optimization', 'optimize', 'faster', 'complexity', 'performance'],
      content: `Looking to optimize? Here's a systematic approach:

**1. Analyze current complexity**:
   - What's your time complexity? O(n²)? O(n log n)?
   - What's your space complexity?
   - Which operations are repeated unnecessarily?

**2. Common optimization techniques**:
   - **Use hash maps** to reduce lookup time from O(n) to O(1)
   - **Two pointers** for array problems can reduce nested loops
   - **Dynamic programming** can eliminate redundant calculations
   - **Sort first** if that enables a more efficient algorithm

**3. Trade-offs**:
   - Sometimes you trade space for time
   - More complex code for better performance
   - Consider if the optimization is worth the complexity

For specific optimization hints, analyze your current approach and ask yourself:
"What am I computing repeatedly that I could cache or avoid?"`,
    },
    {
      type: 'after_success',
      content: `🎉 Outstanding! You conquered this {{difficulty}} problem! 🏆

**What you accomplished**:
- Solved after {{attempts}} attempt(s)
- Demonstrated persistence and problem-solving skills
- Overcame a challenging algorithmic problem

**Reflection questions**:
1. **Approach**: What was your strategy? What patterns did you use?
2. **Complexity**: Time complexity? Space complexity? Can you prove it?
3. **Alternatives**: Could you solve this differently? Trade-offs?
4. **Learning**: What new concepts or techniques did you use?
5. **Similar problems**: What related problems could you solve now?

**Next steps**:
- Implement an alternative solution for practice
- Explain your solution to solidify understanding
- Look for similar problems to reinforce the pattern

Excellent work! You're building strong algorithmic thinking skills! 🚀`,
    },
  ],
};

/**
 * Map of template types to their implementations.
 *
 * Use this to look up a template by type when generating scripts.
 */
export const TEMPLATES: Record<ScriptTemplateType, ScriptTemplate> = {
  basic: BASIC_TEMPLATE,
  comprehensive: COMPREHENSIVE_TEMPLATE,
  advanced: ADVANCED_TEMPLATE,
};

/**
 * Selects the appropriate template type based on problem difficulty.
 *
 * This provides sensible defaults when the user doesn't specify a template type:
 * - Easy problems → basic template
 * - Medium problems → comprehensive template
 * - Hard problems → advanced template
 *
 * @param problem - The problem to select a template for
 * @returns The recommended template type
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
 * The generator creates teaching scripts by populating templates with problem-specific
 * information. It supports different template types and can optionally include
 * topic-specific hints based on problem tags.
 *
 * @example
 * ```typescript
 * const generator = new TeachingScriptGenerator({
 *   templateType: 'comprehensive',
 *   language: 'typescript',
 *   includeTopicHints: true,
 * });
 *
 * const script = generator.generate(problem);
 * const yaml = generator.generateYaml(problem);
 * ```
 */
export class TeachingScriptGenerator {
  private options: ScriptGeneratorOptions;

  /**
   * Creates a new teaching script generator with the specified options.
   *
   * @param options - Partial generator options. Unspecified options will use defaults:
   *   - templateType: Auto-selected based on problem difficulty
   *   - language: 'typescript'
   *   - includeTopicHints: true
   */
  constructor(options?: Partial<ScriptGeneratorOptions>) {
    this.options = {
      templateType: options?.templateType ?? 'comprehensive',
      language: options?.language ?? 'typescript',
      includeTopicHints: options?.includeTopicHints ?? true,
    };
  }

  /**
   * Generates a teaching script from a problem.
   *
   * This method creates a complete teaching script by:
   * 1. Selecting an appropriate template (if not specified)
   * 2. Populating the template with problem metadata
   * 3. Substituting content variables ({{title}}, {{difficulty}}, etc.)
   * 4. Optionally adding topic-specific hints
   *
   * @param problem - The problem to generate a script for
   * @returns A complete teaching script ready to use
   */
  generate(problem: Problem): TeachingScript {
    // Select template type if not explicitly specified in constructor
    const templateType = this.options.templateType ?? selectTemplateForProblem(problem);
    const template = TEMPLATES[templateType];

    // Create base script with problem metadata
    const script: TeachingScript = {
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      language: this.options.language,
      steps: this.populateSteps(template.steps, problem),
    };

    // Add topic-specific hints if enabled
    if (this.options.includeTopicHints) {
      const topics = this.detectTopics(problem);
      this.addTopicHints(script, topics, problem);
    }

    return script;
  }

  /**
   * Generates a YAML representation of a teaching script.
   *
   * This method generates a script and serializes it to YAML format suitable
   * for saving as a trainer.yaml file.
   *
   * @param problem - The problem to generate a script for
   * @returns YAML string representation of the teaching script
   */
  generateYaml(problem: Problem): string {
    const script = this.generate(problem);
    return this.serializeToYaml(script);
  }

  /**
   * Populates template steps with problem-specific information.
   *
   * This method processes each step in the template to replace variable
   * placeholders with actual problem data.
   *
   * @param steps - Template steps to populate
   * @param problem - Problem to use for populating
   * @returns Populated teaching steps
   */
  private populateSteps(steps: TeachingStep[], problem: Problem): TeachingStep[] {
    return steps.map((step) => ({
      ...step,
      content: this.substituteVariables(step.content, problem),
    }));
  }

  /**
   * Substitutes variable placeholders in content with actual values.
   *
   * Supported variables:
   * - {{title}} - Problem title
   * - {{difficulty}} - Problem difficulty level
   * - {{attempts}} - Placeholder for attempt count (filled at runtime)
   *
   * @param content - Content string with variable placeholders
   * @param problem - Problem to extract values from
   * @returns Content with variables substituted
   */
  private substituteVariables(content: string, problem: Problem): string {
    return content
      .replace(/\{\{title\}\}/g, problem.title)
      .replace(/\{\{difficulty\}\}/g, problem.difficulty);
    // Note: {{attempts}} is left as-is since it's substituted at runtime by the engine
  }

  /**
   * Serializes a teaching script to YAML format.
   *
   * This method converts a TeachingScript object to a well-formatted YAML string
   * suitable for saving as trainer.yaml files. It preserves multiline strings
   * and formats the output for readability.
   *
   * @param script - The teaching script to serialize
   * @returns YAML string representation
   */
  private serializeToYaml(script: TeachingScript): string {
    // Import stringify dynamically to avoid circular dependency issues
    // Note: Using a simple implementation here for now
    // TODO(ATS-011): Replace with @std/yaml when integrated with parser

    const lines: string[] = [];

    // Add metadata
    lines.push(`id: ${script.id}`);
    lines.push(`title: ${script.title}`);
    lines.push(`difficulty: ${script.difficulty}`);
    lines.push(`language: ${script.language}`);

    // Add tags
    if (script.tags.length > 0) {
      lines.push('tags:');
      for (const tag of script.tags) {
        lines.push(`  - ${tag}`);
      }
    } else {
      lines.push('tags: []');
    }

    // Add steps
    lines.push('steps:');
    for (const step of script.steps) {
      lines.push(`  - type: ${step.type}`);

      // Handle multiline content with proper YAML formatting
      if (step.content.includes('\n')) {
        lines.push('    content: |');
        const contentLines = step.content.split('\n');
        for (const line of contentLines) {
          lines.push(`      ${line}`);
        }
      } else {
        lines.push(`    content: ${JSON.stringify(step.content)}`);
      }

      // Add trigger if present
      if (step.trigger) {
        lines.push(`    trigger: ${JSON.stringify(step.trigger)}`);
      }

      // Add keywords if present
      if (step.keywords && step.keywords.length > 0) {
        lines.push('    keywords:');
        for (const keyword of step.keywords) {
          lines.push(`      - ${keyword}`);
        }
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Detects relevant algorithmic topics from problem tags.
   *
   * This method normalizes tags to lowercase and identifies known algorithmic
   * patterns that have specialized teaching hints available.
   *
   * @param problem - The problem to analyze
   * @returns Array of detected topic identifiers
   * @private
   */
  private detectTopics(problem: Problem): string[] {
    const topics: string[] = [];
    const normalizedTags = problem.tags.map((tag) => tag.toLowerCase());

    // Check for each known topic pattern
    if (
      normalizedTags.some((tag) => tag.includes('dynamic-programming') || tag.includes('dp'))
    ) {
      topics.push('dynamic-programming');
    }

    if (
      normalizedTags.some((tag) =>
        tag.includes('tree') || tag.includes('binary-tree') || tag.includes('bst')
      )
    ) {
      topics.push('binary-tree');
    }

    if (normalizedTags.some((tag) => tag.includes('hash'))) {
      topics.push('hash-table');
    }

    if (normalizedTags.some((tag) => tag.includes('two-pointer'))) {
      topics.push('two-pointers');
    }

    if (normalizedTags.some((tag) => tag.includes('binary-search'))) {
      topics.push('binary-search');
    }

    if (normalizedTags.some((tag) => tag.includes('stack') || tag.includes('queue'))) {
      topics.push('stack-queue');
    }

    if (
      normalizedTags.some((tag) =>
        tag.includes('graph') || tag.includes('bfs') || tag.includes('dfs') ||
        tag.includes('breadth-first') || tag.includes('depth-first')
      )
    ) {
      topics.push('graph');
    }

    return topics;
  }

  /**
   * Adds topic-specific teaching hints to the script.
   *
   * This method injects specialized hints based on detected topics. Hints are
   * added as 'hint' type steps with appropriate triggers based on problem
   * difficulty and attempt count.
   *
   * @param script - The teaching script to enhance
   * @param topics - Array of detected topics
   * @param problem - The original problem for context
   * @private
   */
  private addTopicHints(script: TeachingScript, topics: string[], problem: Problem): void {
    // Determine trigger threshold based on difficulty
    const attemptsThreshold = problem.difficulty === 'hard' ? 2 : 3;

    for (const topic of topics) {
      const hints = this.generateTopicHints(topic, problem);
      if (hints.length > 0) {
        // Add hints with triggers based on attempts
        for (const hint of hints) {
          script.steps.push({
            type: 'hint',
            trigger: `!passed && attempts >= ${attemptsThreshold}`,
            content: hint,
          });
        }
      }
    }
  }

  /**
   * Generates hints for a specific topic.
   *
   * @param topic - The topic identifier
   * @param problem - The problem for context
   * @returns Array of hint content strings
   * @private
   */
  private generateTopicHints(topic: string, problem: Problem): string[] {
    switch (topic) {
      case 'dynamic-programming':
        return this.generateDPHints(problem);
      case 'binary-tree':
        return this.generateBinaryTreeHints(problem);
      case 'hash-table':
        return this.generateHashTableHints(problem);
      case 'two-pointers':
        return this.generateTwoPointersHints(problem);
      case 'binary-search':
        return this.generateBinarySearchHints(problem);
      case 'stack-queue':
        return this.generateStackQueueHints(problem);
      case 'graph':
        return this.generateGraphHints(problem);
      default:
        return [];
    }
  }

  /**
   * Generates Dynamic Programming specific hints.
   * @private
   */
  private generateDPHints(problem: Problem): string[] {
    return [
      `**Dynamic Programming Hint**:

Think about this problem in terms of subproblems:
1. **Define the state**: What does dp[i] represent?
2. **Identify the recurrence relation**: How does dp[i] relate to previous states?
3. **Base cases**: What are the simplest cases you can solve directly?
4. **Build up**: Can you solve from bottom-up or use memoization for top-down?

${problem.difficulty === 'hard' ? '**Hard DP problems** often have multiple dimensions or complex state transitions. Start simple!' : 'Start by identifying what information you need to track at each step.'}`,
    ];
  }

  /**
   * Generates Binary Tree specific hints.
   * @private
   */
  private generateBinaryTreeHints(_problem: Problem): string[] {
    return [
      `**Binary Tree Hint**:

Consider these common patterns:
1. **Recursion**: Most tree problems have elegant recursive solutions
   - Base case: What happens at null/leaf nodes?
   - Recursive case: Process left and right subtrees
2. **Traversal type**: Does order matter?
   - Pre-order: Process node, then children
   - In-order: Left, node, right (useful for BSTs)
   - Post-order: Children, then node
   - Level-order: Use a queue for BFS
3. **Helper function**: Often useful to pass additional parameters

Think: Can you solve this by breaking it down into left and right subtree subproblems?`,
    ];
  }

  /**
   * Generates Hash Table specific hints.
   * @private
   */
  private generateHashTableHints(_problem: Problem): string[] {
    return [
      `**Hash Table Hint**:

Hash tables excel at trading space for time:
1. **What to store**: Keys? Values? Both? Counts? Indices?
2. **When to check**: Before adding? After? While iterating?
3. **Common patterns**:
   - Lookup in O(1): Check if element exists
   - Count frequency: Map values to counts
   - Store indices: Map values to positions
   - Complement/pair finding: Check if target - current exists

In ${this.options.language}, use:
${this.options.language === 'typescript' || this.options.language === 'javascript' ? '- Map for key-value pairs\n- Set for unique values' : this.options.language === 'python' ? '- dict for key-value pairs\n- set for unique values' : this.options.language === 'java' ? '- HashMap<K,V> for key-value pairs\n- HashSet<T> for unique values' : '- appropriate hash table data structure'}`,
    ];
  }

  /**
   * Generates Two Pointers specific hints.
   * @private
   */
  private generateTwoPointersHints(_problem: Problem): string[] {
    return [
      `**Two Pointers Hint**:

The two pointers technique is powerful for array/string problems:
1. **Pattern identification**:
   - Sorted array? Consider left/right pointers
   - Sliding window? Consider start/end pointers
   - Fast/slow? For linked lists or cycle detection
2. **Movement strategy**:
   - Both move inward? (opposite ends)
   - Both move forward? (sliding window)
   - One fast, one slow? (cycle detection)
3. **When to move which pointer**:
   - Based on comparison? Move the one that doesn't satisfy condition
   - Based on window size? Move start or end to adjust

Think: How does moving each pointer change your answer?`,
    ];
  }

  /**
   * Generates Binary Search specific hints.
   * @private
   */
  private generateBinarySearchHints(problem: Problem): string[] {
    return [
      `**Binary Search Hint**:

Binary search isn't just for finding elements:
1. **Search space**: What are you searching over? Indices? Values? Answers?
2. **Monotonic property**: What makes one half eliminatable?
3. **Mid calculation**: Use \`left + (right - left) / 2\` to avoid overflow
4. **Boundary handling**:
   - Which condition moves left? Which moves right?
   - Is target at mid? Or in left/right half?
5. **Final check**: After loop, verify left/right position

${problem.difficulty === 'hard' ? '**Hard problems** might require binary search on the answer space rather than indices!' : 'Start with: What makes this problem monotonic?'}`,
    ];
  }

  /**
   * Generates Stack/Queue specific hints.
   * @private
   */
  private generateStackQueueHints(_problem: Problem): string[] {
    return [
      `**Stack/Queue Hint**:

These data structures are perfect for specific patterns:
1. **Stack (LIFO)** - Last In, First Out:
   - Matching/balancing problems (parentheses, tags)
   - Reversing or undoing operations
   - Maintaining monotonic properties
   - Tracking "most recent" states
2. **Queue (FIFO)** - First In, First Out:
   - Level-order traversal
   - BFS in graphs
   - Processing in order received
3. **Key questions**:
   - What do you push/enqueue? When?
   - What triggers a pop/dequeue?
   - Do you need to check top/front before operating?

Think: Does the order of processing matter for your solution?`,
    ];
  }

  /**
   * Generates Graph specific hints.
   * @private
   */
  private generateGraphHints(problem: Problem): string[] {
    return [
      `**Graph Hint**:

Graph problems often come down to traversal strategy:
1. **Representation**:
   - Adjacency list? Adjacency matrix? Edge list?
   - Choose based on density and operations needed
2. **Traversal choice**:
   - **BFS** (queue): Level-by-level, shortest path in unweighted graphs
   - **DFS** (recursion/stack): Explore deeply, backtracking, cycle detection
3. **State tracking**:
   - Visited set: Prevent revisiting nodes
   - Distance array: Track path lengths
   - Parent map: Reconstruct paths
4. **Edge cases**:
   - Disconnected components?
   - Cycles (directed/undirected)?
   - Self-loops?

${problem.difficulty === 'hard' ? '**Complex graphs** might need advanced algorithms like Dijkstra, Topological Sort, or Union-Find!' : 'Start by choosing BFS or DFS based on what you need to find.'}`,
    ];
  }
}
