# Development Guidelines

## Getting Started

### Prerequisites

- Deno 2.x installed (`deno --version`)

### Development Workflow

```sh
# Run in development mode with watch
deno task dev

# Run tests
deno task test

# Run tests with watch
deno task test:watch

# Check types
deno task check

# Format code
deno task fmt

# Lint code
deno task lint

# Build binary
deno task build
```

## Testing

### Test Location

- Test files go in the `test/` directory
- Test files use `*.test.ts` naming convention

### Running Tests

```sh
# Run all tests
deno task test

# Run specific test file
deno test --allow-write --allow-read --allow-env test/config.test.ts

# Run with coverage
deno test --coverage --allow-write --allow-read --allow-env
```

### Test Structure

```typescript
import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

describe('ConfigManager', () => {
  it('should load default config when no file exists', async () => {
    // Arrange
    // ...

    // Act
    const config = await manager.load();

    // Assert
    assertEquals(config.language, 'typescript');
  });
});
```

## CLI Development

### Adding a New Command

1. Create command file in `src/cli/commands/`:

```typescript
// src/cli/commands/newcommand.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';

export async function newCommand(args: Args): Promise<CommandResult> {
  // Implementation
  return { success: true, exitCode: 0 };
}
```

2. Register in `src/cli/commands/mod.ts`:

```typescript
import { newCommand } from './newcommand.ts';

const commands: Record<string, CommandEntry> = {
  // ... existing commands
  new: { handler: newCommand, description: 'Description of new command' },
};
```

### Global Flags

Global flags are parsed in `src/cli/main.ts`:

- `--help, -h`: Show help
- `--version, -v`: Show version
- `--verbose`: Enable verbose output
- `--quiet`: Suppress non-essential output
- `--no-color`: Disable colored output
- `--no-emoji`: Disable emoji in output
- `--config, -c`: Specify custom config file

## Configuration System

### XDG Paths

The application follows XDG Base Directory Specification:

- **Config**: `$XDG_CONFIG_HOME/algo-trainer/` (default: `~/.config/algo-trainer/`)
- **Cache**: `$XDG_CACHE_HOME/algo-trainer/` (default: `~/.cache/algo-trainer/`)
- **Data**: `$XDG_DATA_HOME/algo-trainer/` (default: `~/.local/share/algo-trainer/`)

### Config Manager

Use `ConfigManager` for all configuration operations:

```typescript
import { configManager, initializeConfig } from '../config/manager.ts';

// Initialize (loads or creates default config)
await initializeConfig();

// Get current config
const config = configManager.getConfig();

// Update config
await configManager.updateConfig({ language: 'python' });
```

## Error Handling

### Custom Error Classes

Available error classes in `src/utils/errors.ts`:

- `ConfigError` - Configuration-related errors
- `FileSystemError` - File system operation errors
- `ProblemError` - Problem management errors
- `WorkspaceError` - Workspace-related errors
- `ValidationError` - Input validation errors
- `CommandError` - CLI command errors
- `NetworkError` - Network/HTTP errors
- `TemplateError` - Template generation errors

### Usage Pattern

```typescript
import { ConfigError, createErrorContext } from '../utils/errors.ts';

try {
  // operation
} catch (error) {
  throw new ConfigError(
    'Descriptive message',
    createErrorContext('operationName', {
      relevantData: value,
      originalError: String(error),
    }),
  );
}
```
