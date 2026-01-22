# Tech Stack

## Runtime & Language

- **Runtime**: Deno 2.x
- **Language**: TypeScript (strict mode)
- **Package Management**: Deno's built-in JSR imports (no node_modules)

## Dependencies

All dependencies are from the Deno standard library (`@std`):

```json
{
  "@std/assert": "jsr:@std/assert@1",
  "@std/testing": "jsr:@std/testing@1",
  "@std/cli": "jsr:@std/cli@1",
  "@std/path": "jsr:@std/path@1",
  "@std/fs": "jsr:@std/fs@1",
  "@std/yaml": "jsr:@std/yaml@1",
  "@std/json": "jsr:@std/json@1"
}
```

## TypeScript Configuration

Strict mode with these compiler options:

- `strict: true`
- `noImplicitAny: true`
- `noImplicitReturns: true`
- `noImplicitThis: true`
- `strictNullChecks: true`
- `exactOptionalPropertyTypes: true`

## Deno Tasks

| Task         | Command                                                    | Description                 |
| ------------ | ---------------------------------------------------------- | --------------------------- |
| `dev`        | `deno run --allow-all --watch src/main.ts`                 | Development mode with watch |
| `build`      | `deno compile --allow-all --output=bin/algo-trainer src/main.ts`     | Compile to binary           |
| `test`       | `deno test --allow-write --allow-read --allow-env`         | Run tests                   |
| `test:watch` | `deno test --watch --allow-write --allow-read --allow-env` | Run tests with watch        |
| `bench`      | `deno bench --allow-all`                                   | Run benchmarks              |
| `lint`       | `deno lint`                                                | Lint code                   |
| `lint:fix`   | `deno lint --fix`                                          | Fix lint issues             |
| `fmt`        | `deno fmt`                                                 | Format code                 |
| `check`      | `deno check src/**/*.ts`                                   | Type check                  |

## Formatting Rules

- Tabs: No (uses spaces)
- Indent width: 2 spaces
- Line width: 100 characters
- Semicolons: Yes
- Single quotes: Yes
- Prose wrap: Preserve
