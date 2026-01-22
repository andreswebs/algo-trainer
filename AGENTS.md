# AI Agent Instructions for algo-trainer

## Pre-Task Requirements

**MANDATORY:** Before any task, run ALL quality checks:

```sh
deno task check
deno task lint
deno task test
```

If any fail, fix errors BEFORE starting the task.

## Post-Task Requirements

After completing ANY modification:

```sh
deno task check
deno task lint
deno task test
```

If any fail, fix errors BEFORE considering task complete.

## Project Context

- **Project**: algo-trainer - CLI for algorithmic problem-solving practice
- **Language**: TypeScript (strict mode)
- **Runtime**: Deno 2.x
- **Architecture**: CLI application with XDG-compliant configuration
- **Entry Point**: src/main.ts → src/cli/main.ts

## File Operations

### Reading

- Use absolute paths only
- Check file existence before operations
- Main config: deno.jsonc

### Writing/Editing

- ALWAYS read file first before editing
- Preserve exact indentation (2 spaces)
- Use single quotes in TypeScript
- Include .ts extension in relative imports

## Type System

**MANDATORY TypeScript Requirements:**

- NO `any` types
- Explicit return types on all functions
- Use custom error classes from `src/utils/errors.ts`
- Import types with `import type` when possible

## Error Handling Pattern

```typescript
import { createErrorContext, CustomError } from '../utils/errors.ts';

try {
  // operation
} catch (error) {
  throw new CustomError(
    'Descriptive message',
    createErrorContext('operationName', {
      relevantData: value,
      originalError: String(error),
    }),
  );
}
```

Available error classes:

- ConfigError
- FileSystemError
- ProblemError
- WorkspaceError
- ValidationError
- CommandError
- NetworkError
- TemplateError

## Output Rules

**12-Factor CLI Principles:**

- Human messages → stderr (via logger.info, logger.error)
- Data output → stdout (via outputData)
- Use logger from `src/utils/output.ts`

## Development Commands

```sh
# Development mode with watch
deno task dev

# Type checking (MANDATORY before/after tasks)
deno task check

# Linting (MANDATORY before/after tasks)
deno task lint
deno task lint:fix

# Testing (MANDATORY before/after tasks)
deno task test
deno task test:watch

# Format code
deno task fmt

# Build binary
deno task build

# Generate problem data
deno task generate-problems
```

## Project Structure

```
src/
├── main.ts                 # Entry point
├── cli/
│   ├── main.ts            # CLI entry with arg parsing
│   ├── commands/          # Command implementations
│   │   └── mod.ts         # Command registry
│   └── types.ts           # CLI types
├── core/
│   ├── problem/           # Problem management
│   ├── workspace/         # Workspace management
│   └── ai/                # AI teaching engine
├── config/
│   ├── manager.ts         # ConfigManager class
│   └── paths.ts           # XDG path utilities
├── types/
│   ├── global.ts          # Core types
│   └── external.ts        # External API types
└── utils/
    ├── errors.ts          # Custom error classes
    ├── output.ts          # Logger implementation
    └── validation.ts      # Input validation

test/                      # Test files (*.test.ts)
```

## Adding New Features

### New Command

1. Create: `src/cli/commands/newcommand.ts`
2. Register in: `src/cli/commands/mod.ts`
3. Add tests: `test/newcommand.test.ts`

### Command Template

```typescript
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';

export async function newCommand(args: Args): Promise<CommandResult> {
  // Implementation
  return { success: true, exitCode: 0 };
}
```

## Configuration System

**XDG Paths:**

- Config: `$XDG_CONFIG_HOME/algo-trainer/` (default: `~/.config/algo-trainer/`)
- Cache: `$XDG_CACHE_HOME/algo-trainer/` (default: `~/.cache/algo-trainer/`)
- Data: `$XDG_DATA_HOME/algo-trainer/` (default: `~/.local/share/algo-trainer/`)

**Config Usage:**

```typescript
import { configManager, initializeConfig } from '../config/manager.ts';

await initializeConfig();
const config = configManager.getConfig();
await configManager.updateConfig({ language: 'python' });
```

## Testing Requirements

- Location: `test/` directory
- Naming: `*.test.ts`
- Framework: Deno built-in with `@std/testing`
- ALL new functionality MUST have tests

## Dependencies

All from Deno standard library:

- `@std/assert`
- `@std/testing`
- `@std/cli`
- `@std/path`
- `@std/fs`
- `@std/yaml`
- `@std/json`

## Available CLI Commands

- `challenge` - Start a new coding challenge
- `complete` - Mark problem as completed
- `hint` - Get hint for current problem
- `config` - Manage configuration
- `init` - Initialize workspace
- `list` - List available problems
- `progress` - View progress stats
- `teach` - Manage AI teaching scripts

## Formatting Rules

- Indentation: 2 spaces
- Quotes: Single
- Semicolons: Yes
- Line width: 100 chars max
- Run `deno task fmt` before commits

## Common Issues

### Import Errors

- Always use `.ts` extension for relative imports
- Use `import type` for type-only imports

### Type Errors

- No implicit `any`
- Explicit return types required
- Use strict null checks

### Test Failures

- Check test environment variables
- Ensure proper permissions in test command
- Mock file system operations when needed

## Critical Files

- Entry: `src/main.ts`
- CLI: `src/cli/main.ts`
- Commands: `src/cli/commands/mod.ts`
- Config: `src/config/manager.ts`
- Types: `src/types/global.ts`
- Errors: `src/utils/errors.ts`
- Deno Config: `deno.jsonc`

## Workflow Summary

1. Run checks: `deno task check && deno task lint && deno task test`
2. Make changes
3. Run checks again
4. Fix any issues
5. Format: `deno task fmt`
6. Final test run
7. Task complete only when all checks pass
