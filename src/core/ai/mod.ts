/**
 * AI Teaching System
 *
 * Re-exports all public APIs for the AI teaching system.
 *
 * ## Overview
 *
 * The AI Teaching System provides intelligent, proactive coaching for users solving
 * algorithmic problems. It uses a YAML-based DSL (trainer.yaml) to define teaching
 * scripts that respond to user code, execution results, and progress patterns.
 *
 * ## Key Capabilities
 *
 * - **Proactive guidance**: Provides contextual hints without explicit requests
 * - **Code analysis**: Analyzes user code patterns to provide relevant feedback
 * - **Execution feedback**: Interprets stdout, stderr, and test results
 * - **Progressive hints**: Escalates guidance based on attempts and struggle patterns
 * - **Script generation**: Auto-generates teaching scripts from problem metadata
 *
 * ## Quick Start
 *
 * ### Basic Usage with TeachingEngine
 *
 * ```ts
 * import { TeachingEngine, TeachingSession } from './core/ai/mod.ts';
 *
 * // Create session and engine
 * const session = new TeachingSession('two-sum');
 * const engine = new TeachingEngine(session);
 *
 * // Load teaching script
 * const loaded = await engine.loadScript('./problems/two-sum');
 * if (loaded) {
 *   // Get introduction
 *   const intro = engine.getIntroduction();
 *   console.log(intro);
 *
 *   // Get pre-coding guidance
 *   const prePrompt = engine.getPrePrompt();
 *   console.log(prePrompt);
 *
 *   // Record attempt and process execution
 *   session.recordAttempt(userCode);
 *   const feedback = engine.processExecution(userCode, executionResult);
 *   if (feedback) {
 *     console.log('Feedback:', feedback);
 *   }
 *
 *   // Get contextual hint
 *   const hint = engine.getHint(userCode);
 *   if (hint) {
 *     console.log('Hint:', hint);
 *   }
 *
 *   // Handle explicit request
 *   const help = engine.handleRequest('how to optimize?');
 *   if (help) {
 *     console.log(help);
 *   }
 * }
 * ```
 *
 * ### Using Trigger Evaluator
 *
 * The trigger evaluator provides secure evaluation of JavaScript-like expressions
 * to determine when guidance should be shown. For comprehensive documentation on
 * supported operations, security features, and examples, see:
 * [Trigger Evaluator Documentation](../../../docs/TRIGGER_EVALUATOR.md)
 *
 * ```ts
 * import { evaluateTrigger } from './core/ai/mod.ts';
 * import type { TriggerContext } from './core/ai/mod.ts';
 *
 * const context: TriggerContext = {
 *   code: 'function twoSum() { for (let i = 0; i < n; i++) {} }',
 *   stdout: '',
 *   stderr: '',
 *   passed: false,
 *   attempts: 3
 * };
 *
 * evaluateTrigger('attempts > 2', context); // true
 * evaluateTrigger('code.includes("for")', context); // true
 * ```
 *
 * ### Loading and Validating Scripts
 *
 * ```ts
 * import { loadAndValidateScript, validateTeachingScript } from './core/ai/mod.ts';
 *
 * // Load from file
 * const script = await loadAndValidateScript('./problems/two-sum/trainer.yaml');
 *
 * // Validate existing script
 * const result = validateTeachingScript(script);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 *
 * ### Generating Scripts
 *
 * ```ts
 * import { TeachingScriptGenerator } from './core/ai/mod.ts';
 *
 * const generator = new TeachingScriptGenerator();
 * const script = generator.generate(problem);
 * const yaml = generator.generateYaml(problem);
 * ```
 *
 * ## Key Exports
 *
 * ### Classes
 * - **TeachingEngine** - Main engine for orchestrating teaching system
 * - **TeachingSession** - Session state management
 * - **TeachingScriptGenerator** - Generate teaching scripts from problem metadata
 *
 * ### Functions
 * - **evaluateTrigger** - Evaluate trigger expressions
 * - **loadAndValidateScript** - Load and validate teaching script from file
 * - **loadTeachingScript** - Load teaching script without validation
 * - **parseTeachingScript** - Parse YAML content into TeachingScript
 * - **validateTeachingScript** - Validate teaching script
 * - **findScriptPath** - Find trainer.yaml in problem directory
 *
 * ### Types
 * - **TriggerContext** - Context variables available for evaluation
 * - **TeachingStepType** - Types of teaching steps
 * - **TeachingStep** - Individual teaching step definition
 * - **TeachingScript** - Complete teaching script
 * - **TeachingSessionState** - User session state
 * - **ExecutionResult** - Code execution results
 * - **TestResult** - Individual test case results
 * - **ScriptInfo** - Script metadata
 *
 * @module core/ai
 */

// Core engine
export { TeachingEngine } from './engine.ts';
export type { ScriptInfo } from './engine.ts';

// Session management
export { TeachingSession } from './session.ts';

// Parser and validator
export {
  findScriptPath,
  loadAndValidateScript,
  loadTeachingScript,
  parseTeachingScript,
} from './parser.ts';
export { validateTeachingScript } from './validator.ts';

// Trigger evaluator
export { evaluateTrigger } from './triggers.ts';

// Generator
export { TeachingScriptGenerator } from './generator.ts';

// Types
export * from './types.ts';
