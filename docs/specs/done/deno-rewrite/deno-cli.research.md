# Deno CLI Application Development Guide for AI Agents

## Native CLI Argument Parsing

Use `@std/cli/parse-args` for argument parsing with native support for flags, options, and type conversions:

```typescript
import { parseArgs } from 'jsr:@std/cli/parse-args';

const args = parseArgs(Deno.args, {
  alias: { help: 'h', version: 'v', output: 'o' },
  boolean: ['help', 'version', 'verbose'],
  string: ['output', 'input'],
  default: { output: 'stdout', verbose: false },
  collect: ['tag'],
  negatable: ['verbose'],
});

// Access parsed arguments
const inputFile = args._[0]; // Positional arguments
const outputFile = args.output; // Named options
const isVerbose = args.verbose; // Boolean flags
const tags = args.tag; // Collected arrays
```

### Interactive CLI Elements

```typescript
import { promptSecret } from 'jsr:@std/cli/prompt-secret';
import { Spinner } from '@std/cli/unstable-spinner';

// Password input
const apiToken = await promptSecret('Enter API token: ', { mask: '*' });

// Progress indicators
const spinner = new Spinner({ message: 'Processing...', color: 'cyan' });
spinner.start();
await longRunningOperation();
spinner.stop();
```

## File System Operations

### Native Deno APIs

```typescript
// Asynchronous file operations (preferred)
const content = await Deno.readTextFile('config.json');
const binaryData = await Deno.readFile('image.png');

await Deno.writeTextFile('output.txt', 'content');
await Deno.writeTextFile('log.txt', 'entry\n', { append: true });

// File permissions during creation
await Deno.writeTextFile('script.sh', '#!/bin/bash', { mode: 0o755 });
```

### Standard Library File Operations

```typescript
import { copy, ensureDir, expandGlob, walk } from '@std/fs';

// Directory creation with parents
await ensureDir('./dist/assets/images');

// File copying
await copy('src/index.ts', 'dist/index.ts', { overwrite: true });

// Directory traversal
for await (
  const entry of walk('./src', {
    includeDirs: false,
    exts: ['.ts', '.tsx'],
  })
) {
  console.log('Processing:', entry.path);
}

// Glob pattern matching
for await (const entry of expandGlob('src/**/*.ts')) {
  const relativePath = entry.path.substring(Deno.cwd().length + 1);
  console.log(`Found: ${relativePath}`);
}
```

### Cross-Platform Path Handling

```typescript
import { basename, dirname, extname, join, resolve } from '@std/path';

const configPath = join('config', 'app.json');
const dir = dirname(configPath); // "config"
const file = basename(configPath); // "app.json"
const ext = extname(configPath); // ".json"
const absolute = resolve('.', configPath); // Full path
```

## Process Management and Subprocess Execution

### Basic Command Execution

```typescript
const command = new Deno.Command('echo', {
  args: ['Hello from subprocess'],
});

const { code, stdout, stderr } = await command.output();

if (code === 0) {
  const output = new TextDecoder().decode(stdout);
  console.log('Result:', output);
}
```

### Interactive Subprocess Communication

```typescript
const command = new Deno.Command('deno', {
  args: ['fmt', '-'],
  stdin: 'piped',
  stdout: 'piped',
  stderr: 'piped',
});

const process = command.spawn();
const writer = process.stdin.getWriter();

await writer.write(new TextEncoder().encode("console.log('hello')"));
await process.stdin.close();

const stdout = await process.stdout.text();
const status = await process.status;
```

### JSON Output Processing

```typescript
const command = new Deno.Command('deno', {
  args: ['eval', "console.log(JSON.stringify({name: 'Deno'}))"],
  stdout: 'piped',
});

const process = command.spawn();
const data = await process.stdout.json();
console.log(`Runtime: ${data.name}`);
```

## Configuration Management

### deno.json Configuration

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "imports": {
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0"
  },
  "tasks": {
    "dev": "deno run --allow-read --allow-write --allow-env src/cli.ts",
    "build": "deno compile --allow-read --allow-write -o my-cli src/cli.ts",
    "test": "deno test --allow-read"
  },
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window"]
  }
}
```

### Environment Variables

```typescript
// Direct access
const apiKey = Deno.env.get('API_KEY');
const port = Deno.env.get('PORT') ?? '8000';

