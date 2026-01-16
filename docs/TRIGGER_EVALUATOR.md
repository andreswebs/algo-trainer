# AI Teaching System - Trigger Expression Evaluator

This document provides comprehensive documentation for the trigger expression evaluator component of the AI Teaching System.

## Overview

The trigger expression evaluator provides a secure way to evaluate JavaScript-like expressions from teaching scripts to determine when guidance should be shown to users. It safely evaluates expressions without using `eval()` or the `Function()` constructor.

## Security

The evaluator uses a sandboxed approach to prevent arbitrary code execution:

- **No `eval()`** - Expressions are parsed and evaluated in a controlled environment
- **No `Function()` constructor** - All operations are whitelisted
- **Sandboxed context** - Only allowed variables and operations are accessible
- **Fail-safe design** - Invalid expressions return `false` instead of throwing errors

## Usage

### Basic Example

```typescript
import { evaluateTrigger } from './core/ai/mod.ts';
import type { TriggerContext } from './core/ai/mod.ts';

const context: TriggerContext = {
  code: 'function twoSum() { for (let i = 0; i < n; i++) {} }',
  stdout: '',
  stderr: '',
  passed: false,
  attempts: 3
};

// Simple comparisons
evaluateTrigger('attempts > 2', context); // true
evaluateTrigger('passed === true', context); // false

// String methods
evaluateTrigger('code.includes("for")', context); // true
evaluateTrigger('stderr.match(/TypeError/)', context); // false

// Complex conditions
evaluateTrigger('passed === false && attempts > 1', context); // true
evaluateTrigger('code.includes("for") && !code.includes("Map")', context); // true
```

## Supported Operations

### Comparisons

- `===` - Strict equality
- `!==` - Strict inequality
- `>`, `<`, `>=`, `<=` - Numeric comparisons

### Logical Operators

- `&&` - Logical AND
- `||` - Logical OR
- `!` - Logical NOT

### String Methods

- `includes(substring)` - Check if string contains substring
- `startsWith(prefix)` - Check if string starts with prefix
- `endsWith(suffix)` - Check if string ends with suffix
- `match(pattern)` - Match against string or regex pattern

### Property Access

- `.length` - Get string length

## Context Variables

The following variables are available in trigger expressions:

- **code** (string) - User's current code
- **stdout** (string) - Execution output
- **stderr** (string) - Execution errors
- **passed** (boolean) - Test result
- **attempts** (number) - Attempt count

## Error Handling

The evaluator is designed to fail safely:

- Invalid expressions return `false`
- Malformed triggers log warnings
- Unknown variables return `false`
- Security violations return `false`

This ensures that a malformed trigger will never crash the application or expose security vulnerabilities.

## Performance

Trigger evaluation is optimized for speed:

- **Target**: < 1ms per evaluation
- **Actual**: ~0.007ms average
- **No external dependencies**
- **Minimal memory allocation**

## Example Triggers

### Show hint after multiple failed attempts

```yaml
trigger: passed === false && attempts > 2
```

### Detect specific code patterns

```yaml
trigger: code.includes('for') && !code.includes('Map')
```

### Check for common errors

```yaml
trigger: stderr.match(/TypeError|undefined/)
```

### Encourage optimization

```yaml
trigger: passed === true && code.length > 100
```

### Detect missing patterns

```yaml
trigger: code.includes('Map') && !code.includes('has')
```

## Implementation Details

The trigger evaluator is implemented in `src/core/ai/triggers.ts` and uses a custom expression parser that:

1. Tokenizes the input expression
2. Parses tokens into an abstract syntax tree (AST)
3. Evaluates the AST with the provided context
4. Returns a boolean result

This approach provides security by explicitly controlling what operations and variables are available during evaluation.

## API Reference

### `evaluateTrigger(trigger: string, context: TriggerContext): boolean`

Evaluates a trigger expression against a given context.

**Parameters:**
- `trigger` - The trigger expression string to evaluate
- `context` - The context object containing variables for evaluation

**Returns:**
- `true` if the trigger condition is met
- `false` if the trigger condition is not met or if evaluation fails

**Example:**
```typescript
const result = evaluateTrigger('attempts > 2', {
  code: 'function solve() {}',
  stdout: '',
  stderr: '',
  passed: false,
  attempts: 3
});
// result === true
```

### `TriggerContext` Interface

```typescript
interface TriggerContext {
  code: string;      // User's current code
  stdout: string;    // Execution output
  stderr: string;    // Execution errors
  passed: boolean;   // Test result
  attempts: number;  // Attempt count
}
```

## Best Practices

1. **Keep triggers simple** - Complex logic should be in the teaching script generator, not in triggers
2. **Test your triggers** - Use the test suite to verify trigger behavior
3. **Be specific** - More specific triggers provide better user experience
4. **Consider edge cases** - Think about what happens with empty strings, zero attempts, etc.
5. **Use appropriate operators** - Use `===` for equality, not `==`

## See Also

- [AI Teaching System Overview](../src/core/ai/mod.ts)
- [Teaching Script DSL Specification](../.specs/deno-rewrite/ai-teaching-system/tasks.md)
- [Validator Documentation](../src/core/ai/validator.ts)
