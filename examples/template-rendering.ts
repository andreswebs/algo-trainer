/**
 * Example demonstrating template rendering functionality
 *
 * This script shows how to use the template renderer to generate
 * problem-specific code files from templates.
 *
 * Usage:
 *   deno run --allow-read examples/template-rendering.ts
 */

import {
  renderAllTemplates,
  renderTemplate,
  type TemplateContext,
} from '../src/core/problem/templates.ts';
import type { Problem } from '../src/types/global.ts';

// Example problem data
const exampleProblem: Problem = {
  id: 'example-001',
  slug: 'two-sum',
  title: 'Two Sum',
  difficulty: 'easy',
  description:
    `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      output: [0, 1],
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      output: [1, 2],
    },
    {
      input: { nums: [3, 3], target: 6 },
      output: [0, 1],
    },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    'Only one valid answer exists.',
  ],
  hints: [
    "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations.",
    'So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?',
    'The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?',
  ],
  tags: ['array', 'hash-table'],
  companies: ['Amazon', 'Google', 'Microsoft', 'Apple', 'Facebook'],
  leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
};

async function demonstrateRendering() {
  console.log('='.repeat(80));
  console.log('Template Rendering Example');
  console.log('='.repeat(80));
  console.log();

  // Example 1: Render TypeScript minimal template
  console.log('1. Rendering TypeScript minimal template...');
  console.log('-'.repeat(80));

  const tsMinimalContext: TemplateContext = {
    problem: exampleProblem,
    config: {
      language: 'typescript',
      style: 'minimal',
      includeImports: true,
      includeTypes: true,
      includeExample: false,
    },
  };

  try {
    const solution = await renderTemplate(tsMinimalContext, 'solution');
    console.log('Solution template:');
    console.log(solution);
    console.log();
  } catch (error) {
    console.error('Error rendering TypeScript minimal solution:', error);
  }

  // Example 2: Render Python comprehensive template
  console.log('2. Rendering Python comprehensive template...');
  console.log('-'.repeat(80));

  const pythonContext: TemplateContext = {
    problem: exampleProblem,
    config: {
      language: 'python',
      style: 'comprehensive',
      includeImports: true,
      includeTypes: true,
      includeExample: true,
    },
  };

  try {
    const readme = await renderTemplate(pythonContext, 'readme');
    console.log('README template:');
    console.log(readme);
    console.log();
  } catch (error) {
    console.error('Error rendering Python comprehensive readme:', error);
  }

  // Example 3: Render all templates at once
  console.log('3. Rendering all templates (solution, test, readme)...');
  console.log('-'.repeat(80));

  try {
    const { solution, test, readme } = await renderAllTemplates(tsMinimalContext);

    console.log('Generated files:');
    console.log(`- Solution: ${solution.split('\n').length} lines`);
    console.log(`- Test: ${test.split('\n').length} lines`);
    console.log(`- README: ${readme.split('\n').length} lines`);
    console.log();
  } catch (error) {
    console.error('Error rendering all templates:', error);
  }

  // Example 4: Using custom placeholders
  console.log('4. Using custom placeholders...');
  console.log('-'.repeat(80));

  const customContext: TemplateContext = {
    problem: exampleProblem,
    config: {
      language: 'typescript',
      style: 'documented',
      includeImports: true,
      includeTypes: true,
      includeExample: true,
    },
    customPlaceholders: {
      DATE: '2025-01-14',
    },
  };

  try {
    const solution = await renderTemplate(customContext, 'solution');
    // Check if custom date is in output
    if (solution.includes('2025-01-14')) {
      console.log('✓ Custom placeholder successfully applied');
    }
    console.log();
  } catch (error) {
    console.error('Error with custom placeholders:', error);
  }

  console.log('='.repeat(80));
  console.log('Template rendering examples complete!');
  console.log('='.repeat(80));
}

// Run the demonstration
if (import.meta.main) {
  await demonstrateRendering();
}
