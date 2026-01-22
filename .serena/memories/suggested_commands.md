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
# Compile to binary (outputs to bin/algo-trainer)
deno task build

# Run the compiled binary
./bin/algo-trainer --help
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
algo-trainer --help

# Show version
algo-trainer --version

# Start a challenge
algo-trainer challenge easy

# Get a hint
algo-trainer hint

# Mark problem as completed
algo-trainer complete two-sum

# Configure settings
algo-trainer config set language python
algo-trainer config get language
algo-trainer config list

# Initialize workspace
algo-trainer init ~/my-practice
```
