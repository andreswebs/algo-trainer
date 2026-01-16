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
import type { TeachingStep } from './types.ts';

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
  description: 'Comprehensive guidance with strategy frameworks, pattern recognition, and optimization hints',
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
      content: `{{attempts}} attempts in - you're making progress! This is a {{difficulty}} problem, so persistence is key.

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
      content: `Still working on this? That shows great persistence! Hard problems require multiple attempts.

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
