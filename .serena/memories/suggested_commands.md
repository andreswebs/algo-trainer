# Suggested Commands

## Development

```bash
# Start development mode with hot reload
deno task dev

# Type check the codebase
deno task check

# Run linter
deno task lint

# Format code
deno task fmt
```

## Testing

```bash
# Run all tests
deno task test

# Run tests with watch mode
deno task test:watch

# Run benchmarks
deno task bench
```

## Building

```bash
# Compile to binary (outputs to bin/at)
deno task build

# Run the compiled binary
./bin/at --help
```

## Direct Deno Commands

```bash
# Run main entry point
deno run --allow-all src/main.ts

# Run with specific permissions
deno run --allow-read --allow-write --allow-env src/main.ts

# Check formatting without applying
deno fmt --check

# Generate lock file
deno cache --lock=deno.lock --lock-write src/main.ts
```

## CLI Usage (after build)

```bash
# Show help
at --help

# Show version
at --version

# Start a challenge
at challenge easy

# Get a hint
at hint

# Mark problem as completed
at complete two-sum

# Configure settings
at config set language python
at config get language
at config list

# Initialize workspace
at init ~/my-practice
```
