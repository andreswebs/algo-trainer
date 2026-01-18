# PHASE5-010: Output Consistency Audit - Implementation Tasks

## Overview

This document defines all subtasks necessary to consolidate CLI output to use a centralized `Logger` class from `src/utils/output.ts`. The goal is to ensure:

1. **All human-readable output goes to stderr** (logs, errors, warnings, info, progress, formatted displays)
2. **Only machine-readable data goes to stdout** (JSON, raw data for piping)
3. **All output uses the `logger` singleton** (no direct `console.*` calls, no standalone `log*()` functions)
4. **The `Logger` class provides a unified interface** with the same functionality as the current `log*()` functions

---

## Architectural Changes

### PHASE5-010-001: Create Logger Class

**File:** `src/utils/output.ts`
**Priority:** Critical (blocking dependency for other tasks)

Create a comprehensive `Logger` class that consolidates ALL human-readable output functionality. This replaces both direct `console.*` calls AND the standalone `log*()` functions.

```typescript
/**
 * Logger class - unified interface for all human-readable output
 *
 * All methods write to stderr. Respects verbosity and color settings.
 * This is the ONLY interface for human-readable output (besides outputData for stdout).
 */
export class Logger {
  // ─────────────────────────────────────────────────────────────
  // Core logging methods (replace standalone log*() functions)
  // ─────────────────────────────────────────────────────────────

  /**
   * Log success message with green color and checkmark
   * @example logger.success('Configuration saved')
   * Output: ✅ Configuration saved
   */
  success(message: string): void;

  /**
   * Log error message with red color
   * @example logger.error('Failed to load', 'File not found')
   * Output: ❌ Failed to load
   *            File not found
   */
  error(message: string, details?: string): void;

  /**
   * Log error object with formatted message and optional stack trace (verbose mode)
   * Handles both AlgoTrainerError and standard Error types
   * @example logger.errorObject(new ConfigError('Invalid value'))
   */
  errorObject(error: unknown): void;

  /**
   * Log warning message with yellow color
   * @example logger.warn('Deprecated option used')
   * Output: ⚠️  Deprecated option used
   */
  warn(message: string): void;

  /**
   * Log info message with cyan color (suppressed in quiet mode)
   * @example logger.info('Loading configuration...')
   * Output: ℹ️  Loading configuration...
   */
  info(message: string): void;

  /**
   * Log debug message with dim color (only in verbose mode)
   * @example logger.debug('Cache hit for key: abc123')
   * Output: 🐛 Cache hit for key: abc123
   */
  debug(message: string): void;

  /**
   * Log progress message with blue color (suppressed in quiet mode)
   * @example logger.progress('Generating templates...')
   * Output: 🔄 Generating templates...
   */
  progress(message: string): void;

  // ─────────────────────────────────────────────────────────────
  // Plain output methods (console-like interface)
  // ─────────────────────────────────────────────────────────────

  /**
   * Log plain message to stderr (no prefix, no special formatting)
   * Use for general human-readable output that doesn't fit other categories
   * @example logger.log('Problem: Two Sum [MEDIUM]')
   */
  log(message: string): void;
  log(...args: unknown[]): void;

  /**
   * Print empty line to stderr
   * @example logger.newline()
   */
  newline(): void;

  // ─────────────────────────────────────────────────────────────
  // Display formatting methods (replace hardcoded formatting)
  // ─────────────────────────────────────────────────────────────

  /**
   * Output formatted key-value pair
   * @example logger.keyValue('language', 'typescript', 18)
   * Output:   language:         typescript
   */
  keyValue(key: string, value: unknown, keyWidth?: number): void;

  /**
   * Output section header
   * @example logger.section('Preferences')
   * Output:   Preferences:
   */
  section(title: string, indent?: number): void;

  /**
   * Output horizontal separator line
   * @example logger.separator(50)
   * Output: ──────────────────────────────────────────────────
   */
  separator(width?: number, char?: string): void;

  /**
   * Output titled box with content
   * @example logger.box('Teaching Guide', introContent)
   */
  box(title: string, content: string): void;

  /**
   * Output formatted table
   * @example logger.table(data, { columns: [...] })
   */
  table(data: Record<string, unknown>[], config: TableConfig): void;

  // ─────────────────────────────────────────────────────────────
  // Grouping methods (for indented sections)
  // ─────────────────────────────────────────────────────────────

  /**
   * Start an indented group
   * @example logger.group('Validation Results')
   */
  group(label?: string): void;

  /**
   * End current group
   */
  groupEnd(): void;
}

/** Global logger instance - the single interface for all human output */
export const logger: Logger;

/**
 * Output machine-readable data to stdout
 * This is the ONLY function that writes to stdout
 */
export function outputData(data: string | object): void;
```