// Validated environment loading
function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// .env file loading
import '@std/dotenv/load';
```

### Typed Configuration

```typescript
interface CLIConfig {
  apiUrl: string;
  apiKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  outputFormat: 'json' | 'text' | 'csv';
}

function loadConfig(): CLIConfig {
  const apiUrl = Deno.env.get('API_URL');
  if (!apiUrl) throw new Error('API_URL required');

  const apiKey = Deno.env.get('API_KEY');
  if (!apiKey) throw new Error('API_KEY required');

  return {
    apiUrl,
    apiKey,
    logLevel: (Deno.env.get('LOG_LEVEL') ?? 'info') as CLIConfig['logLevel'],
    outputFormat: (Deno.env.get('OUTPUT_FORMAT') ??
      'text') as CLIConfig['outputFormat'],
  };
}
```

## Error Handling Patterns

### Native Error Types

```typescript
try {
  const data = await Deno.readTextFile('config.json');
  return JSON.parse(data);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.error('Configuration file not found');
    Deno.exit(1);
  } else if (error instanceof Deno.errors.PermissionDenied) {
    console.error('Permission denied reading file');
    Deno.exit(1);
  } else if (error instanceof SyntaxError) {
    console.error('Invalid JSON in configuration');
    Deno.exit(1);
  } else {
    throw error;
  }
}
```

### Exit Code Management

```typescript
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  FILE_NOT_FOUND: 3,
  PERMISSION_DENIED: 4,
  INTERRUPTED: 130,
} as const;

async function main(): Promise<void> {
  try {
    // Application logic
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error('Error: File not found');
      Deno.exit(EXIT_CODES.FILE_NOT_FOUND);
    }
    // Other error handling
  }
}
```

### Colored Output

```typescript
function logError(message: string): void {
  console.log('%cERROR: ' + message, 'color: red; font-weight: bold');
}

function logWarning(message: string): void {
  console.log('%cWARNING: ' + message, 'color: orange');
}

function logSuccess(message: string): void {
  console.log('%cSUCCESS: ' + message, 'color: green');
}
```

## Testing Patterns

### Basic Testing

```typescript
import { assertEquals, assertThrows } from 'jsr:@std/assert';

Deno.test('add function returns sum', () => {
  assertEquals(add(2, 3), 5);
});

Deno.test('handles errors correctly', () => {
  assertThrows(() => validateInput(''), Error, 'Invalid input');
});
```

### CLI Testing

```typescript
Deno.test({
  name: 'CLI processes file correctly',
  async fn() {
    const testFile = './test_input.txt';
    await Deno.writeTextFile(testFile, 'test content');

    try {
      const command = new Deno.Command('deno', {
        args: ['run', 'src/cli.ts', testFile],
        stdout: 'piped',
      });

      const process = command.spawn();
      const output = await process.stdout.text();
      assertEquals(output.includes('test content'), true);
    } finally {
      await Deno.remove(testFile);
    }
  },
});
```

### Permission Testing

```typescript
Deno.test({
  name: 'reads file with read permission',
  permissions: { read: ['./test_file.txt'] },
  async fn() {
    const content = await Deno.readTextFile('./test_file.txt');
    assertEquals(typeof content, 'string');
  },
});

Deno.test({
  name: 'fails without read permission',
  permissions: { read: [] },
  async fn() {
    try {
      await Deno.readTextFile('./test_file.txt');
      throw new Error('Expected permission error');
    } catch (error) {
      assertEquals(error instanceof Deno.errors.PermissionDenied, true);
    }
  },
});
```

## Project Structure

```txt
my-cli-app/
├── deno.json
├── deno.lock
├── main.ts
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── init.ts
│   │   ├── build.ts
│   │   └── serve.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validators.ts
│   ├── config/
│   │   ├── types.ts
│   │   └── loader.ts
│   └── types.ts
├── tests/
│   ├── commands_test.ts
│   └── integration_test.ts
└── README.md
```

### Command Organization

```typescript
// src/commands/init.ts
export interface InitOptions {
  projectName: string;
  typescript: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectDir = options.projectName;
  await Deno.mkdir(projectDir, { recursive: true });

  const config = {
    name: options.projectName,
    version: '0.1.0',
  };

  await Deno.writeTextFile(
    `${projectDir}/deno.json`,
    JSON.stringify(config, null, 2),
  );
}

// main.ts
import { parseArgs } from 'jsr:@std/cli/parse-args';
import { initCommand } from './src/commands/init.ts';

