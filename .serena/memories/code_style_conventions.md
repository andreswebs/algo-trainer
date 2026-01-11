# Code Style Conventions

## TypeScript/Deno Style

### Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line width**: 100 characters max
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes for strings
- **Trailing commas**: Use trailing commas

### Imports

- Use Deno's JSR imports for standard library
- Relative imports for project files
- Always include `.ts` extension in relative imports

```typescript
// Standard library imports
import { parseArgs } from '@std/cli/parse-args';
import { join } from '@std/path';

// Project imports (always include .ts extension)
import { ConfigManager } from '../config/manager.ts';
import type { Config } from '../types/global.ts';
```

### Type Annotations

- Use explicit return types on all public functions
- Use `type` imports when only importing types
- Prefer interfaces over type aliases for object shapes
- Use discriminated unions for complex state

```typescript
// Use type import when only importing types
import type { Config, SupportedLanguage } from '../types/global.ts';

// Explicit return types
export function getConfig(): Config {
  // ...
}

// Async functions
export async function loadConfig(): Promise<Config> {
  // ...
}
```

### Error Handling

- Use custom error classes from `src/utils/errors.ts`
- Always include error context using `createErrorContext()`
- Use `AlgoTrainerError` subclasses for typed errors

```typescript
import { ConfigError, createErrorContext } from '../utils/errors.ts';

throw new ConfigError(
  'Failed to load configuration',
  createErrorContext('loadConfig', { path: configPath }),
);
```

### Output Streams (12-Factor Compliance)

- **stderr**: All human-readable messages (success, errors, warnings, info, progress)
- **stdout**: Only machine-readable data for piping/consumption

```typescript
import { logInfo, logError, outputData } from '../utils/output.ts';

// Human messages go to stderr
logInfo('Processing file...');
logError('Failed to process', error.message);

// Machine-readable output goes to stdout
outputData({ success: true, result: data });
```

### Documentation

- Use TSDoc comments for all public APIs
- Only add inline comments when explaining "why" (not "what")
- Module-level documentation at the top of files

```typescript
/**
 * Configuration manager
 *
 * Handles reading, writing, and validating application configuration
 * following XDG Base Directory Specification.
 *
 * @module config/manager
 */
```

### Naming Conventions

- **Files**: `kebab-case.ts` for regular files, `mod.ts` for module exports
- **Classes**: `PascalCase`
- **Functions/methods**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Types/Interfaces**: `PascalCase`
- **Type aliases**: `PascalCase`
