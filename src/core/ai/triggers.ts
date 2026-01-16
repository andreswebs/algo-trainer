/**
 * Trigger Expression Evaluator
 *
 * Safely evaluates trigger expressions from teaching scripts to determine
 * when guidance should be shown. Uses a sandboxed approach without eval()
 * or Function() constructor to prevent arbitrary code execution.
 *
 * Supported operations:
 * - Comparisons: ===, !==, >, <, >=, <=
 * - Logical: &&, ||, !
 * - String methods: includes(), match(), startsWith(), endsWith()
 * - Property access: .length
 *
 * Context variables:
 * - code: string (user's current code)
 * - stdout: string (execution output)
 * - stderr: string (execution errors)
 * - passed: boolean (test result)
 * - attempts: number (attempt count)
 *
 * @module core/ai/triggers
 */

import type { TriggerContext } from './types.ts';
import { TriggerError } from '../../utils/errors.ts';

/**
 * Evaluate a trigger expression against a context.
 *
 * Returns true if the trigger condition is met, false otherwise.
 * Invalid expressions fail safely and return false with a warning.
 *
 * @param trigger - The trigger expression to evaluate
 * @param context - The context containing variables for evaluation
 * @returns true if the trigger condition is met, false otherwise
 *
 * @example
 * ```typescript
 * const context = {
 *   code: 'function twoSum() { for (let i = 0; i < n; i++) {} }',
 *   stdout: '',
 *   stderr: '',
 *   passed: false,
 *   attempts: 3
 * };
 *
 * evaluateTrigger('attempts > 2', context); // true
 * evaluateTrigger('code.includes("for")', context); // true
 * evaluateTrigger('passed === false && attempts > 1', context); // true
 * ```
 */