const args = parseArgs(Deno.args, {
  string: ['name'],
  boolean: ['help', 'typescript'],
  alias: { h: 'help' },
});

const command = args._[0] as string;

switch (command) {
  case 'init':
    await initCommand({
      projectName: args.name || 'new-project',
      typescript: args.typescript,
    });
    break;
  default:
    console.error(`Unknown command: ${command}`);
    Deno.exit(1);
}
```

## Dependency Management

### Adding Dependencies

```sh
deno add jsr:@std/cli
deno add jsr:@std/fs
deno add npm:chalk
```

### deno.json Import Map

```json
{
  "imports": {
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0",
    "chalk": "npm:chalk@5.3.0"
  }
}
```

## Security and Permissions

### Permission Declaration

```sh
# Fine-grained permissions
deno run --allow-read=./config,./data src/cli.ts

# Network restrictions
deno run --allow-net=api.example.com src/cli.ts

# Subprocess limitations
deno run --allow-run=curl,jq src/cli.ts

# Deny specific operations
deno run --allow-read --deny-read=./secrets src/cli.ts
```

### Task-Based Permissions

```json
{
  "tasks": {
    "process": "deno run --allow-read=./input --allow-write=./output src/processor.ts",
    "fetch": "deno run --allow-net=api.example.com src/fetcher.ts"
  }
}
```

## Compilation and Distribution

### Basic Compilation

```sh
# Single platform
deno compile --allow-read --allow-write -o my-cli src/cli.ts

# Cross-platform compilation
deno compile --allow-all -o my-cli-windows --target x86_64-pc-windows-msvc src/cli.ts
deno compile --allow-all -o my-cli-macos --target aarch64-apple-darwin src/cli.ts
deno compile --allow-all -o my-cli-linux --target x86_64-unknown-linux-gnu src/cli.ts
```

### Executable Scripts with Shebang

```typescript
#!/usr/bin/env -S deno run --allow-read --allow-write

import { parseArgs } from 'jsr:@std/cli/parse-args';

const args = parseArgs(Deno.args);
console.log('Arguments:', args);
```

## Performance Considerations

### Streaming Large Files

```typescript
async function processLargeFile(path: string): Promise<void> {
  const file = await Deno.open(path);

  try {
    const buffer = new Uint8Array(64 * 1024); // 64KB chunks
    let bytesRead = 0;

    while ((bytesRead = await file.read(buffer)) !== null) {
      const chunk = buffer.slice(0, bytesRead);
      processChunk(chunk);
    }
  } finally {
    file.close();
  }
}
```

### Module Optimization

```typescript
// Top-level imports are cached more effectively
import { parseArgs } from 'jsr:@std/cli/parse-args';

// Lazy imports for rarely used modules
async function readLargeFile() {
  const { readFile } = await import('jsr:@std/fs');
  return readFile('large_file.bin');
}
```

## Cross-Platform Development

### Platform Detection

```typescript
if (Deno.build.os === 'windows') {
  console.log('Windows-specific logic');
} else if (Deno.build.os === 'darwin') {
  console.log('macOS-specific logic');
} else {
  console.log('Linux-specific logic');
}
```

### Line Ending Handling

```typescript
// Automatic handling
await Deno.writeTextFile('output.txt', 'Line 1\nLine 2\n');

// Explicit control
const content = 'Line 1\nLine 2\n';
const normalized = Deno.build.os === 'windows' ? content.replace(/\n/g, '\r\n') : content;
```

## Essential Patterns Summary

1. **Use native Deno APIs** for core functionality rather than npm packages
2. **Declare minimal permissions** required for operation
3. **Prefer async operations** for file system and subprocess interactions
4. **Use @std libraries** for common tasks like path manipulation and CLI parsing
5. **Implement proper error handling** with Deno-specific error types
6. **Test with permission constraints** to ensure correct security boundaries
7. **Structure projects** with clear command separation and typed interfaces
8. **Leverage deno.json tasks** for consistent command execution with permissions
9. **Use deno compile** for distribution as standalone executables
10. **Follow cross-platform** best practices for path handling and line endings

## Key Standard Library Modules

- `@std/cli` - Argument parsing and CLI utilities
- `@std/fs` - File system operations and utilities
- `@std/path` - Cross-platform path manipulation
- `@std/assert` - Testing assertions
- `@std/dotenv` - Environment variable loading
- `@std/yaml` - YAML parsing and serialization
- `@std/toml` - TOML parsing and serialization