**Implementation Details:**

The Logger class encapsulates all functionality from the current standalone functions:

| Current Function | Logger Method | Behavior |
|-----------------|---------------|----------|
| `logSuccess(msg)` | `logger.success(msg)` | Green + ✅ prefix |
| `logError(msg, details?)` | `logger.error(msg, details?)` | Red + ❌ prefix |
| `logErrorObject(error)` | `logger.errorObject(error)` | Formatted error + stack in verbose |
| `logWarning(msg)` | `logger.warn(msg)` | Yellow + ⚠️ prefix |
| `logInfo(msg)` | `logger.info(msg)` | Cyan + ℹ️ prefix, quiet-aware |
| `logDebug(msg)` | `logger.debug(msg)` | Dim + 🐛 prefix, verbose-only |
| `logProgress(msg)` | `logger.progress(msg)` | Blue + 🔄 prefix, quiet-aware |
| `exitWithError(msg)` | `logger.error(msg)` + `Deno.exit()` | Keep as standalone or add method |
| N/A (new) | `logger.log(msg)` | Plain output to stderr |
| N/A (new) | `logger.newline()` | Empty line to stderr |
| N/A (new) | `logger.keyValue(k,v,w)` | Formatted key-value |
| N/A (new) | `logger.section(title)` | Section header |
| N/A (new) | `logger.separator(w)` | Horizontal line |
| N/A (new) | `logger.box(t,c)` | Titled content box |
| N/A (new) | `logger.table(d,c)` | Formatted table |

**Subtasks:**

- [ ] PHASE5-010-001a: Define `Logger` class with all method signatures
- [ ] PHASE5-010-001b: Implement core logging methods (`success`, `error`, `errorObject`, `warn`, `info`, `debug`, `progress`)
- [ ] PHASE5-010-001c: Implement plain output methods (`log`, `newline`)
- [ ] PHASE5-010-001d: Implement display formatting methods (`keyValue`, `section`, `separator`, `box`, `table`)
- [ ] PHASE5-010-001e: Implement grouping methods (`group`, `groupEnd`)
- [ ] PHASE5-010-001f: Create and export singleton `logger` instance
- [ ] PHASE5-010-001g: Mark standalone `log*()` functions as `@deprecated` (keep for backward compatibility during migration)
- [ ] PHASE5-010-001h: Add comprehensive unit tests for Logger class

---

### PHASE5-010-002: Deprecate Standalone Functions

**File:** `src/utils/output.ts`
**Priority:** High

Mark all standalone `log*()` functions as deprecated and update them to delegate to the Logger instance.

```typescript
/**
 * @deprecated Use `logger.success()` instead
 */
export function logSuccess(message: string): void {
  logger.success(message);
}

/**
 * @deprecated Use `logger.error()` instead
 */
export function logError(message: string, details?: string): void {
  logger.error(message, details);
}

// ... etc for all log*() functions
```

**Subtasks:**

- [ ] PHASE5-010-002a: Add `@deprecated` JSDoc to all standalone `log*()` functions
- [ ] PHASE5-010-002b: Update function bodies to delegate to `logger.*` methods
- [ ] PHASE5-010-002c: Keep `outputData()` as the only non-deprecated standalone function
- [ ] PHASE5-010-002d: Keep `exitWithError()` and `exitWithErrorObject()` as standalone (they call `Deno.exit()`)

---

### PHASE5-010-003: Update Exit Functions

**File:** `src/utils/output.ts`
**Priority:** Medium

Update exit functions to use the logger internally.

```typescript
/**
 * Exit with error message
 */
export function exitWithError(message: string, code = 1): never {
  logger.error(message);
  Deno.exit(code);
}

/**
 * Exit with error object
 */
export function exitWithErrorObject(error: unknown, code = 1): never {
  logger.errorObject(error);
  Deno.exit(code);
}
```

**Subtasks:**

- [ ] PHASE5-010-003a: Update `exitWithError()` to use `logger.error()`
- [ ] PHASE5-010-003b: Update `exitWithErrorObject()` to use `logger.errorObject()`

---

## File-by-File Migration Tasks

