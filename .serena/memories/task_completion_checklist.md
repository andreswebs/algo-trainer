# Task Completion Checklist

Use this checklist before considering any task complete.

## Code Quality

- [ ] Code follows TypeScript strict mode (no `any` types, explicit return types)
- [ ] All imports use `.ts` extension for relative imports
- [ ] Error handling uses custom error classes with `createErrorContext()`
- [ ] Output follows 12-factor principles (human messages to stderr, data to stdout)
- [ ] No redundant comments (only "why" comments, not "what")

## Testing

- [ ] Run `deno task check` - no type errors
- [ ] Run `deno task lint` - no lint errors
- [ ] Run `deno task test` - all tests pass
- [ ] New functionality has corresponding tests

## Formatting

- [ ] Run `deno task fmt` to format code
- [ ] Code uses 2-space indentation
- [ ] Code uses single quotes
- [ ] Lines are ≤100 characters

## Documentation

- [ ] Public APIs have TSDoc comments
- [ ] Complex logic has "why" comments
- [ ] Changes to CLI commands are reflected in help text

## Before Committing

- [ ] `deno task check` passes
- [ ] `deno task lint` passes
- [ ] `deno task test` passes
- [ ] No debug code or console.log statements left
- [ ] No secrets or sensitive data in code