export function evaluateTrigger(
  trigger: string,
  context: TriggerContext,
): boolean {
  try {
    // Validate input
    if (!trigger || typeof trigger !== 'string') {
      console.warn('[triggers] Invalid trigger expression (not a string)');
      return false;
    }

    // Normalize whitespace
    const normalized = trigger.trim();
    if (normalized === '') {
      console.warn('[triggers] Empty trigger expression');
      return false;
    }

    // Evaluate the expression
    return evaluateExpression(normalized, context);
  } catch (error) {
    // Fail safely - log warning and return false
    console.warn(
      `[triggers] Failed to evaluate trigger "${trigger}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

/**
 * Internal expression evaluator
 */
function evaluateExpression(expr: string, context: TriggerContext): boolean {
  // Handle logical OR (lowest precedence)
  if (expr.includes('||')) {
    const parts = splitByOperator(expr, '||');
    return parts.some((part) => evaluateExpression(part.trim(), context));
  }

  // Handle logical AND
  if (expr.includes('&&')) {
    const parts = splitByOperator(expr, '&&');
    return parts.every((part) => evaluateExpression(part.trim(), context));
  }

  // Handle logical NOT
  if (expr.startsWith('!')) {
    const inner = expr.slice(1).trim();
    // Handle !variable or !expression
    if (inner.includes('(') || inner.includes('.')) {
      return !evaluateExpression(inner, context);
    }
    // Handle !variable directly
    return !evaluateValue(inner, context);
  }

  // Handle comparison operators
  for (const op of ['===', '!==', '>=', '<=', '>', '<']) {
    if (expr.includes(op)) {
      const parts = expr.split(op);
      if (parts.length === 2) {
        const left = evaluateValue(parts[0].trim(), context);
        const right = evaluateValue(parts[1].trim(), context);
        return compareValues(left, right, op);
      }
    }
  }

  // If no operators, evaluate as a single value (truthy check)
  return Boolean(evaluateValue(expr, context));
}

/**
 * Split expression by operator, respecting parentheses and quotes
 */
function splitByOperator(expr: string, operator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // Handle string boundaries
    if ((char === '"' || char === "'") && (i === 0 || expr[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    // Handle parentheses depth
    if (!inString) {
      if (char === '(') depth++;
      if (char === ')') depth--;
    }

    // Check for operator at depth 0 and outside strings
    if (
      !inString && depth === 0 &&
      char === operator[0] &&
      expr.slice(i, i + operator.length) === operator
    ) {
      parts.push(current);
      current = '';
      i += operator.length - 1; // Skip operator chars
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

/**
 * Evaluate a value expression (variable, literal, or method call)
 */
function evaluateValue(
  expr: string,
  context: TriggerContext,
): string | number | boolean {
  // Handle literals
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null' || expr === 'undefined') return false;

  // Handle numeric literals
  const num = Number(expr);
  if (!isNaN(num) && expr.match(/^-?\d+(\.\d+)?$/)) {
    return num;
  }

  // Handle string literals
  if (
    (expr.startsWith('"') && expr.endsWith('"')) ||
    (expr.startsWith("'") && expr.endsWith("'"))
  ) {
    return expr.slice(1, -1);
  }

  // Handle method calls (e.g., code.includes('for'))
  if (expr.includes('.')) {
    return evaluateMethodCall(expr, context);
  }

  // Handle context variables
  if (expr in context) {
    return context[expr as keyof TriggerContext];
  }

  // Unknown variable - throw error
  throw new TriggerError(`Unknown variable: ${expr}`);
}

/**
 * Evaluate a method call expression
 */
function evaluateMethodCall(
  expr: string,
  context: TriggerContext,
): string | number | boolean {
  // Parse variable.method(args) or variable.property
  const dotIndex = expr.indexOf('.');
  if (dotIndex === -1) {
    throw new TriggerError(`Invalid method call: ${expr}`);
  }

  const varName = expr.slice(0, dotIndex);
  const rest = expr.slice(dotIndex + 1);

  // Get the variable value
  if (!(varName in context)) {
    throw new TriggerError(`Unknown variable: ${varName}`);
  }
  const value = context[varName as keyof TriggerContext];

  // Check if it's a property access (e.g., code.length)
  if (!rest.includes('(')) {
    if (rest === 'length' && typeof value === 'string') {
      return value.length;
    }
    throw new TriggerError(`Unknown property: ${rest}`);
  }

  // Parse method call
  const parenIndex = rest.indexOf('(');
  const methodName = rest.slice(0, parenIndex);
  const argsStr = rest.slice(parenIndex + 1, rest.lastIndexOf(')'));

  // Parse arguments
  const args = parseArguments(argsStr);

  // Execute allowed string methods
  if (typeof value === 'string') {
    return executeStringMethod(value, methodName, args);
  }

  throw new TriggerError(`Cannot call method ${methodName} on ${typeof value}`);
}

/**
 * Parse method arguments from string
 */
function parseArguments(argsStr: string): (string | RegExp)[] {
  if (!argsStr.trim()) return [];

  const args: (string | RegExp)[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let inRegex = false;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];

    // Handle string boundaries
    if ((char === '"' || char === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
      if (!inString && !inRegex) {
        // Start of string - skip the quote
        inString = true;
        stringChar = char;
        continue;
      } else if (inString && char === stringChar) {
        // End of string - add the argument and skip the quote
        inString = false;
        args.push(current);
        current = '';
        stringChar = '';
        continue;
      }
    }

    // Handle regex boundaries
    if (char === '/' && !inString) {
      if (!inRegex) {
        inRegex = true;
        continue;
      } else {
        // End of regex - parse flags if any
        let flags = '';
        let j = i + 1;
        while (j < argsStr.length && /[gimsuvy]/.test(argsStr[j])) {
          flags += argsStr[j];
          j++;
        }
        try {
          args.push(new RegExp(current, flags));
        } catch {
          throw new TriggerError(`Invalid regex: /${current}/${flags}`);
        }
        current = '';
        inRegex = false;
        i = j - 1;
        continue;
      }
    }

    // Handle commas (argument separators)
    if (char === ',' && !inString && !inRegex) {
      if (current.trim()) {
        throw new TriggerError(`Unexpected argument format: ${current}`);
      }
      continue;
    }

    // Skip whitespace outside strings and regexes
    if (!inString && !inRegex && /\s/.test(char)) {
      continue;
    }

    if (inString || inRegex) {
      current += char;
    }
  }

  return args;
}

/**
 * Execute a string method with given arguments
 */
function executeStringMethod(
  value: string,
  method: string,
  args: (string | RegExp)[],
): boolean | string | number {
  switch (method) {
    case 'includes':
      if (args.length !== 1 || typeof args[0] !== 'string') {
        throw new TriggerError('includes() requires exactly one string argument');
      }
      return value.includes(args[0]);

    case 'startsWith':
      if (args.length !== 1 || typeof args[0] !== 'string') {
        throw new TriggerError(
          'startsWith() requires exactly one string argument',
        );
      }
      return value.startsWith(args[0]);

    case 'endsWith':
      if (args.length !== 1 || typeof args[0] !== 'string') {
        throw new TriggerError('endsWith() requires exactly one string argument');
      }
      return value.endsWith(args[0]);

    case 'match':
      if (args.length !== 1) {
        throw new TriggerError('match() requires exactly one argument');
      }
      if (typeof args[0] === 'string') {
        // String argument - do simple includes check
        return value.includes(args[0]);
      }
      if (args[0] instanceof RegExp) {
        // Regex argument - test the pattern
        return args[0].test(value);
      }
      throw new TriggerError('match() requires a string or regex argument');

    default:
      throw new TriggerError(`Unsupported method: ${method}`);
  }
}

/**
 * Compare two values using the given operator
 */
function compareValues(
  left: string | number | boolean,
  right: string | number | boolean,
  operator: string,
): boolean {
  switch (operator) {
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    default:
      throw new TriggerError(`Unknown operator: ${operator}`);
  }
}