All migrations now use `logger.*` methods instead of standalone `log*()` functions.

### PHASE5-010-010: Update `src/main.ts`

**Lines:** 9
**Issue:** Direct `console.error(error)`

**Before:**
```typescript
console.error(error);
```

**After:**
```typescript
import { logger } from './utils/output.ts';
// ...
logger.errorObject(error);
```

**Subtasks:**

- [ ] PHASE5-010-010a: Add import for `logger`
- [ ] PHASE5-010-010b: Replace `console.error(error)` with `logger.errorObject(error)`

---

### PHASE5-010-011: Update `src/cli/env.ts`

**Lines:** 144, 154, 166
**Issue:** Direct `console.warn()` calls

**Before:**
```typescript
console.warn(`[env] ...`);
```

**After:**
```typescript
import { logger } from '../utils/output.ts';
// ...
logger.warn('[env] ...');
```

**Subtasks:**

- [ ] PHASE5-010-011a: Add import for `logger`
- [ ] PHASE5-010-011b: Replace all three `console.warn()` calls with `logger.warn()`

---

### PHASE5-010-012: Update `src/cli/commands/list.ts`

**Lines:** 188, 200, 209
**Issues:**
- Line 188: `console.log(JSON.stringify(...))` - machine output, use `outputData()`
- Line 200: `console.log(table)` - human output table
- Line 209: `console.error(...)` - error message

**Subtasks:**

- [ ] PHASE5-010-012a: Add imports for `logger`, `outputData`
- [ ] PHASE5-010-012b: Line 188: Replace with `outputData()` (machine output to stdout)
- [ ] PHASE5-010-012c: Line 200: Replace with `logger.log(table)` (human-readable table to stderr)
- [ ] PHASE5-010-012d: Line 209: Replace with `logger.error()`

---

### PHASE5-010-013: Update `src/cli/commands/config.ts`

**Lines:** 188-211, 245
**Issues:**
- Lines 188-211: Hardcoded key-value formatting with `console.error()`
- Line 245: `console.log()` for get command output

**Before:**
```typescript
console.error(''); // Empty line
console.error('  language:            ' + config.language);
// ... more hardcoded formatting
```

**After:**
```typescript
import { logger, outputData } from '../../utils/output.ts';
// ...
logger.newline();
logger.keyValue('language', config.language, 18);
logger.keyValue('workspace', config.workspace || '(not set)', 18);
logger.section('Preferences');
// ...
```

**Subtasks:**

- [ ] PHASE5-010-013a: Add imports for `logger`, `outputData`
- [ ] PHASE5-010-013b: Replace empty line `console.error('')` with `logger.newline()`
- [ ] PHASE5-010-013c: Replace all key-value `console.error()` with `logger.keyValue()`
- [ ] PHASE5-010-013d: Replace section headers with `logger.section()`
- [ ] PHASE5-010-013e: Line 245: Use `outputData()` for `--json`, else `logger.log()` for human output
- [ ] PHASE5-010-013f: Update any `logInfo()` calls to `logger.info()`

---

### PHASE5-010-014: Update `src/cli/commands/teach.ts`

**Lines:** 161, 174-182
**Issues:**
- Line 161: `console.error()` for validation errors
- Lines 174-182: `console.log()` for human-readable teaching info

**Subtasks:**

- [ ] PHASE5-010-014a: Add import for `logger`
- [ ] PHASE5-010-014b: Line 161: Replace with `logger.log()` for validation error display
- [ ] PHASE5-010-014c: Lines 174-182: Replace all `console.log()` with `logger.log()`

---

### PHASE5-010-015: Update `src/cli/commands/hint.ts`

**Lines:** 68-70, 91, 109, 122, 130, 136, 139, 205, 225-229, 235, 263
**Issues:**
- Multiple `console.log()` calls for hint display (human output)
- Line 235: `console.warn()` for error note
- Hardcoded separator formatting `'─'.repeat(50)`
- Existing `logError`, `logInfo` imports need updating

**Subtasks:**

