/**
 * AI Teaching System
 *
 * Re-exports all public APIs for the AI teaching system.
 *
 * ## Overview
 *
 * A teaching script (trainer.yaml) holds problem-specific guidance: an
 * introduction and pre-coding advice that `challenge` shows when a problem starts.
 * Scripts are looked up in the workspace problem directory, then in the user's
 * data directory, then among the built-in scripts.
 *
 * ## Quick Start
 *
 * ```ts
 * import { TeachingEngine } from './core/ai/mod.ts';
 *
 * const engine = new TeachingEngine('two-sum');
 * const loaded = await engine.loadScript('./problems/two-sum');
 * if (loaded) {
 *   console.log(engine.getIntroduction());
 *   console.log(engine.getPrePrompt());
 * }
 * ```
 *
 * ### Loading and Validating Scripts
 *
 * ```ts
 * import { loadAndValidateScript, validateTeachingScript } from './core/ai/mod.ts';
 *
 * const script = await loadAndValidateScript('./problems/two-sum/trainer.yaml');
 *
 * const result = validateTeachingScript(parsedYaml);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * for (const warning of result.warnings) {
 *   console.warn(warning);
 * }
 * ```
 *
 * ### Generating Scripts
 *
 * ```ts
 * import { TeachingScriptGenerator } from './core/ai/mod.ts';
 *
 * const generator = new TeachingScriptGenerator();
 * const yaml = generator.generateYaml(problem);
 * ```
 *
 * ## Key Exports
 *
 * ### Classes
 * - **TeachingEngine** - Loads a problem's teaching script and provides its guidance
 * - **TeachingScriptGenerator** - Generate teaching scripts from problem metadata
 *
 * ### Functions
 * - **loadAndValidateScript** - Load and validate teaching script from file
 * - **loadTeachingScript** - Load teaching script without validation
 * - **parseTeachingScript** - Parse YAML content into TeachingScript
 * - **validateTeachingScript** - Validate teaching script, with warnings for retired features
 * - **isValidTeachingScript** - Type guard for TeachingScript validation
 * - **findScriptPath** - Find trainer.yaml in problem directory
 * - **findTeachingScript** - Find teaching script by problem slug (searches user custom and built-in)
 *
 * ### Types
 * - **TeachingStepType** - Types of teaching steps
 * - **TeachingStep** - Individual teaching step definition
 * - **TeachingScript** - Complete teaching script
 * - **ScriptInfo** - Script metadata
 * - **ScriptTemplateType** - Template types for script generation
 * - **ScriptGeneratorOptions** - Configuration options for script generator
 * - **ScriptTemplate** - Template structure for teaching scripts
 *
 * @module core/ai
 */

export type { ScriptInfo } from './engine.ts';
// Core engine
export { TeachingEngine } from './engine.ts';
export type { ScriptGeneratorOptions, ScriptTemplate, ScriptTemplateType } from './generator.ts';
// Generator
export { TeachingScriptGenerator } from './generator.ts';
// Parser and validator
export {
  findScriptPath,
  findTeachingScript,
  loadAndValidateScript,
  loadTeachingScript,
  parseTeachingScript,
} from './parser.ts';
// Types
export * from './types.ts';
export type { TeachingScriptValidationResult } from './validator.ts';
export { isValidTeachingScript, validateTeachingScript } from './validator.ts';
