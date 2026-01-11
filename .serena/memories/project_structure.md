# Project Structure

## Directory Layout

```
algo-trainer/
├── src/                          # Source code
│   ├── main.ts                   # Application entry point
│   ├── version.ts                # Version constant
│   ├── cli/                      # CLI interface
│   │   ├── main.ts               # CLI entry point with arg parsing
│   │   ├── types.ts              # CLI-specific types
│   │   └── commands/             # Command implementations
│   │       ├── mod.ts            # Command registry and dispatcher
│   │       ├── challenge.ts      # Start a new challenge
│   │       ├── complete.ts       # Mark problem as completed
│   │       ├── config.ts         # Manage configuration
│   │       ├── hint.ts           # Get hints
│   │       └── init.ts           # Initialize workspace
│   ├── config/                   # Configuration management
│   │   ├── manager.ts            # XDG-compliant ConfigManager class
│   │   ├── paths.ts              # Path resolution utilities
│   │   └── types.ts              # Default config and validation types
│   ├── types/                    # Type definitions
│   │   ├── index.ts              # Re-exports all types
│   │   ├── global.ts             # Core application types
│   │   └── external.ts           # External API types
│   └── utils/                    # Shared utilities
│       ├── display.ts            # Colors, tables, progress bars
│       ├── errors.ts             # Custom error classes
│       ├── fs.ts                 # File system utilities
│       ├── http.ts               # HTTP client with rate limiting
│       ├── output.ts             # stdout/stderr separation
│       └── validation.ts         # Input validation
├── test/                         # Test files
│   └── config.test.ts            # Configuration tests
├── .specs/                       # Specifications and plans
│   ├── deno-rewrite/             # Rewrite planning docs
│   │   └── plan.md               # Main rewrite plan
│   ├── ai-teaching-system/       # AI teaching requirements
│   └── cli-improvements/         # CLI improvement plans
├── _.local-leetcode-trainer.legacy/  # Legacy Node.js codebase (reference only)
├── deno.jsonc                    # Deno configuration
├── deno.lock                     # Lock file
└── README.md                     # Project readme
```

## Key Files

### Entry Points

- `src/main.ts` - Application entry point, imports and runs `src/cli/main.ts`
- `src/cli/main.ts` - CLI entry point with argument parsing

### Configuration

- `deno.jsonc` - Deno configuration (tasks, imports, compiler options, formatting)
- `src/config/manager.ts` - ConfigManager class for XDG-compliant config handling

### Types

- `src/types/global.ts` - Core types: `Problem`, `Config`, `UserPreferences`, `SupportedLanguage`, etc.
- `src/types/external.ts` - External API types for LeetCode integration

## Future Directories (Planned)

```
src/
├── core/                         # Core business logic (Phase 2-4)
│   ├── problem/                  # Problem management
│   ├── workspace/                # Workspace management
│   ├── ai/                       # AI Teaching Engine
│   └── testing/                  # Test execution
└── data/                         # Static data and templates
    ├── problems/
    ├── templates/
    └── scripts/
```