- [ ] PHASE5-010-015a: Update imports to use `logger` instead of `logError`, `logInfo`
- [ ] PHASE5-010-015b: Lines 68-70 (`displayHint`): Replace with `logger.log()` and `logger.separator()`
- [ ] PHASE5-010-015c: Line 91: Replace with `logger.log()`
- [ ] PHASE5-010-015d: Lines 109, 122, 130: Replace with `logger.log()`
- [ ] PHASE5-010-015e: Lines 136, 139: Replace with `logger.log()`
- [ ] PHASE5-010-015f: Line 205: Replace with `logger.log()`
- [ ] PHASE5-010-015g: Lines 225-229: Replace hardcoded separators with `logger.separator()`, replace `console.log()` with `logger.log()`
- [ ] PHASE5-010-015h: Line 235: Replace `console.warn()` with `logger.warn()`
- [ ] PHASE5-010-015i: Line 263: Replace with `logger.newline()`
- [ ] PHASE5-010-015j: Replace existing `logInfo()` calls with `logger.info()`

---

### PHASE5-010-016: Update `src/core/ai/triggers.ts`

**Lines:** 59, 66, 74
**Issue:** Direct `console.warn()` calls for debugging/validation warnings

**Subtasks:**

- [ ] PHASE5-010-016a: Add import for `logger`
- [ ] PHASE5-010-016b: Replace all `console.warn()` with `logger.warn()` (these are runtime warnings)

---

### PHASE5-010-017: Update `src/cli/commands/progress.ts`

**Lines:** 355, 369, 373, 382
**Issues:**
- Line 355: `console.error()` for workspace error
- Line 369: `console.log(JSON.stringify(...))` - machine output
- Line 373: `console.log(table)` - human output
- Line 382: `console.error()` for error message

**Subtasks:**

- [ ] PHASE5-010-017a: Add imports for `logger`, `outputData`
- [ ] PHASE5-010-017b: Line 355: Replace with `logger.error()` with actionable message
- [ ] PHASE5-010-017c: Line 369: Replace with `outputData()`
- [ ] PHASE5-010-017d: Line 373: Replace with `logger.log()` (human table output)
- [ ] PHASE5-010-017e: Line 382: Replace with `logger.error()`

---

### PHASE5-010-018: Update `src/cli/commands/init.ts`

**Lines:** 99-103
**Issue:** `console.error()` for directory structure display (human output)

**Subtasks:**

- [ ] PHASE5-010-018a: Add import for `logger`
- [ ] PHASE5-010-018b: Replace all `console.error()` with `logger.log()` for directory structure

---

### PHASE5-010-019: Update `src/cli/commands/help.ts`

**Lines:** 52
**Issue:** `console.error()` for help text display (human output)

**Subtasks:**

- [ ] PHASE5-010-019a: Add import for `logger`
- [ ] PHASE5-010-019b: Replace `console.error()` with `logger.log()`

---

### PHASE5-010-020: Update `src/cli/commands/challenge.ts`

**Lines:** 228-273, 282
**Issues:**
- Lines 228-273: Multiple `console.error()` for problem display formatting
- Line 282: `console.warn()` for teaching guidance error

**Subtasks:**

- [ ] PHASE5-010-020a: Add import for `logger`
- [ ] PHASE5-010-020b: Lines 228-230: Replace empty lines and summary with `logger.newline()` and `logger.log()`
- [ ] PHASE5-010-020c: Lines 254-273: Replace console.error with `logger.box()` or `logger.log()` + `logger.separator()` for teaching guide sections
- [ ] PHASE5-010-020d: Line 282: Replace `console.warn()` with `logger.warn()`

---

### PHASE5-010-021: Update `src/cli/commands/complete.ts`

**Lines:** 186-188
**Issue:** `console.error()` for problem summary display

**Subtasks:**

- [ ] PHASE5-010-021a: Add import for `logger`
- [ ] PHASE5-010-021b: Replace `console.error('')` with `logger.newline()`
- [ ] PHASE5-010-021c: Replace `console.error(formatProblemSummary(...))` with `logger.log()`

---

### PHASE5-010-022: Update `src/cli/main.ts`

**Lines:** 84, 93
**Issues:**
- Line 84: `console.error()` for help display
- Line 93: `console.log()` for version display

**Subtasks:**

- [ ] PHASE5-010-022a: Add imports for `logger`, `outputData`
- [ ] PHASE5-010-022b: Line 84: Replace with `logger.log()` (help is human output)
- [ ] PHASE5-010-022c: Line 93: Replace with `outputData()` (version is machine-parseable)

---

### PHASE5-010-023: Update `src/cli/exit-codes.ts`

**Lines:** 74
**Issue:** `console.error()` for exit error message

**Subtasks:**

- [ ] PHASE5-010-023a: Add import for `logger`
- [ ] PHASE5-010-023b: Replace `console.error()` with `logger.error()`

---

### PHASE5-010-024: Update `src/core/problem/manager.ts`

**Lines:** 505
**Issue:** `console.error()` for problem deletion warning

**Subtasks:**

- [ ] PHASE5-010-024a: Add import for `logger`
- [ ] PHASE5-010-024b: Replace `console.error()` with `logger.warn()`

---

### PHASE5-010-025: Update `src/core/workspace/watcher.ts`

**Lines:** 220, 389, 393
**Issue:** `console.error()` for file watcher errors

**Subtasks:**

- [ ] PHASE5-010-025a: Add import for `logger`
- [ ] PHASE5-010-025b: Replace all `console.error()` with `logger.error()`

---

### PHASE5-010-026: Update `src/core/ai/engine.ts`

**Lines:** 440
**Issue:** `console.warn()` for teaching engine warning

**Subtasks:**

- [ ] PHASE5-010-026a: Add import for `logger`
- [ ] PHASE5-010-026b: Replace `console.warn()` with `logger.warn()`

---

### PHASE5-010-027: Update Remaining Files Using log*() Functions

**Priority:** Medium

Search for and update any files still using the deprecated standalone `log*()` functions.

**Files to check:**
- Any file importing `logError`, `logWarning`, `logInfo`, `logDebug`, `logSuccess`, `logProgress`

**Subtasks:**

- [ ] PHASE5-010-027a: Search for all imports of standalone `log*()` functions
- [ ] PHASE5-010-027b: Update each file to import `logger` instead
- [ ] PHASE5-010-027c: Replace all `log*()` calls with `logger.*()` calls

---

## Validation Tasks

### PHASE5-010-030: Verify No Direct Console Usage Remains

**Priority:** High

**Subtasks:**

- [ ] PHASE5-010-030a: Run `grep -r "console\." src/` to verify no direct console calls remain (except in output.ts internally)
- [ ] PHASE5-010-030b: Run `grep -rE "^import.*log(Error|Warning|Info|Debug|Success|Progress)" src/` to find deprecated function usage
- [ ] PHASE5-010-030c: Verify all files compile with `deno check`
- [ ] PHASE5-010-030d: Run full test suite `deno task test`

---

### PHASE5-010-031: Verify Output Streams

**Priority:** High

Verify that output goes to correct streams.

**Subtasks:**

- [ ] PHASE5-010-031a: Test `at list --json 2>/dev/null | jq .` works (JSON to stdout)
- [ ] PHASE5-010-031b: Test `at list 2>&1 >/dev/null` shows human output only (stderr)
- [ ] PHASE5-010-031c: Test `at config show --json 2>/dev/null` works (JSON to stdout)
- [ ] PHASE5-010-031d: Test `at --version 2>/dev/null` outputs version to stdout

---

### PHASE5-010-032: Verify Verbosity Modes

**Priority:** Medium

**Subtasks:**

- [ ] PHASE5-010-032a: Test `--quiet` flag suppresses `logger.info()` and `logger.progress()` messages
- [ ] PHASE5-010-032b: Test `--verbose` flag enables `logger.debug()` output
- [ ] PHASE5-010-032c: Verify `logger.error()` and `logger.warn()` are always shown regardless of verbosity

---

## Summary Checklist

### New Code (Blocking)

- [ ] PHASE5-010-001: Create Logger class with all methods
- [ ] PHASE5-010-002: Deprecate standalone log*() functions
- [ ] PHASE5-010-003: Update exit functions to use logger

### File Migrations (17 files)

| Task | File | Console Calls | Status |
|------|------|---------------|--------|
| PHASE5-010-010 | `src/main.ts` | 1 | ⬜ |
| PHASE5-010-011 | `src/cli/env.ts` | 3 | ⬜ |
| PHASE5-010-012 | `src/cli/commands/list.ts` | 3 | ⬜ |
| PHASE5-010-013 | `src/cli/commands/config.ts` | 14+ | ⬜ |
| PHASE5-010-014 | `src/cli/commands/teach.ts` | 6 | ⬜ |
| PHASE5-010-015 | `src/cli/commands/hint.ts` | 15+ | ⬜ |
| PHASE5-010-016 | `src/core/ai/triggers.ts` | 3 | ⬜ |
| PHASE5-010-017 | `src/cli/commands/progress.ts` | 4 | ⬜ |
| PHASE5-010-018 | `src/cli/commands/init.ts` | 5 | ⬜ |
| PHASE5-010-019 | `src/cli/commands/help.ts` | 1 | ⬜ |
| PHASE5-010-020 | `src/cli/commands/challenge.ts` | 12 | ⬜ |
| PHASE5-010-021 | `src/cli/commands/complete.ts` | 3 | ⬜ |
| PHASE5-010-022 | `src/cli/main.ts` | 2 | ⬜ |
| PHASE5-010-023 | `src/cli/exit-codes.ts` | 1 | ⬜ |
| PHASE5-010-024 | `src/core/problem/manager.ts` | 1 | ⬜ |
| PHASE5-010-025 | `src/core/workspace/watcher.ts` | 3 | ⬜ |
| PHASE5-010-026 | `src/core/ai/engine.ts` | 1 | ⬜ |
| PHASE5-010-027 | Files using log*() functions | TBD | ⬜ |

**Total Changes:** ~78 console calls + all log*() function calls

### Validation

- [ ] PHASE5-010-030: Verify no direct console usage or deprecated functions
- [ ] PHASE5-010-031: Verify output streams
- [ ] PHASE5-010-032: Verify verbosity modes

---

## Implementation Order

1. **Phase A - Foundation (blocking)**
   - PHASE5-010-001: Create Logger class with all methods
   - PHASE5-010-002: Deprecate standalone functions (delegate to logger)
   - PHASE5-010-003: Update exit functions

2. **Phase B - Core CLI files**
   - PHASE5-010-010: main.ts
   - PHASE5-010-022: cli/main.ts
   - PHASE5-010-023: exit-codes.ts
   - PHASE5-010-019: help.ts

3. **Phase C - Command files (high impact)**
   - PHASE5-010-013: config.ts (most calls, uses new keyValue/section methods)
   - PHASE5-010-015: hint.ts (complex formatting, uses separator)
   - PHASE5-010-020: challenge.ts (uses box for teaching guides)
   - PHASE5-010-012: list.ts
   - PHASE5-010-017: progress.ts

4. **Phase D - Remaining command files**
   - PHASE5-010-014: teach.ts
   - PHASE5-010-018: init.ts
   - PHASE5-010-021: complete.ts

5. **Phase E - Core modules**
   - PHASE5-010-011: cli/env.ts
   - PHASE5-010-016: ai/triggers.ts
   - PHASE5-010-024: problem/manager.ts
   - PHASE5-010-025: workspace/watcher.ts
   - PHASE5-010-026: ai/engine.ts

6. **Phase F - Cleanup deprecated usage**
   - PHASE5-010-027: Update any remaining log*() function usage

7. **Phase G - Validation**
   - PHASE5-010-030: Verify no console or deprecated usage
   - PHASE5-010-031: Verify output streams
   - PHASE5-010-032: Verify verbosity modes

---

## API Reference

### Logger Methods Summary

| Method | Prefix | Color | Verbosity | Stream |
|--------|--------|-------|-----------|--------|
| `logger.success(msg)` | ✅ | green | always | stderr |
| `logger.error(msg, details?)` | ❌ | red | always | stderr |
| `logger.errorObject(error)` | ❌ | red | always (+stack in verbose) | stderr |
| `logger.warn(msg)` | ⚠️ | yellow | always | stderr |
| `logger.info(msg)` | ℹ️ | cyan | normal, verbose | stderr |
| `logger.debug(msg)` | 🐛 | dim | verbose only | stderr |
| `logger.progress(msg)` | 🔄 | blue | normal, verbose | stderr |
| `logger.log(msg)` | (none) | (none) | always | stderr |
| `logger.newline()` | - | - | always | stderr |
| `logger.keyValue(k,v,w)` | - | - | always | stderr |
| `logger.section(title)` | - | - | always | stderr |
| `logger.separator(w,c)` | - | - | always | stderr |
| `logger.box(t,c)` | - | - | always | stderr |
| `logger.table(d,cfg)` | - | - | always | stderr |
| `outputData(data)` | - | - | always | **stdout** |

---

## Notes

- The `Logger` class is the **single source of truth** for all human-readable output
- `outputData()` is the **only** function that writes to stdout
- Files in `src/utils/output.ts` use `console.*` internally - this is expected
- Documentation comments using `console.log` in examples are not actual calls
- Emoji prefixes are configurable via `AT_NO_EMOJI` environment variable
- Colors are configurable via `NO_COLOR` environment variable
- The deprecated standalone functions remain for backward compatibility but should not be used in new code
